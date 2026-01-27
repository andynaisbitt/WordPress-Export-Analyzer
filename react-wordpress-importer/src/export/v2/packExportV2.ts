import { buildMediaManifest } from '../../analysis/manifest/mediaManifestV2';
import { openDbV2 } from '../../data/db/openDbV2';
import { PostsRepoV2 } from '../../data/repositories/postsRepoV2';
import { AttachmentsRepoV2 } from '../../data/repositories/attachmentsRepoV2';

interface FastReactCMSPackage {
  'posts.json': any;
  'mediaManifest.json': any;
  'taxonomy.json': any;
}

export async function createFastReactCMSPackage(): Promise<FastReactCMSPackage> {
  const postsRepo = new PostsRepoV2();
  const attachmentsRepo = new AttachmentsRepoV2();
  // const taxonomyRepo = new TaxonomyRepoV2(); // Assuming TaxonomyRepoV2 exists

  const allPosts = await postsRepo.list();
  const allAttachments = await attachmentsRepo.list();
  // const allTaxonomy = await taxonomyRepo.list(); // Assuming list method exists

  const mediaManifest = buildMediaManifest(allPosts, allAttachments);

  // For taxonomy, we'll just get all taxonomy records from the DB for now.
  // In a real scenario, you might want to filter or format this.
  const db = await openDbV2();
  const allTaxonomy = await db.getAll('taxonomyV2');


  const postsJson = allPosts; // Or format as needed
  const mediaManifestJson = mediaManifest;
  const taxonomyJson = allTaxonomy;

  return {
    'posts.json': postsJson,
    'mediaManifest.json': mediaManifestJson,
    'taxonomy.json': taxonomyJson,
  };
}
