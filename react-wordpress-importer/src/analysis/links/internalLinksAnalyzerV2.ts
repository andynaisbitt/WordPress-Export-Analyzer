import { PostV2, InternalLinkV2 } from '../../data/db/schemaV2';
import { PostsRepoV2 } from '../../data/repositories/postsRepoV2';

// Helper function to extract all <a> tags with href attributes
export function extractAnchorLinks(content: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = [];
  const aTagRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*?>(.*?)<\/a>/g;

  let match;
  while ((match = aTagRegex.exec(content)) !== null) {
    links.push({ href: match[1], text: match[2] });
  }
  return links;
}

// Main function to analyze internal links
export async function analyzeInternalLinks(
  posts: PostV2[],
  postsRepo: PostsRepoV2,
  siteUrl: string // Base URL of the WordPress site
): Promise<InternalLinkV2[]> {
  const internalLinks: InternalLinkV2[] = [];
  const siteDomain = new URL(siteUrl).hostname;

  for (const post of posts) {
    const extractedLinks = extractAnchorLinks(post.post_content);

    for (const link of extractedLinks) {
      try {
        const linkUrl = new URL(link.href);

        // Check if it's an internal link
        if (linkUrl.hostname === siteDomain) {
          // Attempt to resolve to a post by slug or full permalink
          const slug = linkUrl.pathname.split('/').filter(Boolean).pop(); // Get last segment as potential slug

          let targetPost: PostV2 | undefined;

          if (slug) {
            // Try by slug (simplified - in real world, might need more robust slug matching)
            // This would require an index on post_name for efficient lookup
            const potentialPosts = await postsRepo.search(slug); // Using search for now, needs direct slug lookup
            targetPost = potentialPosts.find(p => p.post_name === slug);
          }

          // Fallback or more robust permalink matching could go here
          // For now, if no slug match, consider it unresolved
          
          internalLinks.push({
            source_post_id: post.wordpress_id,
            target_post_id: targetPost ? targetPost.wordpress_id : 'unresolved', // Mark as unresolved if no match
            link_text: link.text,
            link_url: link.href,
          });
        }
      } catch (error) {
        // Handle invalid URLs gracefully
        console.warn(`Could not parse URL: ${link.href} in post ${post.wordpress_id}`);
      }
    }
  }

  return internalLinks;
}
