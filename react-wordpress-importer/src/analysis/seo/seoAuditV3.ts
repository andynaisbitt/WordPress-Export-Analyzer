import { Post } from '../../core/domain/types/Post';

export const findMissingTitles = (posts: Post[]) =>
  posts.filter((post) => !post.Title || post.Title.trim().length < 3);

export const findDuplicateSlugs = (posts: Post[]) => {
  const map = new Map<string, Post[]>();
  posts.forEach((post) => {
    if (!post.PostName) return;
    const slug = post.PostName.toLowerCase();
    const existing = map.get(slug) ?? [];
    existing.push(post);
    map.set(slug, existing);
  });
  return Array.from(map.entries())
    .filter(([, list]) => list.length > 1)
    .map(([slug, list]) => ({ slug, posts: list }));
};

export const findMissingExcerpts = (posts: Post[]) =>
  posts.filter((post) => !post.Excerpt || post.Excerpt.trim().length < 20);

export const findShortContent = (posts: Post[], minWords = 120) =>
  posts.filter((post) => {
    const text = (post.ContentEncoded || post.CleanedHtmlSource || '').replace(/<[^>]+>/g, ' ');
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length < minWords;
  });

export const buildSeoSummary = (posts: Post[]) => {
  const onlyPosts = posts.filter((post) => post.PostType === 'post');
  return {
    totalPosts: onlyPosts.length,
    missingTitles: findMissingTitles(onlyPosts).length,
    missingExcerpts: findMissingExcerpts(onlyPosts).length,
    shortContent: findShortContent(onlyPosts).length,
    duplicateSlugs: findDuplicateSlugs(onlyPosts).length,
  };
};
