// src/analysis/manifest/mediaManifestV2.ts
import { Attachment } from '../../core/domain/types/Attachment';
import { Post } from '../../core/domain/types/Post';
import { AttachmentV2, PostV2 } from '../../data/db/schemaV2';

export interface MediaManifestRow {
  url: string;
  filename: string;
  whereUsedPostIds: string[];
  matchedAttachmentId?: string;
  matchedAttachmentUrl?: string;
  type: 'image' | 'link';
  status: 'matched' | 'missing';
}

const mediaExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf', 'mp4', 'mp3'];

function extractUrlsFromHtml(html: string): { url: string; type: 'image' | 'link' }[] {
  if (typeof DOMParser === 'undefined') {
    // Basic regex fallback for non-browser environments (e.g., tests)
    const urls: { url: string; type: 'image' | 'link' }[] = [];
    const imgSrcRegex = /<img[^>]+src="([^">]+)"/g;
    const aHrefRegex = /<a[^>]+href="([^">]+)"/g;
    let match;
    while ((match = imgSrcRegex.exec(html)) !== null) {
      urls.push({ url: match[1], type: 'image' });
    }
    while ((match = aHrefRegex.exec(html)) !== null) {
      const extension = match[1].split('.').pop()?.toLowerCase() || '';
      if (mediaExtensions.includes(extension)) {
        urls.push({ url: match[1], type: 'link' });
      }
    }
    return urls;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const urls: { url: string; type: 'image' | 'link' }[] = [];

  // Extract from <img> src and srcset
  doc.querySelectorAll('img').forEach((img) => {
    if (img.src) {
      urls.push({ url: img.src, type: 'image' });
    }
    if (img.srcset) {
      const sources = img.srcset.split(',').map((s) => s.trim().split(' ')[0]);
      sources.forEach((source) => urls.push({ url: source, type: 'image' }));
    }
  });

  // Extract from <a> href for media files
  doc.querySelectorAll('a').forEach((a) => {
    if (a.href) {
      const extension = a.href.split('.').pop()?.toLowerCase() || '';
      if (mediaExtensions.includes(extension)) {
        urls.push({ url: a.href, type: 'link' });
      }
    }
  });

  return urls;
}

type PostLike = Post | PostV2;
type AttachmentLike = Attachment | AttachmentV2;

const getPostId = (post: PostLike): string => {
  if ('PostId' in post) return String(post.PostId);
  return String(post.wordpress_id || post.id || '');
};

const getPostHtml = (post: PostLike): string => {
  if ('ContentEncoded' in post) return post.ContentEncoded || post.CleanedHtmlSource || '';
  return post.post_content || post.post_excerpt || '';
};

const getAttachmentUrl = (attachment: AttachmentLike): string => {
  if ('Url' in attachment) return attachment.Url;
  return attachment.attachment_url || attachment.guid || '';
};

const getAttachmentId = (attachment: AttachmentLike): string => {
  if ('PostId' in attachment) return String(attachment.PostId);
  return String(attachment.wordpress_id || attachment.id || '');
};

export function buildMediaManifest(posts: PostLike[], attachments: AttachmentLike[]): MediaManifestRow[] {
  const manifestMap = new Map<string, MediaManifestRow>();

  posts.forEach((post) => {
    const htmlContent = getPostHtml(post);
    if (!htmlContent) return;

    const extractedUrls = extractUrlsFromHtml(htmlContent);

    extractedUrls.forEach(({ url, type }) => {
      const filename = url.split('/').pop() || '';
      if (manifestMap.has(url)) {
        const existingRow = manifestMap.get(url)!;
        const postId = getPostId(post);
        if (postId && !existingRow.whereUsedPostIds.includes(postId)) {
          existingRow.whereUsedPostIds.push(postId);
        }
      } else {
        const newRow: MediaManifestRow = {
          url,
          filename,
          whereUsedPostIds: [getPostId(post)].filter(Boolean),
          type,
          status: 'missing', // Assume missing until matched
        };
        manifestMap.set(url, newRow);
      }
    });
  });

  const manifest = Array.from(manifestMap.values());

  // Cross-reference with attachments
  manifest.forEach((row) => {
    const matchedAttachment = attachments.find((att) => {
      const attachmentUrl = getAttachmentUrl(att);
      if (!attachmentUrl) return false;
      return attachmentUrl === row.url || attachmentUrl.endsWith(row.filename);
    });
    if (matchedAttachment) {
      row.status = 'matched';
      row.matchedAttachmentId = getAttachmentId(matchedAttachment);
      row.matchedAttachmentUrl = getAttachmentUrl(matchedAttachment);
    }
  });

  return manifest;
}
