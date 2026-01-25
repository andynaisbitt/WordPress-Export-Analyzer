// react-wordpress-importer/src/components/XmlUploadForm.tsx

import React, { useState } from 'react';
import { XmlParser } from '../services/XmlParser';
import { IndexedDbService } from '../services/IndexedDbService';
import { Post } from '../types/Post';
import { Category } from '../types/Category';
import { Tag } from '../types/Tag';
import { Author } from '../types/Author';
import { Comment } from '../types/Comment';
import { Attachment } from '../types/Attachment';
import { InternalLink } from '../types/InternalLink';
import { PostMeta } from '../types/PostMeta';
import { SiteInfo } from '../types/SiteInfo';

interface XmlUploadFormProps {
  onUploadSuccess: () => void;
}

const XmlUploadForm: React.FC<XmlUploadFormProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an XML file to upload.");
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const xmlString = e.target?.result as string;
        const xmlParser = new XmlParser();
        const indexedDbService = new IndexedDbService();

        await indexedDbService.openDatabase();
        await indexedDbService.clearAllData(); // Clear existing data before new import

        const parsedData = xmlParser.parse(xmlString);

        // Assuming parsedData has a structure similar to the C# XmlProcessor output
        // We'll need to adapt this based on the actual output of fast-xml-parser
        // and the structure of a WordPress XML export.
        // This is a simplified example and will need significant refinement.

        const channel = parsedData.rss.channel;

        // Save Site Info
        const siteInfo: SiteInfo[] = [
          { Key: 'title', Value: channel.title || 'Untitled Site' },
          { Key: 'description', Value: channel.description || '' },
          // Add more site info as needed
        ];
        await indexedDbService.addData('siteInfo', siteInfo);

        // Save Authors
        const authors: Author[] = channel['wp:author'].map((a: any) => ({
          AuthorId: parseInt(a['wp:author_id'], 10),
          Login: a['wp:author_login'],
          Email: a['wp:author_email'],
          DisplayName: a['wp:author_display_name'],
          FirstName: a['wp:author_first_name'] || '',
          LastName: a['wp:author_last_name'] || '',
        }));
        await indexedDbService.addData('authors', authors);

        // Save Categories
        const categories: Category[] = channel['wp:category'].map((c: any) => ({
          TermId: parseInt(c['wp:term_id'], 10),
          Nicename: c['wp:category_nicename'],
          Parent: c['wp:category_parent'] || '',
          Name: c['wp:cat_name'],
          Description: c['wp:category_description'] || '',
        }));
        await indexedDbService.addData('categories', categories);
        
        // Save Tags
        const tags: Tag[] = channel['wp:tag'].map((t: any) => ({
            TermId: parseInt(t['wp:term_id'], 10),
            Nicename: t['wp:tag_nicename'] || t['wp:tag_slug'],
            Name: t['wp:tag_name'],
            Description: t['wp:tag_description'] || '',
        }));
        await indexedDbService.addData('tags', tags);

        // Process items (posts, pages, attachments)
        const items = Array.isArray(channel.item) ? channel.item : [channel.item];
        const postsToStore: Post[] = [];
        const attachmentsToStore: Attachment[] = [];
        const commentsToStore: Comment[] = [];
        const postMetaToStore: PostMeta[] = [];
        const internalLinksToStore: InternalLink[] = []; // This will be handled in a more detailed parsing step

        for (const item of items) {
          const postType = item['wp:post_type'];
          const postId = parseInt(item['wp:post_id'], 10);

          if (postType === 'post' || postType === 'page') {
            const post: Post = {
              PostId: postId,
              Title: item.title || 'Untitled Post',
              Link: item.link || '',
              PostType: postType,
              PostDate: item['wp:post_date'] ? new Date(item['wp:post_date']) : null,
              PostName: item['wp:post_name'] || '',
              CleanedHtmlSource: item['content:encoded'] || '', // Will be cleaned later
              ContentEncoded: item['content:encoded'] || '',
              Creator: item['dc:creator'] || '',
              Status: item['wp:status'] || '',
            };
            postsToStore.push(post);

            // Process comments for post
            if (item['wp:comment'] && Array.isArray(item['wp:comment'])) {
              item['wp:comment'].forEach((c: any) => {
                commentsToStore.push({
                  CommentId: parseInt(c['wp:comment_id'], 10),
                  PostId: postId,
                  Author: c['wp:comment_author'] || '',
                  AuthorEmail: c['wp:comment_author_email'] || '',
                  AuthorUrl: c['wp:comment_author_url'] || '',
                  AuthorIp: c['wp:comment_author_IP'] || '',
                  Date: c['wp:comment_date'] ? new Date(c['wp:comment_date']) : null,
                  DateGmt: c['wp:comment_date_gmt'] ? new Date(c['wp:comment_date_gmt']) : null,
                  Content: c['wp:comment_content'] || '',
                  Approved: c['wp:comment_approved'] || '',
                  Type: c['wp:comment_type'] || '',
                  Parent: parseInt(c['wp:comment_parent'] || '0', 10),
                  UserId: parseInt(c['wp:comment_user_id'] || '0', 10),
                });
              });
            }

            // Process post meta
            if (item['wp:postmeta'] && Array.isArray(item['wp:postmeta'])) {
              item['wp:postmeta'].forEach((pm: any) => {
                postMetaToStore.push({
                  MetaId: 0, // IndexedDB will auto-increment this
                  PostId: postId,
                  MetaKey: pm['wp:meta_key'] || '',
                  MetaValue: pm['wp:meta_value'] || '',
                });
              });
            }

          } else if (postType === 'attachment') {
            attachmentsToStore.push({
              PostId: postId,
              Title: item.title || '',
              Url: item['wp:attachment_url'] || item.guid || '',
              MimeType: item['wp:post_mime_type'] || '',
              PostName: item['wp:post_name'] || '',
              Guid: item.guid || '',
              ParentId: parseInt(item['wp:post_parent'] || '0', 10),
              Description: item['excerpt:encoded'] || '',
              Content: item['content:encoded'] || '',
            });
          }
        }
        await indexedDbService.addData('posts', postsToStore);
        await indexedDbService.addData('attachments', attachmentsToStore);
        await indexedDbService.addData('comments', commentsToStore);
        await indexedDbService.addData('postMeta', postMetaToStore);
        // Internal links will require a second pass or more complex parsing after all posts are stored

        onUploadSuccess(); // Notify parent component of success
        alert("WordPress XML imported successfully!");

      } catch (err) {
        console.error("Failed to process XML:", err);
        setError("Failed to process XML. Please check the file format.");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setError("Failed to read file.");
    };

    reader.readAsText(selectedFile);
  };

  return (
    <div>
      <h2>Upload WordPress XML Export</h2>
      <input type="file" accept=".xml" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!selectedFile || loading}>
        {loading ? 'Processing...' : 'Upload and Process'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {loading && <p>Please wait, processing XML...</p>}
    </div>
  );
};

export default XmlUploadForm;
