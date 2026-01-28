import { ExternalLink } from '../../core/domain/types/ExternalLink';
import { InternalLink } from '../../core/domain/types/InternalLink';
import { Post } from '../../core/domain/types/Post';

const decodeHtml = (value: string) => {
  if (typeof document === 'undefined') {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const extractLinksFromHtml = (html: string) => {
  const normalized = html.includes('&lt;') ? decodeHtml(html) : html;
  if (typeof DOMParser === 'undefined') {
    const links: { href: string; text: string }[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(normalized)) !== null) {
      links.push({ href: match[1], text: match[2].replace(/<[^>]+>/g, '').trim() });
    }
    return links;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(normalized, 'text/html');
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

const resolveInternalUrl = (href: string, siteUrl: string) => {
  if (!href) return '';
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (!siteUrl) return href;
  try {
    return new URL(href, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
  } catch {
    return href;
  }
};

const isRelativeLink = (url: string) => {
  if (!url) return false;
  if (url.startsWith('#')) return false;
  if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) return false;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return false;
  return true;
};

const isInternalUrl = (url: string, siteUrl: string) => {
  if (url.startsWith('/')) return true;
  if (isRelativeLink(url)) return true;
  if (!siteUrl) return false;
  try {
    const base = new URL(siteUrl);
    const target = url.startsWith('//') ? new URL(`https:${url}`) : new URL(url);
    return base.hostname === target.hostname;
  } catch {
    return false;
  }
};

const findTargetPost = (url: string, posts: Post[]) => {
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) return undefined;
  const path = cleanUrl.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/\//, '').replace(/\/$/, '');
  const segments = path.split('?')[0].split('/').filter(Boolean);
  const slugCandidates = new Set(segments);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) slugCandidates.add(lastSegment);
  }
  const bySlug = posts.find((post) => post.PostName && slugCandidates.has(post.PostName));
  if (bySlug) return bySlug;

  try {
    const parsed = cleanUrl.startsWith('//')
      ? new URL(`https:${cleanUrl}`)
      : new URL(cleanUrl, 'http://placeholder.local');
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
  const stats = {
    postsScanned: 0,
    postsWithContent: 0,
    htmlLinks: 0,
    markdownLinks: 0,
    totalLinks: 0,
    unresolvedInternal: 0,
    samples: [] as string[],
    siteUrl,
  };

  posts.forEach((post) => {
    stats.postsScanned += 1;
    const content = post.ContentEncoded || post.CleanedHtmlSource || post.Markdown || '';
    if (!content) return;
    stats.postsWithContent += 1;
    const links = extractLinksFromHtml(content);
    const markdownLinks = post.Markdown ? extractLinksFromMarkdown(post.Markdown) : [];
    const allLinks = [...links, ...markdownLinks];
    if (links.length > 0) stats.htmlLinks += links.length;
    if (markdownLinks.length > 0) stats.markdownLinks += markdownLinks.length;

    allLinks.forEach((link) => {
      const href = normalizeUrl(link.href);
      if (!href) return;
      if (stats.samples.length < 5) stats.samples.push(href);
      if (isInternalUrl(href, siteUrl)) {
        const target = findTargetPost(href, posts);
        if (!target) stats.unresolvedInternal += 1;
        const resolvedUrl = resolveInternalUrl(href, siteUrl);
        internalLinks.push({
          SourcePostId: post.PostId,
          TargetPostId: target ? target.PostId : 0,
          AnchorText: link.text,
          Href: href,
          TargetUrl: target?.PostName ? resolveInternalUrl(`/${target.PostName}`, siteUrl) : resolvedUrl,
          SourcePostTitle: post.Title,
          TargetPostTitle: target?.Title || '',
          TargetPostName: target?.PostName || '',
          TargetPostStatus: target?.Status || '',
        });
      } else {
        externalLinks.push({
          SourcePostId: post.PostId,
          SourcePostTitle: post.Title,
          Url: href,
          AnchorText: link.text,
        });
      }
    });
  });

  stats.totalLinks = internalLinks.length + externalLinks.length;

  return { internalLinks, externalLinks, stats };
};
