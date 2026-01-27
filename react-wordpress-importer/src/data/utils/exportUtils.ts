// react-wordpress-importer/src/utils/exportUtils.ts

import { IndexedDbService } from '../services/IndexedDbService';
import TurndownService from 'turndown'; // Import TurndownService

export async function exportAllDataToJson(showToast: (message: string, type?: 'success' | 'error' | 'info') => void): Promise<void> {
  const dbService = new IndexedDbService();
  await dbService.openDatabase();

  const allData: { [key: string]: any[] } = {};

  // Fetch all data from each object store
  allData.posts = await dbService.getAllData('posts');
  allData.categories = await dbService.getAllData('categories');
  allData.tags = await dbService.getAllData('tags');
  allData.authors = await dbService.getAllData('authors');
  allData.comments = await dbService.getAllData('comments');
  allData.attachments = await dbService.getAllData('attachments');
  allData.internalLinks = await dbService.getAllData('internalLinks');
  allData.postMeta = await dbService.getAllData('postMeta');
  allData.siteInfo = await dbService.getAllData('siteInfo');

  const jsonString = JSON.stringify(allData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wordpress_export_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('All data exported to JSON successfully!', 'success');
}

export async function exportPostsToMarkdown(showToast: (message: string, type?: 'success' | 'error' | 'info') => void): Promise<void> {
  const dbService = new IndexedDbService();
  await dbService.openDatabase();

  const posts = await dbService.getPosts();
  const turndownService = new TurndownService();

  let markdownContent = `# WordPress Posts Export\n\n`;

  for (const post of posts) {
    markdownContent += `---\n`;
    markdownContent += `title: ${post.Title}\n`;
    markdownContent += `date: ${post.PostDate ? new Date(post.PostDate).toISOString() : 'N/A'}\n`;
    markdownContent += `author: ${post.Creator}\n`;
    markdownContent += `status: ${post.Status}\n`;
    markdownContent += `---\n\n`;
    markdownContent += turndownService.turndown(post.ContentEncoded || post.CleanedHtmlSource || '');
    markdownContent += `\n\n`;
  }

  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wordpress_posts_${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Posts exported to Markdown successfully!', 'success');
}
