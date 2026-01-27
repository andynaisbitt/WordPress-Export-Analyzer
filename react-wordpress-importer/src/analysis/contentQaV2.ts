import { Post } from '../core/domain/types/Post';

export type ContentIssueSeverity = 'low' | 'medium' | 'high';

export interface ContentIssue {
  postId: number;
  title: string;
  slug: string;
  severity: ContentIssueSeverity;
  issues: string[];
  wordCount: number;
  linkCount: number;
  imageCount: number;
  headingCount: number;
  hasShortcodes: boolean;
  hasWpComments: boolean;
}

const stripHtml = (html: string) => {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ');
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
};

const countMatches = (value: string, regex: RegExp) => {
  const matches = value.match(regex);
  return matches ? matches.length : 0;
};

const slugValid = (slug: string) => /^[a-z0-9-]+$/.test(slug);

export const analyzePostContent = (post: Post): ContentIssue | null => {
  const html = post.ContentEncoded || post.CleanedHtmlSource || '';
  const text = stripHtml(html).replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;
  const linkCount = countMatches(html, /<a\s[^>]*href=/gi);
  const imageCount = countMatches(html, /<img\s[^>]*src=/gi);
  const headingCount = countMatches(html, /<h[1-6][^>]*>/gi);
  const hasShortcodes = /\[[^\]]+\]/.test(html);
  const hasWpComments = /<!--\s*\/?wp:/i.test(html);

  const issues: string[] = [];
  let severity: ContentIssueSeverity = 'low';

  if (!post.Title || post.Title.trim().length < 3) {
    issues.push('Missing or too-short title');
    severity = 'high';
  }

  if (!post.PostName) {
    issues.push('Missing slug');
    severity = 'high';
  } else if (!slugValid(post.PostName)) {
    issues.push('Slug contains invalid characters');
    severity = severity === 'high' ? severity : 'medium';
  }

  if (!text || wordCount === 0) {
    issues.push('Empty content');
    severity = 'high';
  } else if (wordCount < 120) {
    issues.push('Very short content (<120 words)');
    severity = severity === 'high' ? severity : 'medium';
  }

  if (!post.Excerpt || post.Excerpt.trim().length < 20) {
    issues.push('Missing or short excerpt');
    severity = severity === 'high' ? severity : 'medium';
  }

  if (headingCount === 0) {
    issues.push('No headings detected');
    severity = severity === 'high' ? severity : 'medium';
  }

  if (linkCount > 80) {
    issues.push('Too many links (>80)');
    severity = 'high';
  }

  if (imageCount > 40) {
    issues.push('Too many images (>40)');
    severity = severity === 'high' ? severity : 'medium';
  }

  if (hasShortcodes) {
    issues.push('Contains WordPress shortcodes');
  }

  if (hasWpComments) {
    issues.push('Contains Gutenberg block comments');
  }

  if (/style\s*=\s*["']/.test(html)) {
    issues.push('Inline styles detected');
  }

  if (/<script/i.test(html)) {
    issues.push('Script tag found in content');
    severity = 'high';
  }

  if (issues.length === 0) {
    return null;
  }

  return {
    postId: post.PostId,
    title: post.Title || 'Untitled',
    slug: post.PostName || '',
    severity,
    issues,
    wordCount,
    linkCount,
    imageCount,
    headingCount,
    hasShortcodes,
    hasWpComments,
  };
};

export const buildContentQaReport = (posts: Post[]) => {
  const issues = posts
    .filter((post) => post.PostType === 'post')
    .map(analyzePostContent)
    .filter((issue): issue is ContentIssue => Boolean(issue));

  const summary = {
    totalPosts: posts.filter((post) => post.PostType === 'post').length,
    flaggedPosts: issues.length,
    highSeverity: issues.filter((issue) => issue.severity === 'high').length,
    mediumSeverity: issues.filter((issue) => issue.severity === 'medium').length,
    lowSeverity: issues.filter((issue) => issue.severity === 'low').length,
  };

  return { issues, summary };
};
