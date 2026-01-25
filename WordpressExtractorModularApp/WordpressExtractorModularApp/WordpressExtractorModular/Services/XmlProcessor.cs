using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Xml.Linq;
using System.Text.RegularExpressions;
using WordpressExtractor.Models;
using HtmlAgilityPack; // For HTML parsing

namespace WordpressExtractor.Services
{
    public class XmlProcessor
    {
        private readonly SQLiteDataService _dataService; // To interact with the database

        // Caching for terms to avoid repeated DB lookups during post processing
        private Dictionary<string, int> _categoryNicenameToTermId = new Dictionary<string, int>();
        private Dictionary<string, int> _tagNicenameToTermId = new Dictionary<string, int>();
        private Dictionary<string, int> _postNameIdMap = new Dictionary<string, int>(); // Cache post_name to post_id for internal link resolution

        public XmlProcessor(SQLiteDataService dataService)
        {
            _dataService = dataService;
        }

        public void ProcessWordPressXml(string xmlFilePath)
        {
            if (!File.Exists(xmlFilePath))
            {
                throw new FileNotFoundException($"The specified XML file was not found: {xmlFilePath}");
            }

            XDocument doc = XDocument.Load(xmlFilePath);
            XNamespace excerpt = "http://wordpress.org/export/1.2/excerpt/";
            XNamespace content = "http://purl.org/rss/1.0/modules/content/";
            XNamespace wfw = "http://wellformedweb.org/CommentAPI/";
            XNamespace dc = "http://purl.org/dc/elements/1.1/";
            XNamespace wp = "http://wordpress.org/export/1.2/";

            // Clean existing data before importing new
            _dataService.ClearAllData();

            // Process Site Information
            XElement? channelElement = doc.Root?.Element("channel");
            if (channelElement != null)
            {
                string siteTitle = channelElement.Element("title")?.Value ?? "Untitled Site";
                string siteDescription = channelElement.Element("description")?.Value ?? string.Empty;

                _dataService.SaveSiteInfo(new SiteInfo { Key = "title", Value = siteTitle });
                _dataService.SaveSiteInfo(new SiteInfo { Key = "description", Value = siteDescription });

                // Additional site info extraction (e.g., active plugins if available in XML)
                // This would be highly dependent on the WordPress export content and usually requires specific meta keys.
                // For now, a placeholder is used, similar to the Flask app.
                _dataService.SaveSiteInfo(new SiteInfo { Key = "active_plugins", Value = "Placeholder: Could not determine active plugins from this XML." });
            }

            // Process Authors
            var authors = doc.Descendants(wp + "author")
                             .Select(x => new Author
                             {
                                 AuthorId = int.Parse(x.Element(wp + "author_id")?.Value ?? "0"),
                                 Login = x.Element(wp + "author_login")?.Value ?? string.Empty,
                                 Email = x.Element(wp + "author_email")?.Value ?? string.Empty,
                                 DisplayName = x.Element(wp + "author_display_name")?.Value ?? string.Empty,
                                 FirstName = x.Element(wp + "author_first_name")?.Value ?? string.Empty,
                                 LastName = x.Element(wp + "author_last_name")?.Value ?? string.Empty,
                             }).ToList();
            _dataService.SaveAuthors(authors);

            // Process Categories
            var categories = doc.Descendants(wp + "category")
                                .Select(x => new Category
                                {
                                    TermId = int.Parse(x.Element(wp + "term_id")?.Value ?? "0"),
                                    Nicename = x.Element(wp + "category_nicename")?.Value ?? string.Empty,
                                    Parent = x.Element(wp + "category_parent")?.Value ?? string.Empty,
                                    Name = x.Element(wp + "cat_name")?.Value ?? string.Empty,
                                    Description = x.Element(wp + "category_description")?.Value ?? string.Empty,
                                }).ToList();
            _dataService.SaveCategories(categories);
            _categoryNicenameToTermId = categories.ToDictionary(c => c.Nicename, c => c.TermId);

            // Process Tags
            var tags = doc.Descendants(wp + "tag")
                         .Select(x =>
                         {
                             string? nicename = x.Element(wp + "tag_nicename")?.Value;
                             if (string.IsNullOrEmpty(nicename))
                             {
                                 nicename = x.Element(wp + "tag_slug")?.Value; // Fallback to tag_slug
                             }

                             return new Tag
                             {
                                 TermId = int.Parse(x.Element(wp + "term_id")?.Value ?? "0"),
                                 Nicename = nicename ?? string.Empty, // Ensure it's not null
                                 Name = x.Element(wp + "tag_name")?.Value ?? string.Empty,
                                 Description = x.Element(wp + "tag_description")?.Value ?? string.Empty,
                             };
                         }).ToList();
            _dataService.SaveTags(tags);
            _tagNicenameToTermId = tags.ToDictionary(t => t.Nicename, t => t.TermId);


            // First pass for posts/pages to build post_name to post_id map
            _postNameIdMap = new Dictionary<string, int>();
            foreach (var item in doc.Descendants("item"))
            {
                var postType = item.Element(wp + "post_type")?.Value;
                if (postType == "post" || postType == "page")
                {
                var postId = int.Parse(item.Element(wp + "post_id")?.Value ?? "0");
                    var postName = item.Element(wp + "post_name")?.Value;
                    if (!string.IsNullOrEmpty(postName))
                    {
                        _postNameIdMap[postName] = postId;
                    }
                }
            }


            // Process Items (Posts, Pages, Attachments)
            var items = doc.Descendants("item").ToList();
            foreach (var item in items)
            {
                var postType = item.Element(wp + "post_type")?.Value;
                var postId = int.Parse(item.Element(wp + "post_id")?.Value ?? "0"); // Always get post_id

                if (postType == "post" || postType == "page")
                {
                    string? title = item.Element("title")?.Value;
                    string? contentEncoded = item.Element(content + "encoded")?.Value;

                    if (string.IsNullOrEmpty(title))
                    {
                        if (!string.IsNullOrEmpty(contentEncoded))
                        {
                            // Try to extract title from H1 or H2 tags
                            Match match = Regex.Match(contentEncoded, "<h[12]>(.*?)</h[12]>", RegexOptions.IgnoreCase);
                            if (match.Success)
                            {
                                title = match.Groups[1].Value;
                            }
                        }
                        if (string.IsNullOrEmpty(title))
                        {
                            title = "Untitled Post";
                        }
                    }

                    var post = new Post
                    {
                        PostId = postId,
                        Title = title ?? string.Empty, // Use the extracted/default title
                        Link = item.Element("link")?.Value ?? string.Empty, // Extract Link
                        PostType = postType,
                        PostDate = ParseDateTime(item.Element(wp + "post_date")?.Value),
                        PostName = item.Element(wp + "post_name")?.Value ?? string.Empty,
                        ContentEncoded = contentEncoded ?? string.Empty, // Use the extracted content
                        Creator = item.Element(dc + "creator")?.Value ?? string.Empty,
                        Status = item.Element(wp + "status")?.Value ?? string.Empty,
                        // Other fields as needed
                    };

                    // Try to load cleaned HTML from files (similar to Python script)
                    string cleanedHtmlSource = GetCleanedHtmlFromFile(post.PostName, post.PostType);
                    if (!string.IsNullOrEmpty(cleanedHtmlSource))
                    {
                        post.CleanedHtmlSource = cleanedHtmlSource;
                    }

                    _dataService.SavePost(post);

                    // Process Post Categories
                    foreach (var categoryElement in item.Elements("category").Where(c => c.Attribute("domain")?.Value == "category"))
                    {
                        var nicename = categoryElement.Attribute("nicename")?.Value;
                        if (!string.IsNullOrEmpty(nicename) && _categoryNicenameToTermId.TryGetValue(nicename, out int termId))
                        {
                            _dataService.SavePostCategory(post.PostId, termId);
                        }
                    }

                    // Process Post Tags
                    foreach (var tagElement in item.Elements("category").Where(c => c.Attribute("domain")?.Value == "post_tag"))
                    {
                        var nicename = tagElement.Attribute("nicename")?.Value;
                        if (!string.IsNullOrEmpty(nicename) && _tagNicenameToTermId.TryGetValue(nicename, out int termId))
                        {
                            _dataService.SavePostTag(post.PostId, termId);
                        }
                    }

                    // Process Post Meta
                    foreach (var postmetaElement in item.Elements(wp + "postmeta"))
                    {
                        var metaKey = postmetaElement.Element(wp + "meta_key")?.Value;
                        var metaValue = postmetaElement.Element(wp + "meta_value")?.Value;
                        if (!string.IsNullOrEmpty(metaKey))
                        {
                            _dataService.SavePostMeta(new PostMeta { PostId = post.PostId, MetaKey = metaKey, MetaValue = metaValue ?? string.Empty });
                        }
                    }

                    // Process Comments
                    foreach (var commentElement in item.Elements(wp + "comment"))
                    {
                        var comment = new Comment
                        {
                            CommentId = int.Parse(commentElement.Element(wp + "comment_id")?.Value ?? "0"),
                            PostId = post.PostId,
                            Author = commentElement.Element(wp + "comment_author")?.Value ?? string.Empty,
                            AuthorEmail = commentElement.Element(wp + "comment_author_email")?.Value ?? string.Empty,
                            Date = ParseDateTime(commentElement.Element(wp + "comment_date")?.Value),
                            Content = commentElement.Element(wp + "comment_content")?.Value ?? string.Empty,
                            Approved = commentElement.Element(wp + "comment_approved")?.Value ?? string.Empty,
                            // Other comment fields as needed
                        };
                        _dataService.SaveComment(comment);
                    }

                    // Extract Internal Links from content_encoded
                    ExtractAndSaveInternalLinks(post.PostId, post.ContentEncoded);
                }
                else if (postType == "attachment")
                {
                    var attachment = new Attachment
                    {
                        PostId = postId,
                        Title = item.Element("title")?.Value ?? string.Empty,
                        Url = item.Element(wp + "attachment_url")?.Value ?? item.Element("guid")?.Value ?? string.Empty,
                        MimeType = item.Element(wp + "post_mime_type")?.Value ?? string.Empty,
                        PostName = item.Element(wp + "post_name")?.Value ?? string.Empty,
                        Guid = item.Element("guid")?.Value ?? string.Empty,
                        ParentId = int.Parse(item.Element(wp + "post_parent")?.Value ?? "0"),
                        Description = item.Element(excerpt + "encoded")?.Value ?? string.Empty,
                        Content = item.Element(content + "encoded")?.Value ?? string.Empty,
                    };
                    _dataService.SaveAttachment(attachment);
                }
            }
        }

        #pragma warning disable CS8603 // Possible null reference return.
        private DateTime? ParseDateTime(string? dateTimeString)
        {
            if (DateTime.TryParse(dateTimeString, out DateTime result))
            {
                return result;
            }
            return null;
        }
        #pragma warning restore CS8603 // Possible null reference return.

        private string GetCleanedHtmlFromFile(string postName, string postType)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string? cleanedContent = null;

            // Adjust paths relative to the executable for the existing cleaned HTML files
            string cleanedPostsDir = Path.Combine(baseDir, "..\\..\\..\\..\\all_blog_posts");
            string cleanedPagesDir = Path.Combine(baseDir, "..\\..\\..\\..\\all_pages");
            
            // Ensure directories exist before trying to read
            if (!Directory.Exists(cleanedPostsDir)) cleanedPostsDir = Path.Combine(baseDir, "all_blog_posts");
            if (!Directory.Exists(cleanedPagesDir)) cleanedPagesDir = Path.Combine(baseDir, "all_pages");


            string potentialFilename = $"{postName}.html";

            if (postType == "post")
            {
                string filePath = Path.Combine(cleanedPostsDir, potentialFilename);
                if (File.Exists(filePath))
                {
                    cleanedContent = File.ReadAllText(filePath);
                }
            }
            else if (postType == "page")
            {
                string filePath = Path.Combine(cleanedPagesDir, potentialFilename);
                if (File.Exists(filePath))
                {
                    cleanedContent = File.ReadAllText(filePath);
                }
            }
            return cleanedContent;
        }

        #pragma warning disable CS8600 // Converting null literal or possible null value to non-nullable type.
        #pragma warning disable CS8604 // Possible null reference argument for parameter 'value' in 'bool Dictionary<TKey, TValue>.ContainsKey(TKey value)'.
        private void ExtractAndSaveInternalLinks(int sourcePostId, string htmlContent)
        {
            if (string.IsNullOrWhiteSpace(htmlContent)) return;

            var htmlDoc = new HtmlAgilityPack.HtmlDocument();
            htmlDoc.LoadHtml(htmlContent);

            foreach (var link in htmlDoc.DocumentNode.SelectNodes("//a[@href]") ?? Enumerable.Empty<HtmlNode>())
            {
                string href = link.GetAttributeValue("href", string.Empty);
                string anchorText = link.InnerText.Trim();

                if (!string.IsNullOrEmpty(href))
                {
                    // Check if it's an internal link
                    // A simple check: if it contains the base blog URL or matches a known post_name slug
                    Uri uri;
                    if (Uri.TryCreate(href, UriKind.Absolute, out uri))
                    {
                        // Assuming base_site_url is known or can be extracted from XML for more robust check
                        // For now, let's just check against known post_names (slugs)
                        string? slug = uri.Segments.LastOrDefault();
                        string finalSlug = slug?.Replace(".html", string.Empty) ?? string.Empty; // Handle null slug
                        if (!string.IsNullOrEmpty(finalSlug) && _postNameIdMap.ContainsKey(finalSlug))
                        {
                            int targetPostId = _postNameIdMap[finalSlug];
                            _dataService.SaveInternalLink(new InternalLink
                            {
                                SourcePostId = sourcePostId,
                                TargetPostId = targetPostId,
                                AnchorText = anchorText
                            });
                        }
                    }
                    else // Handle relative URLs if any, but WordPress WXR usually has absolute
                    {
                        // Could also check if href matches a post_name directly
                        string potentialSlug = href.Replace("/", string.Empty).Replace(".html", string.Empty);
                        if (!string.IsNullOrEmpty(potentialSlug) && _postNameIdMap.ContainsKey(potentialSlug))
                        {
                            int targetPostId = _postNameIdMap[potentialSlug];
                            _dataService.SaveInternalLink(new InternalLink
                            {
                                SourcePostId = sourcePostId,
                                TargetPostId = targetPostId,
                                AnchorText = anchorText
                            });
                        }
                    }
                }
            }
        }
        #pragma warning restore CS8604 // Possible null reference argument for parameter 'value' in 'bool Dictionary<TKey, TValue>.ContainsKey(TKey value)'.
        #pragma warning restore CS8600 // Converting null literal or possible null value to non-nullable type.
    }
}
