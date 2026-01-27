import { InternalLink } from '../../core/domain/types/InternalLink';
import { Post } from '../../core/domain/types/Post';

export interface LinkCount {
  postId: number;
  title: string;
  slug: string;
  inbound: number;
  outbound: number;
}

export interface GraphInsights {
  nodes: number;
  links: number;
  avgOutbound: number;
  avgInbound: number;
  orphanPosts: LinkCount[];
  topInbound: LinkCount[];
  topOutbound: LinkCount[];
  byPostId: Map<number, LinkCount>;
}

export const buildGraphInsights = (posts: Post[], links: InternalLink[]): GraphInsights => {
  const byPostId = new Map<number, LinkCount>();
  posts.forEach((post) => {
    byPostId.set(post.PostId, {
      postId: post.PostId,
      title: post.Title || 'Untitled',
      slug: post.PostName || '',
      inbound: 0,
      outbound: 0,
    });
  });

  links.forEach((link) => {
    const source = byPostId.get(link.SourcePostId);
    const target = byPostId.get(link.TargetPostId);
    if (source) source.outbound += 1;
    if (target) target.inbound += 1;
  });

  const counts = Array.from(byPostId.values());
  const orphanPosts = counts.filter((item) => item.inbound === 0 && item.outbound === 0);
  const topInbound = [...counts].sort((a, b) => b.inbound - a.inbound).slice(0, 10);
  const topOutbound = [...counts].sort((a, b) => b.outbound - a.outbound).slice(0, 10);

  const totalOutbound = counts.reduce((sum, item) => sum + item.outbound, 0);
  const totalInbound = counts.reduce((sum, item) => sum + item.inbound, 0);

  return {
    nodes: counts.length,
    links: links.length,
    avgOutbound: counts.length ? totalOutbound / counts.length : 0,
    avgInbound: counts.length ? totalInbound / counts.length : 0,
    orphanPosts,
    topInbound,
    topOutbound,
    byPostId,
  };
};

export const buildLinkMapCsv = (links: InternalLink[]) => {
  const headers = ['source_post_id', 'source_title', 'target_post_id', 'target_title', 'target_slug', 'anchor_text'];
  const rows = links.map((link) => [
    link.SourcePostId,
    link.SourcePostTitle,
    link.TargetPostId,
    link.TargetPostTitle,
    link.TargetPostName,
    (link.AnchorText || '').replace(/\s+/g, ' ').trim(),
  ]);
  const escape = (value: string | number) => {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [headers.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
};
