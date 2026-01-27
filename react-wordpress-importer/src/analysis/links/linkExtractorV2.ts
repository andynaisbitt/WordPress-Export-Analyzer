import { ExternalLink } from '../../core/domain/types/ExternalLink';
import { InternalLink } from '../../core/domain/types/InternalLink';
import { Post } from '../../core/domain/types/Post';

const extractLinksFromHtml = (html: string) => {
  if (typeof DOMParser === 'undefined') {
    const links: { href: string; text: string }[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      links.push({ href: match[1], text: match[2].replace(/<[^>]+>/g, '').trim() });
    }
    return links;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('a')).map((anchor) => ({
    href: anchor.getAttribute('href') || '',
    text: anchor.textContent?.trim() || '',
  }));
};

const normalizeUrl = (url: string) => {
  return url.replace(/#.*$/, '').trim();
};

const isInternalUrl = (url: string, siteUrl: string) => {
  if (url.startsWith('/')) return true;
  if (!siteUrl) return false;
  try {
    const base = new URL(siteUrl);
    const target = new URL(url);
    return base.hostname === target.hostname;
  } catch {
    return false;
  }
};

const findTargetPost = (url: string, posts: Post[]) => {
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) return undefined;
  const slug = cleanUrl
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop();
  if (!slug) return undefined;
  return posts.find((post) => post.PostName === slug);
};

export const buildInternalAndExternalLinks = (posts: Post[], siteUrl: string) => {
  const internalLinks: InternalLink[] = [];
  const externalLinks: ExternalLink[] = [];

  posts.forEach((post) => {
    if (!post.ContentEncoded && !post.CleanedHtmlSource) return;
    const html = post.ContentEncoded || post.CleanedHtmlSource || '';
    const links = extractLinksFromHtml(html);
    links.forEach((link) => {
      const href = normalizeUrl(link.href);
      if (!href) return;
      if (isInternalUrl(href, siteUrl)) {
        const target = findTargetPost(href, posts);
        internalLinks.push({
          Id: 0,
          SourcePostId: post.PostId,
          TargetPostId: target ? target.PostId : 0,
          AnchorText: link.text,
          SourcePostTitle: post.Title,
          TargetPostTitle: target?.Title || '',
          TargetPostName: target?.PostName || '',
          TargetPostStatus: target?.Status || '',
        });
      } else {
        externalLinks.push({
          Id: 0,
          SourcePostId: post.PostId,
          SourcePostTitle: post.Title,
          Url: href,
          AnchorText: link.text,
        });
      }
    });
  });

  return { internalLinks, externalLinks };
};
