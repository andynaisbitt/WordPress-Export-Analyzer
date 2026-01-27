import JSZip from 'jszip';
import { Attachment } from '../../core/domain/types/Attachment';
import { Post } from '../../core/domain/types/Post';
import { buildMediaManifest } from '../../analysis/manifest/mediaManifestV2';
import { BlogCmsExportPack, buildBlogCmsCsvBundle } from './blogCmsExport';

const toKebabCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const cleanAssetName = (originalFilename: string, postTitle: string, index: number) => {
  const safeTitle = toKebabCase(postTitle || 'post');
  const parts = originalFilename.split('.');
  const extension = parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
  const suffix = String(index).padStart(2, '0');
  return `${safeTitle}-${suffix}.${extension}`;
};

const replaceUrls = (content: string, urlMap: Map<string, string>) => {
  let updated = content;
  urlMap.forEach((newPath, url) => {
    const regex = new RegExp(escapeRegex(url), 'g');
    updated = updated.replace(regex, newPath);
  });
  return updated;
};

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

export const buildAssetLaundromatZip = async (input: {
  pack: BlogCmsExportPack;
  posts: Post[];
  attachments: Attachment[];
  chunkSize?: number;
}) => {
  const { pack, posts, attachments, chunkSize = 8 } = input;
  const manifest = buildMediaManifest(posts, attachments).filter((row) => row.status === 'matched');
  const postById = new Map(posts.map((post) => [String(post.PostId), post]));
  const postBySlug = new Map(posts.map((post) => [post.PostName, post]));
  const postByTitle = new Map(posts.map((post) => [post.Title, post]));

  const urlToPath = new Map<string, string>();
  const usedNames = new Set<string>();
  const countersByPost = new Map<string, number>();
  const renameRows: string[] = ['original_url,new_path,post_id,post_title'];
  const errors: string[] = [];

  const zip = new JSZip();
  const mediaFolder = zip.folder('media');

  let processed = 0;

  for (const row of manifest) {
    const postId = row.whereUsedPostIds[0] || '';
    const post = postById.get(postId);
    const postTitle = post?.Title || 'post';
    const counter = (countersByPost.get(postId) || 0) + 1;
    countersByPost.set(postId, counter);

    let filename = cleanAssetName(row.filename || `asset-${postId}`, postTitle, counter);
    let guard = 1;
    while (usedNames.has(filename)) {
      guard += 1;
      filename = cleanAssetName(row.filename || `asset-${postId}`, postTitle, counter + guard);
    }
    usedNames.add(filename);

    const newPath = `media/${filename}`;
    urlToPath.set(row.url, newPath);
    if (row.matchedAttachmentUrl && row.matchedAttachmentUrl !== row.url) {
      urlToPath.set(row.matchedAttachmentUrl, newPath);
    }
    renameRows.push(`"${row.url}","${newPath}","${postId}","${postTitle.replace(/"/g, '""')}"`);

    const attachment = attachments.find((att) => att.Url === row.matchedAttachmentUrl || att.Url?.endsWith(row.filename));
    if (!attachment?.Url || !mediaFolder) {
      errors.push(`${row.url} (missing attachment url)`);
      continue;
    }

    try {
      const response = await fetch(attachment.Url);
      if (!response.ok) {
        errors.push(`${attachment.Url} (${response.status})`);
        continue;
      }
      const blob = await response.blob();
      mediaFolder.file(filename, blob);
    } catch (error) {
      errors.push(`${attachment.Url} (fetch failed)`);
    }

    processed += 1;
    if (chunkSize > 0 && processed % chunkSize === 0) {
      await nextTick();
    }
  }

  const updatedPosts = pack.posts.map((post) => {
    const original = postBySlug.get(post.slug) || postByTitle.get(post.title);
    if (!original) return post;
    const content = replaceUrls(post.content, urlToPath);
    const featuredImage = post.featured_image ? replaceUrls(post.featured_image, urlToPath) : post.featured_image;
    return {
      ...post,
      content,
      featured_image: featuredImage,
    };
  });

  const updatedPack: BlogCmsExportPack = {
    ...pack,
    posts: updatedPosts,
    attachments: pack.attachments.map((attachment) => {
      if (!attachment.Url) return attachment;
      const updatedUrl = urlToPath.get(attachment.Url);
      return updatedUrl ? { ...attachment, Url: updatedUrl } : attachment;
    }),
  };

  const csvBundle = buildBlogCmsCsvBundle(updatedPack);

  zip.file('blogcms-pack.json', JSON.stringify(updatedPack, null, 2));
  zip.file('posts.csv', csvBundle.postsCsv);
  zip.file('categories.csv', csvBundle.categoriesCsv);
  zip.file('tags.csv', csvBundle.tagsCsv);
  if (updatedPack.qa) {
    zip.file('content-qa.csv', csvBundle.qaCsv);
  }
  zip.file('asset-renames.csv', renameRows.join('\n'));
  if (errors.length) {
    zip.file('asset-errors.txt', errors.join('\n'));
  }

  return zip.generateAsync({ type: 'blob' });
};
