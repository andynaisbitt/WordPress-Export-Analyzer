import TurndownService from 'turndown';
import { Attachment } from '../../core/domain/types/Attachment';
import { Category } from '../../core/domain/types/Category';
import { Post } from '../../core/domain/types/Post';
import { PostMeta } from '../../core/domain/types/PostMeta';
import { Tag } from '../../core/domain/types/Tag';

export interface BlogCmsCategory {
  name: string;
  slug: string;
  description?: string;
  parent_slug?: string;
}

export interface BlogCmsTag {
  name: string;
  slug: string;
  description?: string;
}

export interface BlogCmsPostDraft {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  featured_image?: string;
  featured_image_alt?: string;
  featured_image_caption?: string;
  published: boolean;
  published_at?: string | null;
  scheduled_for?: string | null;
  is_featured?: boolean;
  allow_comments?: boolean;
  author_id: number;
  tag_slugs?: string[];
  category_slugs?: string[];
}

export interface BlogCmsExportPack {
  categories: BlogCmsCategory[];
  tags: BlogCmsTag[];
  posts: BlogCmsPostDraft[];
  attachments: Attachment[];
}

const slugify = (value: string, maxLength: number) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return slug.slice(0, maxLength);
};

const decodeHtml = (value: string) => {
  if (typeof document === 'undefined') {
    return value.replace(/&nbsp;/g, ' ');
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const stripHtml = (html: string) => {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, '');
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
};

const cleanWordPressHtml = (html: string) => {
  return html
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

const createTurndown = () => {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });
  return service;
};

const toMarkdown = (html: string) => {
  const cleaned = cleanWordPressHtml(html);
  const turndown = createTurndown();
  const markdown = turndown.turndown(cleaned);
  return markdown.replace(/\n{3,}/g, '\n\n').trim();
};

const truncate = (value: string, maxLength: number) => {
  if (!value) return '';
  return value.length > maxLength ? value.slice(0, maxLength) : value;
};

const metaValue = (meta: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = meta[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

export const buildBlogCmsExportPack = (input: {
  posts: Post[];
  categories: Category[];
  tags: Tag[];
  attachments: Attachment[];
  postMeta: PostMeta[];
  defaultAuthorId: number;
  preserveCanonical: boolean;
}): BlogCmsExportPack => {
  const { posts, categories, tags, attachments, postMeta, defaultAuthorId, preserveCanonical } = input;
  const metaByPostId = new Map<number, Record<string, string>>();

  postMeta.forEach((meta) => {
    const existing = metaByPostId.get(meta.PostId) ?? {};
    existing[meta.MetaKey] = meta.MetaValue;
    metaByPostId.set(meta.PostId, existing);
  });

  const attachmentsById = new Map<number, Attachment>();
  attachments.forEach((attachment) => {
    attachmentsById.set(attachment.PostId, attachment);
  });

  const categoriesOut: BlogCmsCategory[] = categories.map((cat) => ({
    name: truncate(cat.Name || cat.Nicename || 'Category', 100),
    slug: truncate(cat.Nicename || slugify(cat.Name || 'category', 100), 100),
    description: cat.Description || undefined,
    parent_slug: cat.Parent || undefined,
  }));

  const tagsOut: BlogCmsTag[] = tags.map((tag) => ({
    name: truncate(tag.Name || tag.Nicename || 'Tag', 50),
    slug: truncate(tag.Nicename || slugify(tag.Name || 'tag', 50), 50),
    description: tag.Description || undefined,
  }));

  const postsOut: BlogCmsPostDraft[] = posts
    .filter((post) => post.PostType === 'post')
    .map((post) => {
      const meta = metaByPostId.get(post.PostId) ?? {};
      const seoTitle = metaValue(meta, ['_yoast_wpseo_title', '_rank_math_title', '_aioseo_title']);
      const seoDesc = metaValue(meta, ['_yoast_wpseo_metadesc', '_rank_math_description', '_aioseo_description']);
      const seoKeywords = metaValue(meta, ['_yoast_wpseo_focuskw', '_rank_math_focus_keyword']);
      const thumbnailId = metaValue(meta, ['_thumbnail_id']);
      const attachmentId = thumbnailId ? Number(thumbnailId) : null;
      const attachment = attachmentId ? attachmentsById.get(attachmentId) : undefined;
      const attachmentMeta = attachmentId ? metaByPostId.get(attachmentId) ?? {} : {};
      const attachmentAlt = metaValue(attachmentMeta, ['_wp_attachment_image_alt']);

      const htmlContent = post.ContentEncoded || post.CleanedHtmlSource || '';
      const markdown = toMarkdown(decodeHtml(htmlContent));
      const excerptSource = post.Excerpt || stripHtml(htmlContent);
      const excerpt = truncate(stripHtml(excerptSource), 500);
      const published = post.Status === 'publish';
      const publishedAt = post.PostDate ? post.PostDate.toISOString() : null;

      return {
        title: truncate(post.Title || 'Untitled', 200),
        slug: truncate(post.PostName || slugify(post.Title || 'post', 250), 250),
        excerpt: excerpt || undefined,
        content: markdown || '',
        meta_title: truncate(seoTitle || post.Title || '', 60) || undefined,
        meta_description: truncate(seoDesc || excerpt || markdown, 160) || undefined,
        meta_keywords: truncate(seoKeywords, 255) || undefined,
        canonical_url: preserveCanonical ? post.Link : undefined,
        featured_image: attachment?.Url,
        featured_image_alt: truncate(attachmentAlt, 125) || undefined,
        featured_image_caption: undefined,
        published,
        published_at: published ? publishedAt : null,
        scheduled_for: !published && post.PostDate ? publishedAt : null,
        is_featured: false,
        allow_comments: true,
        author_id: defaultAuthorId,
        tag_slugs: post.TagSlugs?.map((slug) => truncate(slug, 50)),
        category_slugs: post.CategorySlugs?.map((slug) => truncate(slug, 100)),
      };
    });

  return {
    categories: categoriesOut,
    tags: tagsOut,
    posts: postsOut,
    attachments,
  };
};
