using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.IO;
using WordpressExtractor.Models;

namespace WordpressExtractor.Services
{
    public class SQLiteDataService
    {
        private readonly string _databasePath;

        public SQLiteDataService(string databaseName)
        {
            // Assuming the database is in the parent directory of the C# project
            _databasePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..\\..\\..\\..\\", databaseName);
            _databasePath = Path.GetFullPath(_databasePath);
            
            // Ensure the database file exists or is created by attempting to open a connection.
            // Microsoft.Data.Sqlite will create the file if it doesn't exist.
            if (!File.Exists(_databasePath))
            {
                // Only initialize schema if the file was just created
                InitializeDatabaseSchema();
            }
            else
            {
                // If the file exists, ensure schema is up-to-date (e.g., in case of new tables/columns)
                InitializeDatabaseSchema(); // Re-run to ensure new tables/columns are added
            }
        }

        private SqliteConnection GetConnection()
        {
            return new SqliteConnection($"Data Source={_databasePath}");
        }

        private void InitializeDatabaseSchema()
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    var command = connection.CreateCommand();
                    command.Transaction = transaction;

                    command.CommandText = @"
                        CREATE TABLE IF NOT EXISTS authors (
                            author_id INTEGER PRIMARY KEY,
                            login TEXT,
                            email TEXT,
                            display_name TEXT,
                            first_name TEXT,
                            last_name TEXT
                        );
                        CREATE TABLE IF NOT EXISTS categories (
                            term_id INTEGER PRIMARY KEY,
                            nicename TEXT,
                            parent TEXT,
                            name TEXT,
                            description TEXT
                        );
                        CREATE TABLE IF NOT EXISTS tags (
                            term_id INTEGER PRIMARY KEY,
                            nicename TEXT,
                            name TEXT,
                            description TEXT
                        );
                        CREATE TABLE IF NOT EXISTS posts (
                            post_id INTEGER PRIMARY KEY,
                            title TEXT,
                            link TEXT,
                            pub_date TEXT,
                            creator TEXT,
                            guid TEXT,
                            description TEXT,
                            content_encoded TEXT,
                            excerpt_encoded TEXT,
                            post_date TEXT,
                            post_date_gmt TEXT,
                            comment_status TEXT,
                            ping_status TEXT,
                            post_name TEXT,
                            status TEXT,
                            post_parent INTEGER,
                            menu_order INTEGER,
                            post_type TEXT,
                            post_mime_type TEXT,
                            comment_count INTEGER,
                            cleaned_html_source TEXT
                        );
                        
                        -- Add LINK column to posts table if it doesn't exist
                        CREATE TABLE IF NOT EXISTS temp_posts (
                            post_id INTEGER PRIMARY KEY,
                            title TEXT,
                            link TEXT, -- New column
                            pub_date TEXT,
                            creator TEXT,
                            guid TEXT,
                            description TEXT,
                            content_encoded TEXT,
                            excerpt_encoded TEXT,
                            post_date TEXT,
                            post_date_gmt TEXT,
                            comment_status TEXT,
                            ping_status TEXT,
                            post_name TEXT,
                            status TEXT,
                            post_parent INTEGER,
                            menu_order INTEGER,
                            post_type TEXT,
                            post_mime_type TEXT,
                            comment_count INTEGER,
                            cleaned_html_source TEXT
                        );
                        INSERT OR IGNORE INTO temp_posts SELECT post_id, title, NULL as link, pub_date, creator, guid, description, content_encoded, excerpt_encoded, post_date, post_date_gmt, comment_status, ping_status, post_name, status, post_parent, menu_order, post_type, post_mime_type, comment_count, cleaned_html_source FROM posts;
                        DROP TABLE IF EXISTS posts;
                        ALTER TABLE temp_posts RENAME TO posts;


                        CREATE TABLE IF NOT EXISTS post_categories (
                            post_id INTEGER,
                            category_term_id INTEGER,
                            FOREIGN KEY (post_id) REFERENCES posts(post_id),
                            FOREIGN KEY (category_term_id) REFERENCES categories(term_id),
                            PRIMARY KEY (post_id, category_term_id)
                        );
                        CREATE TABLE IF NOT EXISTS post_tags (
                            post_id INTEGER,
                            tag_term_id INTEGER,
                            FOREIGN KEY (post_id) REFERENCES posts(post_id),
                            FOREIGN KEY (tag_term_id) REFERENCES tags(term_id),
                            PRIMARY KEY (post_id, tag_term_id)
                        );
                        CREATE TABLE IF NOT EXISTS post_meta (
                            meta_id INTEGER PRIMARY KEY AUTOINCREMENT,
                            post_id INTEGER,
                            meta_key TEXT,
                            meta_value TEXT,
                            FOREIGN KEY (post_id) REFERENCES posts(post_id)
                        );
                        CREATE TABLE IF NOT EXISTS comments (
                            comment_id INTEGER PRIMARY KEY,
                            post_id INTEGER,
                            comment_author TEXT,
                            comment_author_email TEXT,
                            comment_author_url TEXT,
                            comment_author_ip TEXT,
                            comment_date TEXT,
                            comment_date_gmt TEXT,
                            comment_content TEXT,
                            comment_approved TEXT,
                            comment_type TEXT,
                            comment_parent INTEGER,
                            comment_user_id INTEGER,
                            FOREIGN KEY (post_id) REFERENCES posts(post_id)
                        );
                        CREATE TABLE IF NOT EXISTS attachments (
                            post_id INTEGER PRIMARY KEY, -- Using post_id from WXR as PK for attachments
                            title TEXT,
                            url TEXT,
                            mime_type TEXT,
                            post_name TEXT,
                            guid TEXT,
                            parent_id INTEGER,
                            description TEXT,
                            content TEXT
                        );
                        CREATE TABLE IF NOT EXISTS internal_links (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            source_post_id INTEGER,
                            target_post_id INTEGER,
                            anchor_text TEXT,
                            FOREIGN KEY (source_post_id) REFERENCES posts(post_id),
                            FOREIGN KEY (target_post_id) REFERENCES posts(post_id)
                        );
                        CREATE TABLE IF NOT EXISTS site_info (
                            key TEXT PRIMARY KEY,
                            value TEXT
                        );";
                    command.ExecuteNonQuery();
                    transaction.Commit();
                }
            }
        }


        public void ClearAllData()
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    var command = connection.CreateCommand();
                    command.Transaction = transaction;

                    command.CommandText = @"
                        DELETE FROM comments;
                        DELETE FROM post_meta;
                        DELETE FROM post_categories;
                        DELETE FROM post_tags;
                        DELETE FROM posts;
                        DELETE FROM authors;
                        DELETE FROM categories;
                        DELETE FROM tags;
                        DELETE FROM attachments;
                        DELETE FROM internal_links;";
                    command.ExecuteNonQuery();
                    transaction.Commit();
                }
            }
        }

        public void SaveAuthor(Author author)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR REPLACE INTO authors (author_id, login, email, display_name, first_name, last_name)
                        VALUES (@AuthorId, @Login, @Email, @DisplayName, @FirstName, @LastName)";
                    command.Parameters.AddWithValue("@AuthorId", author.AuthorId);
                    command.Parameters.AddWithValue("@Login", author.Login);
                    command.Parameters.AddWithValue("@Email", author.Email);
                    command.Parameters.AddWithValue("@DisplayName", author.DisplayName);
                    command.Parameters.AddWithValue("@FirstName", author.FirstName);
                    command.Parameters.AddWithValue("@LastName", author.LastName);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SaveAuthors(List<Author> authors)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    foreach (var author in authors)
                    {
                        using (var command = connection.CreateCommand())
                        {
                            command.Transaction = transaction;
                            command.CommandText = @"
                                INSERT OR REPLACE INTO authors (author_id, login, email, display_name, first_name, last_name)
                                VALUES (@AuthorId, @Login, @Email, @DisplayName, @FirstName, @LastName)";
                            command.Parameters.AddWithValue("@AuthorId", author.AuthorId);
                            command.Parameters.AddWithValue("@Login", author.Login);
                            command.Parameters.AddWithValue("@Email", author.Email);
                            command.Parameters.AddWithValue("@DisplayName", author.DisplayName);
                            command.Parameters.AddWithValue("@FirstName", author.FirstName);
                            command.Parameters.AddWithValue("@LastName", author.LastName);
                            command.ExecuteNonQuery();
                        }
                    }
                    transaction.Commit();
                }
            }
        }

        public void SaveCategory(Category category)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR REPLACE INTO categories (term_id, nicename, parent, name, description)
                        VALUES (@TermId, @Nicename, @Parent, @Name, @Description)";
                    command.Parameters.AddWithValue("@TermId", category.TermId);
                    command.Parameters.AddWithValue("@Nicename", category.Nicename);
                    command.Parameters.AddWithValue("@Parent", category.Parent);
                    command.Parameters.AddWithValue("@Name", category.Name);
                    command.Parameters.AddWithValue("@Description", category.Description);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SaveCategories(List<Category> categories)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    foreach (var category in categories)
                    {
                        using (var command = connection.CreateCommand())
                        {
                            command.Transaction = transaction;
                            command.CommandText = @"
                                INSERT OR REPLACE INTO categories (term_id, nicename, parent, name, description)
                                VALUES (@TermId, @Nicename, @Parent, @Name, @Description)";
                            command.Parameters.AddWithValue("@TermId", category.TermId);
                            command.Parameters.AddWithValue("@Nicename", category.Nicename);
                            command.Parameters.AddWithValue("@Parent", category.Parent);
                            command.Parameters.AddWithValue("@Name", category.Name);
                            command.Parameters.AddWithValue("@Description", category.Description);
                            command.ExecuteNonQuery();
                        }
                    }
                    transaction.Commit();
                }
            }
        }

        public void SaveTag(Tag tag)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR REPLACE INTO tags (term_id, nicename, name, description)
                        VALUES (@TermId, @Nicename, @Name, @Description)";
                    command.Parameters.AddWithValue("@TermId", tag.TermId);
                    command.Parameters.AddWithValue("@Nicename", tag.Nicename);
                    command.Parameters.AddWithValue("@Name", tag.Name);
                    command.Parameters.AddWithValue("@Description", tag.Description);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SaveTags(List<Tag> tags)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    foreach (var tag in tags)
                    {
                        using (var command = connection.CreateCommand())
                        {
                            command.Transaction = transaction;
                            command.CommandText = @"
                                INSERT OR REPLACE INTO tags (term_id, nicename, name, description)
                                VALUES (@TermId, @Nicename, @Name, @Description)";
                            command.Parameters.AddWithValue("@TermId", tag.TermId);
                            command.Parameters.AddWithValue("@Nicename", tag.Nicename);
                            command.Parameters.AddWithValue("@Name", tag.Name);
                            command.Parameters.AddWithValue("@Description", tag.Description);
                            command.ExecuteNonQuery();
                        }
                    }
                    transaction.Commit();
                }
            }
        }

        public void SavePost(Post post)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR REPLACE INTO posts (
                            post_id, title, link, post_type, post_date, post_name, cleaned_html_source, content_encoded, creator, status
                        ) VALUES (
                            @PostId, @Title, @Link, @PostType, @PostDate, @PostName, @CleanedHtmlSource, @ContentEncoded, @Creator, @Status
                        )";
                    command.Parameters.AddWithValue("@PostId", post.PostId);
                    command.Parameters.AddWithValue("@Title", post.Title);
                    command.Parameters.AddWithValue("@Link", post.Link); // New
                    command.Parameters.AddWithValue("@PostType", post.PostType);
                    command.Parameters.AddWithValue("@PostDate", post.PostDate);
                    command.Parameters.AddWithValue("@PostName", post.PostName);
                    command.Parameters.AddWithValue("@CleanedHtmlSource", post.CleanedHtmlSource);
                    command.Parameters.AddWithValue("@ContentEncoded", post.ContentEncoded);
                    command.Parameters.AddWithValue("@Creator", post.Creator);
                    command.Parameters.AddWithValue("@Status", post.Status);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SavePostCategory(int postId, int categoryTermId)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR IGNORE INTO post_categories (post_id, category_term_id)
                        VALUES (@PostId, @CategoryTermId)";
                    command.Parameters.AddWithValue("@PostId", postId);
                    command.Parameters.AddWithValue("@CategoryTermId", categoryTermId);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SavePostTag(int postId, int tagTermId)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR IGNORE INTO post_tags (post_id, tag_term_id)
                        VALUES (@PostId, @TagTermId)";
                    command.Parameters.AddWithValue("@PostId", postId);
                    command.Parameters.AddWithValue("@TagTermId", tagTermId);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SavePostMeta(PostMeta postMeta)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT INTO post_meta (post_id, meta_key, meta_value)
                        VALUES (@PostId, @MetaKey, @MetaValue)";
                    command.Parameters.AddWithValue("@PostId", postMeta.PostId);
                    command.Parameters.AddWithValue("@MetaKey", postMeta.MetaKey);
                    command.Parameters.AddWithValue("@MetaValue", postMeta.MetaValue);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SaveComment(Comment comment)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR REPLACE INTO comments (
                            comment_id, post_id, comment_author, comment_author_email, comment_author_url,
                            comment_author_ip, comment_date, comment_date_gmt, comment_content,
                            comment_approved, comment_type, comment_parent, comment_user_id
                        ) VALUES (
                            @CommentId, @PostId, @Author, @AuthorEmail, @AuthorUrl,
                            @AuthorIp, @Date, @DateGmt, @Content,
                            @Approved, @Type, @Parent, @UserId
                        )";
                    command.Parameters.AddWithValue("@CommentId", comment.CommentId);
                    command.Parameters.AddWithValue("@PostId", comment.PostId);
                    command.Parameters.AddWithValue("@Author", comment.Author);
                    command.Parameters.AddWithValue("@AuthorEmail", comment.AuthorEmail);
                    command.Parameters.AddWithValue("@AuthorUrl", comment.AuthorUrl);
                    command.Parameters.AddWithValue("@AuthorIp", comment.AuthorIp);
                    command.Parameters.AddWithValue("@Date", comment.Date);
                    command.Parameters.AddWithValue("@DateGmt", comment.DateGmt);
                    command.Parameters.AddWithValue("@Content", comment.Content);
                    command.Parameters.AddWithValue("@Approved", comment.Approved);
                    command.Parameters.AddWithValue("@Type", comment.Type);
                    command.Parameters.AddWithValue("@Parent", comment.Parent);
                    command.Parameters.AddWithValue("@UserId", comment.UserId);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SaveAttachment(Attachment attachment)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR REPLACE INTO attachments (
                            post_id, title, url, mime_type, post_name, guid, parent_id, description, content
                        ) VALUES (
                            @PostId, @Title, @Url, @MimeType, @PostName, @Guid, @ParentId, @Description, @Content
                        )";
                    command.Parameters.AddWithValue("@PostId", attachment.PostId);
                    command.Parameters.AddWithValue("@Title", attachment.Title);
                    command.Parameters.AddWithValue("@Url", attachment.Url);
                    command.Parameters.AddWithValue("@MimeType", attachment.MimeType);
                    command.Parameters.AddWithValue("@PostName", attachment.PostName);
                    command.Parameters.AddWithValue("@Guid", attachment.Guid);
                    command.Parameters.AddWithValue("@ParentId", attachment.ParentId);
                    command.Parameters.AddWithValue("@Description", attachment.Description);
                    command.Parameters.AddWithValue("@Content", attachment.Content);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SaveInternalLink(InternalLink link)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT INTO internal_links (source_post_id, target_post_id, anchor_text)
                        VALUES (@SourcePostId, @TargetPostId, @AnchorText)";
                    command.Parameters.AddWithValue("@SourcePostId", link.SourcePostId);
                    command.Parameters.AddWithValue("@TargetPostId", link.TargetPostId);
                    command.Parameters.AddWithValue("@AnchorText", link.AnchorText);
                    command.ExecuteNonQuery();
                }
            }
        }

        public void SaveSiteInfo(SiteInfo info)
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = @"
                        INSERT OR REPLACE INTO site_info (key, value)
                        VALUES (@Key, @Value)";
                    command.Parameters.AddWithValue("@Key", info.Key);
                    command.Parameters.AddWithValue("@Value", info.Value);
                    command.ExecuteNonQuery();
                }
            }
        }

        public Dictionary<string, string> GetSiteInfo()
        {
            var siteInfo = new Dictionary<string, string>();
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT key, value FROM site_info";
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query;
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            siteInfo[reader.GetString(0)] = reader.GetString(1);
                        }
                    }
                }
            }
            return siteInfo;
        }

        // --- Get Methods ---
        public List<Post> GetPosts(string searchTerm = null, string categoryNicename = null, string tagNicename = null, string authorLogin = null, string postStatus = null, string sortColumn = "post_date", string sortOrder = "DESC", int limit = 0, int offset = 0)
        {
            var posts = new List<Post>();
            using (var connection = GetConnection())
            {
                connection.Open();
                var queryBuilder = new System.Text.StringBuilder();
                queryBuilder.Append("SELECT DISTINCT p.post_id, p.title, p.link, p.post_type, p.post_date, p.post_name, p.cleaned_html_source, p.content_encoded, p.creator, p.status FROM posts p");

                if (!string.IsNullOrWhiteSpace(categoryNicename))
                {
                    queryBuilder.Append(" JOIN post_categories pc ON p.post_id = pc.post_id JOIN categories c ON pc.category_term_id = c.term_id");
                }
                if (!string.IsNullOrWhiteSpace(tagNicename))
                {
                    queryBuilder.Append(" JOIN post_tags pt ON p.post_id = pt.post_id JOIN tags t ON pt.tag_term_id = t.term_id");
                }
                if (!string.IsNullOrWhiteSpace(authorLogin))
                {
                    // Assuming 'creator' in posts table maps to 'login' in authors table
                    queryBuilder.Append(" JOIN authors a ON p.creator = a.login");
                }

                queryBuilder.Append(" WHERE p.post_type IN ('post', 'page')");

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    queryBuilder.Append($" AND (p.title LIKE '%{searchTerm}%' OR p.content_encoded LIKE '%{searchTerm}%')");
                }
                if (!string.IsNullOrWhiteSpace(categoryNicename))
                {
                    queryBuilder.Append($" AND c.nicename = '{categoryNicename}'");
                }
                if (!string.IsNullOrWhiteSpace(tagNicename))
                {
                    queryBuilder.Append($" AND t.nicename = '{tagNicename}'");
                }
                if (!string.IsNullOrWhiteSpace(authorLogin))
                {
                    queryBuilder.Append($" AND a.login = '{authorLogin}'");
                }
                if (!string.IsNullOrWhiteSpace(postStatus))
                {
                    queryBuilder.Append($" AND p.status = '{postStatus}'");
                }

                // Validate sortColumn to prevent SQL injection
                HashSet<string> validColumns = new HashSet<string> { "post_id", "title", "post_type", "post_date", "post_name", "creator", "status", "link" };
                if (!validColumns.Contains(sortColumn.ToLower()))
                {
                    sortColumn = "post_date"; // Default to a safe column
                }

                // Validate sortOrder
                if (!sortOrder.Equals("ASC", StringComparison.OrdinalIgnoreCase) && !sortOrder.Equals("DESC", StringComparison.OrdinalIgnoreCase))
                {
                    sortOrder = "DESC"; // Default to descending
                }

                queryBuilder.Append($" ORDER BY p.{sortColumn} {sortOrder}");

                if (limit > 0)
                {
                    queryBuilder.Append($" LIMIT {limit} OFFSET {offset}");
                }

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = queryBuilder.ToString();
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            posts.Add(new Post
                            {
                                PostId = reader.GetInt32(0),
                                Title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                                Link = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                                PostType = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                                PostDate = reader.IsDBNull(4) ? (DateTime?)null : reader.GetDateTime(4),
                                PostName = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                                CleanedHtmlSource = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                                ContentEncoded = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                                Creator = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                                Status = reader.IsDBNull(9) ? string.Empty : reader.GetString(9)
                            });
                        }
                    }
                }
            }
            return posts;
        }

        public int GetPostCount(string searchTerm = null, string categoryNicename = null, string tagNicename = null, string authorLogin = null, string postStatus = null, string sortColumn = "post_date", string sortOrder = "DESC")
        {
            using (var connection = GetConnection())
            {
                connection.Open();
                var queryBuilder = new System.Text.StringBuilder();
                queryBuilder.Append("SELECT COUNT(DISTINCT p.post_id) FROM posts p");

                if (!string.IsNullOrWhiteSpace(categoryNicename))
                {
                    queryBuilder.Append(" JOIN post_categories pc ON p.post_id = pc.post_id JOIN categories c ON pc.category_term_id = c.term_id");
                }
                if (!string.IsNullOrWhiteSpace(tagNicename))
                {
                    queryBuilder.Append(" JOIN post_tags pt ON p.post_id = pt.post_id JOIN tags t ON pt.tag_term_id = t.term_id");
                }
                if (!string.IsNullOrWhiteSpace(authorLogin))
                {
                    queryBuilder.Append(" JOIN authors a ON p.creator = a.login");
                }

                queryBuilder.Append(" WHERE p.post_type IN ('post', 'page')");

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    queryBuilder.Append($" AND (p.title LIKE '%{searchTerm}%' OR p.content_encoded LIKE '%{searchTerm}%')");
                }
                if (!string.IsNullOrWhiteSpace(categoryNicename))
                {
                    queryBuilder.Append($" AND c.nicename = '{categoryNicename}'");
                }
                if (!string.IsNullOrWhiteSpace(tagNicename))
                {
                    queryBuilder.Append($" AND t.nicename = '{tagNicename}'");
                }
                if (!string.IsNullOrWhiteSpace(authorLogin))
                {
                    queryBuilder.Append($" AND a.login = '{authorLogin}'");
                }
                if (!string.IsNullOrWhiteSpace(postStatus))
                {
                    queryBuilder.Append($" AND p.status = '{postStatus}'");
                }

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = queryBuilder.ToString();
                    return Convert.ToInt32(command.ExecuteScalar());
                }
            }
        }

        public Post? GetPostById(int postId)
        {
#pragma warning disable CS8603 // Possible null reference return.
#pragma warning disable CS8625 // Cannot convert null literal to non-nullable reference type.
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT post_id, title, link, post_type, post_date, post_name, cleaned_html_source, content_encoded, creator, status FROM posts WHERE post_id = @PostId";
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query;
                    command.Parameters.AddWithValue("@PostId", postId);
                    using (var reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new Post
                            {
                                PostId = reader.GetInt32(0),
                                Title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                                Link = reader.IsDBNull(2) ? string.Empty : reader.GetString(2), // New
                                PostType = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                                PostDate = reader.IsDBNull(4) ? (DateTime?)null : reader.GetDateTime(4),
                                PostName = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                                CleanedHtmlSource = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                                ContentEncoded = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                                Creator = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                                Status = reader.IsDBNull(9) ? string.Empty : reader.GetString(9)
                            };
                        }
                    }
                }
            }
            return (Post?)null!; // Return null if post not found
#pragma warning restore CS8625 // Cannot convert null literal to non-nullable reference type.
#pragma warning restore CS8603 // Possible null reference return.
        }

        public List<Author> GetAuthors()
        {
            var authors = new List<Author>();
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT author_id, login, email, display_name, first_name, last_name FROM authors";
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query;
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            authors.Add(new Author
                            {
                                AuthorId = reader.GetInt32(0),
                                Login = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                                Email = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                                DisplayName = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                                FirstName = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                                LastName = reader.IsDBNull(5) ? string.Empty : reader.GetString(5)
                            });
                        }
                    }
                }
            }
            return authors;
        }

        public List<Category> GetCategories()
        {
            var categories = new List<Category>();
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT term_id, nicename, parent, name, description FROM categories";
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query; // Use command.CommandText here
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            categories.Add(new Category
                            {
                                TermId = reader.GetInt32(0),
                                Nicename = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                                Parent = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                                Name = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                                Description = reader.IsDBNull(4) ? string.Empty : reader.GetString(4)
                            });
                        }
                    }
                }
            }
            return categories;
        }

        public List<Tag> GetTags()
        {
            var tags = new List<Tag>();
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT term_id, nicename, name, description FROM tags";
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query; // Use command.CommandText here
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            tags.Add(new Tag
                            {
                                TermId = reader.GetInt32(0),
                                Nicename = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                                Name = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                                Description = reader.IsDBNull(3) ? string.Empty : reader.GetString(3)
                            });
                        }
                    }
                }
            }
            return tags;
        }

        public List<Comment> GetCommentsByPostId(int postId)
        {
            var comments = new List<Comment>();
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT comment_id, post_id, comment_author, comment_author_email, comment_author_url, comment_author_ip, comment_date, comment_date_gmt, comment_content, comment_approved, comment_type, comment_parent, comment_user_id FROM comments WHERE post_id = @PostId ORDER BY comment_date";
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query; // Use command.CommandText here
                    command.Parameters.AddWithValue("@PostId", postId);
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            comments.Add(new Comment
                            {
                                CommentId = reader.GetInt32(0),
                                PostId = reader.GetInt32(1),
                                Author = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                                AuthorEmail = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                                AuthorUrl = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                                AuthorIp = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                                Date = reader.IsDBNull(6) ? (DateTime?)null : reader.GetDateTime(6),
                                DateGmt = reader.IsDBNull(7) ? (DateTime?)null : reader.GetDateTime(7),
                                Content = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                                Approved = reader.IsDBNull(9) ? string.Empty : reader.GetString(9),
                                Type = reader.IsDBNull(10) ? string.Empty : reader.GetString(10),
                                Parent = reader.GetInt32(11),
                                UserId = reader.GetInt32(12)
                            });
                        }
                    }
                }
            }
            return comments;
        }

        public List<PostMeta> GetPostMetaByPostId(int postId)
        {
            var postMeta = new List<PostMeta>();
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT meta_id, post_id, meta_key, meta_value FROM post_meta WHERE post_id = @PostId";
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query; // Use command.CommandText here
                    command.Parameters.AddWithValue("@PostId", postId);
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            postMeta.Add(new PostMeta
                            {
                                MetaId = reader.GetInt32(0),
                                PostId = reader.GetInt32(1),
                                MetaKey = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                                MetaValue = reader.IsDBNull(3) ? string.Empty : reader.GetString(3)
                            });
                        }
                    }
                }
            }
            return postMeta;
        }

        public List<Attachment> GetAttachments()
        {
            var attachments = new List<Attachment>();
            using (var connection = GetConnection())
            {
                connection.Open();
                string query = "SELECT post_id, title, url, mime_type, post_name, guid, parent_id, description, content FROM attachments";
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query;
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            attachments.Add(new Attachment
                            {
                                PostId = reader.GetInt32(0),
                                Title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                                Url = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                                MimeType = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                                PostName = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                                Guid = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                                ParentId = reader.IsDBNull(6) ? 0 : reader.GetInt32(6),
                                Description = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                                Content = reader.IsDBNull(8) ? string.Empty : reader.GetString(8)
                            });
                        }
                    }
                }
            }
            return attachments;
        }

        public List<InternalLink> GetInternalLinks()
        {
            var internalLinks = new List<InternalLink>();
            using (var connection = GetConnection())
            {
                connection.Open();
                // Join with posts table to get source/target titles for display
                string query = @"
                    SELECT 
                        il.id, 
                        il.source_post_id, 
                        il.target_post_id, 
                        il.anchor_text,
                        sp.title AS SourcePostTitle,
                        tp.title AS TargetPostTitle,
                        tp.post_name AS TargetPostName
                    FROM internal_links il
                    JOIN posts sp ON il.source_post_id = sp.post_id
                    JOIN posts tp ON il.target_post_id = tp.post_id";
                
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query;
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            internalLinks.Add(new InternalLink
                            {
                                Id = reader.GetInt32(0),
                                SourcePostId = reader.GetInt32(1),
                                TargetPostId = reader.GetInt32(2),
                                AnchorText = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                                SourcePostTitle = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                                TargetPostTitle = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                                TargetPostName = reader.IsDBNull(6) ? string.Empty : reader.GetString(6)
                            });
                        }
                    }
                }
            }
            return internalLinks;
        }
    }
}

