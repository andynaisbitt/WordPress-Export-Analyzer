import { Post } from '../../core/domain/types/Post';
import { InternalLink } from '../../core/domain/types/InternalLink';

export interface GraphNode {
  id: number;
  name: string;
  slug: string;
  value: number;
  group: string;
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

  const nodes: GraphNode[] = posts.map((post) => ({
    id: post.PostId,
    name: post.Title,
    slug: post.PostName,
    value: Math.max(1, Math.ceil(countWords(post.ContentEncoded || post.CleanedHtmlSource || '') / 200)),
    group: (post.CategorySlugs && post.CategorySlugs[0]) || 'uncategorized',
  }));

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
