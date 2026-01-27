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

const extractLinksFromMarkdown = (markdown: string) => {
  const links: { href: string; text: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({ href: match[2], text: match[1].trim() });
  }
  return links;
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
  const path = cleanUrl.replace(/^https?:\/\/[^/]+/i, '').replace(/\/$/, '');
  const segments = path.split('?')[0].split('/').filter(Boolean);
  const slugCandidates = new Set(segments);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) slugCandidates.add(lastSegment);
  }
  const bySlug = posts.find((post) => post.PostName && slugCandidates.has(post.PostName));
  if (bySlug) return bySlug;

  try {
    const parsed = new URL(cleanUrl, 'http://placeholder.local');
    const params = parsed.searchParams;
    const idParam = params.get('p') || params.get('page_id') || params.get('post') || params.get('post_id');
    if (idParam) {
      const id = Number(idParam);
      if (!Number.isNaN(id)) {
        return posts.find((post) => post.PostId === id);
      }
    }
  } catch {
    // ignore url parse
  }

  return undefined;
};

export const buildInternalAndExternalLinks = (posts: Post[], siteUrl: string) => {
  const internalLinks: InternalLink[] = [];
  const externalLinks: ExternalLink[] = [];

  posts.forEach((post) => {
    const content = post.ContentEncoded || post.CleanedHtmlSource || post.Markdown || '';
    if (!content) return;
    const links = extractLinksFromHtml(content);
    const markdownLinks = links.length === 0 && post.Markdown ? extractLinksFromMarkdown(post.Markdown) : [];
    const allLinks = links.length > 0 ? links : markdownLinks;
    allLinks.forEach((link) => {
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
