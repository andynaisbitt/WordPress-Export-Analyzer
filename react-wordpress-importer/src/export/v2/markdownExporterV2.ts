import { PostV2, TaxonomyV2, PostMetaV2 } from '../../data/db/schemaV2';
import YAML from 'yaml'; // Will need to install yaml

function formatFrontmatter(post: PostV2, taxonomies: TaxonomyV2[], postMeta: PostMetaV2[]): string {
  const frontmatter: { [key: string]: any } = {
    title: post.post_title,
    date: post.post_date,
    slug: post.post_name,
    status: post.post_status,
    type: post.post_type,
    guid: post.guid,
    wordpress_id: post.wordpress_id,
  };

  // Add taxonomies
  taxonomies.forEach(tax => {
    if (post.terms && post.terms[tax.taxonomy_type]) {
      frontmatter[tax.taxonomy_type] = post.terms[tax.taxonomy_type];
    }
  });

  // Add custom metadata
  postMeta.forEach(meta => {
    frontmatter[meta.meta_key] = meta.meta_value;
  });

  return `---\n${YAML.stringify(frontmatter)}---\n\n`;
}

export function exportPostToMarkdown(post: PostV2, taxonomies: TaxonomyV2[], postMeta: PostMetaV2[]): string {
  const frontmatter = formatFrontmatter(post, taxonomies, postMeta);
  return `${frontmatter}${post.post_content}`;
}
