import TurndownService from 'turndown';
import { Post } from '../core/domain/types/Post';

export const cleanWordpressHtml = (html: string) => {
  return html
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim();
};

export const htmlToMarkdown = (html: string) => {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });
  const cleaned = cleanWordpressHtml(html);
  return turndown.turndown(cleaned).replace(/\n{3,}/g, '\n\n').trim();
};

export const buildMarkdownForPost = (post: Post) => {
  const html = post.ContentEncoded || post.CleanedHtmlSource || '';
  return htmlToMarkdown(html);
};

export const applyMarkdownToPosts = (posts: Post[]) => {
  return posts.map((post) => ({
    ...post,
    Markdown: buildMarkdownForPost(post),
  }));
};
