import TurndownService from 'turndown';
import { Attachment } from '../../core/domain/types/Attachment';
import { Category } from '../../core/domain/types/Category';
import { Post } from '../../core/domain/types/Post';
import { PostMeta } from '../../core/domain/types/PostMeta';
import { Tag } from '../../core/domain/types/Tag';
import JSZip from 'jszip';
import { ContentIssue } from '../../analysis/contentQaV2';

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
  qa?: {
    summary: {
      totalPosts: number;
      flaggedPosts: number;
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
    };
    issues: ContentIssue[];
  };
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
  qa?: {
    summary: {
      totalPosts: number;
      flaggedPosts: number;
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
    };
    issues: ContentIssue[];
  };
}): BlogCmsExportPack => {
  const { posts, categories, tags, attachments, postMeta, defaultAuthorId, preserveCanonical, qa } = input;
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
      const markdown = post.Markdown || toMarkdown(decodeHtml(htmlContent));
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
    qa,
  };
};

const toCsv = (headers: string[], rows: (string | number | boolean | null | undefined)[][]) => {
  const escape = (value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return [headers.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
};

export const buildBlogCmsCsvBundle = (pack: BlogCmsExportPack) => {
  const categoryHeaders = ['name', 'slug', 'description', 'parent_slug'];
  const categoryRows = pack.categories.map((cat) => [cat.name, cat.slug, cat.description, cat.parent_slug]);

  const tagHeaders = ['name', 'slug', 'description'];
  const tagRows = pack.tags.map((tag) => [tag.name, tag.slug, tag.description]);

  const postHeaders = [
    'title',
    'slug',
    'excerpt',
    'content',
    'meta_title',
    'meta_description',
    'meta_keywords',
    'canonical_url',
    'featured_image',
    'featured_image_alt',
    'featured_image_caption',
    'published',
    'published_at',
    'scheduled_for',
    'is_featured',
    'allow_comments',
    'author_id',
    'tag_slugs',
    'category_slugs',
  ];
  const postRows = pack.posts.map((post) => [
    post.title,
    post.slug,
    post.excerpt,
    post.content,
    post.meta_title,
    post.meta_description,
    post.meta_keywords,
    post.canonical_url,
    post.featured_image,
    post.featured_image_alt,
    post.featured_image_caption,
    post.published,
    post.published_at,
    post.scheduled_for,
    post.is_featured,
    post.allow_comments,
    post.author_id,
    (post.tag_slugs || []).join('|'),
    (post.category_slugs || []).join('|'),
  ]);

  const qaHeaders = [
    'post_id',
    'title',
    'slug',
    'severity',
    'issues',
    'word_count',
    'link_count',
    'image_count',
    'heading_count',
    'shortcodes',
    'gutenberg_comments',
  ];
  const qaRows = (pack.qa?.issues || []).map((issue) => [
    issue.postId,
    issue.title,
    issue.slug,
    issue.severity,
    issue.issues.join('; '),
    issue.wordCount,
    issue.linkCount,
    issue.imageCount,
    issue.headingCount,
    issue.hasShortcodes ? 'yes' : 'no',
    issue.hasWpComments ? 'yes' : 'no',
  ]);

  return {
    categoriesCsv: toCsv(categoryHeaders, categoryRows),
    tagsCsv: toCsv(tagHeaders, tagRows),
    postsCsv: toCsv(postHeaders, postRows),
    qaCsv: toCsv(qaHeaders, qaRows),
  };
};

export const buildBlogCmsZip = async (pack: BlogCmsExportPack) => {
  const zip = new JSZip();
  const csv = buildBlogCmsCsvBundle(pack);

  zip.file('blogcms-pack.json', JSON.stringify(pack, null, 2));
  zip.file('categories.csv', csv.categoriesCsv);
  zip.file('tags.csv', csv.tagsCsv);
  zip.file('posts.csv', csv.postsCsv);
  if (pack.qa) {
    zip.file('content-qa.csv', csv.qaCsv);
  }

  return zip.generateAsync({ type: 'blob' });
};
