import { Post } from '../../core/domain/types/Post';
import { InternalLink } from '../../core/domain/types/InternalLink';

export interface GraphNode {
  id: number;
  name: string;
  slug: string;
  value: number;
  group: string;
  inbound: number;
  outbound: number;
  wordCount: number;
}

export interface GraphLink {
  source: number;
  target: number;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const countWords = (html: string) => {
  const text = html.replace(/<[^>]+>/g, ' ').trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
};

export const buildGraphData = (posts: Post[], internalLinks: InternalLink[]): GraphData => {
  const postMap = new Map<number, Post>();
  posts.forEach((post) => {
    postMap.set(post.PostId, post);
  });

  const linkCounts = new Map<number, { inbound: number; outbound: number }>();
  posts.forEach((post) => {
    linkCounts.set(post.PostId, { inbound: 0, outbound: 0 });
  });

  internalLinks.forEach((link) => {
    const source = linkCounts.get(link.SourcePostId);
    const target = linkCounts.get(link.TargetPostId);
    if (source) source.outbound += 1;
    if (target) target.inbound += 1;
  });

  const nodes: GraphNode[] = posts.map((post) => {
    const wordCount = countWords(post.ContentEncoded || post.CleanedHtmlSource || '');
    const counts = linkCounts.get(post.PostId) ?? { inbound: 0, outbound: 0 };
    return {
      id: post.PostId,
      name: post.Title,
      slug: post.PostName,
      value: Math.max(1, counts.inbound + counts.outbound),
      group: (post.CategorySlugs && post.CategorySlugs[0]) || 'uncategorized',
      inbound: counts.inbound,
      outbound: counts.outbound,
      wordCount,
    };
  });

  const links: GraphLink[] = internalLinks
    .filter((link) => link.SourcePostId && link.TargetPostId)
    .filter((link) => postMap.has(link.SourcePostId) && postMap.has(link.TargetPostId))
    .map((link) => ({
      source: link.SourcePostId,
      target: link.TargetPostId,
      value: 1,
    }));

  return { nodes, links };
};
