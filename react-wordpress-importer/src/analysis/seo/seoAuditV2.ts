import { PostV2, InternalLinkV2 } from '../../data/db/schemaV2';

export function findMissingTitles(posts: PostV2[]): PostV2[] {
  return posts.filter(post => !post.post_title || post.post_title.trim() === '' || post.post_title === 'None');
}

export function findDuplicateSlugs(posts: PostV2[]): { slug: string; posts: PostV2[] }[] {
  const slugMap = new Map<string, PostV2[]>();
  posts.forEach(post => {
    if (post.post_name) {
      const slug = post.post_name.toLowerCase();
      if (!slugMap.has(slug)) {
        slugMap.set(slug, []);
      }
      slugMap.get(slug)?.push(post);
    }
  });

  const duplicates: { slug: string; posts: PostV2[] }[] = [];
  slugMap.forEach((postsWithSlug, slug) => {
    if (postsWithSlug.length > 1) {
      duplicates.push({ slug, posts: postsWithSlug });
    }
  });
  return duplicates;
}

export function findMissingDescriptions(posts: PostV2[]): PostV2[] {
  return posts.filter(post => !post.post_excerpt || post.post_excerpt.trim() === '');
}

export function findInternalLinkOrphans(posts: PostV2[], internalLinks: InternalLinkV2[]): PostV2[] {
  const linkedPostIds = new Set<string>();
  internalLinks.forEach(link => {
    if (link.target_post_id !== 'unresolved') { // Only consider resolved links
      linkedPostIds.add(link.target_post_id);
    }
  });

  // Posts that are not linked to by any other post (excluding themselves if they link only to themselves)
  return posts.filter(post => !linkedPostIds.has(post.wordpress_id));
}
