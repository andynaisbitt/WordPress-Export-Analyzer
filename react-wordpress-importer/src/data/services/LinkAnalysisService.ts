import { IndexedDbService } from './IndexedDbService';
import { buildInternalAndExternalLinks } from '../../analysis/links/linkExtractorV2';

export interface LinkAnalysisResult {
  internalLinks: any[];
  externalLinks: any[];
  stats?: {
    postsScanned: number;
    postsWithContent: number;
    htmlLinks: number;
    markdownLinks: number;
    totalLinks: number;
    unresolvedInternal: number;
    samples: string[];
    siteUrl: string;
  };
}

export class LinkAnalysisService {
  private storageKey = 'wp-links:lastPostCount';

  async scanLinks(): Promise<LinkAnalysisResult> {
    const db = new IndexedDbService();
    await db.openDatabase();
    const posts = await db.getPosts();
    const siteInfo = await db.getSiteInfo();
    const siteUrl = siteInfo.find((info) => info.Key === 'link')?.Value || '';
    return buildInternalAndExternalLinks(posts, siteUrl);
  }

  async rebuildLinks(): Promise<LinkAnalysisResult> {
    const db = new IndexedDbService();
    await db.openDatabase();
    const posts = await db.getPosts();
    const siteInfo = await db.getSiteInfo();
    const siteUrl = siteInfo.find((info) => info.Key === 'link')?.Value || '';
    const linkData = buildInternalAndExternalLinks(posts, siteUrl);

    const normalizedInternal = linkData.internalLinks.map(({ Id, ...rest }) => rest);
    const normalizedExternal = linkData.externalLinks.map(({ Id, ...rest }) => rest);

    await db.clearStore('internalLinks');
    await db.clearStore('externalLinks');
    await db.addData('internalLinks', normalizedInternal);
    await db.addData('externalLinks', normalizedExternal);

    return linkData;
  }

  async ensureLinks(): Promise<void> {
    const db = new IndexedDbService();
    await db.openDatabase();
    const posts = await db.getPosts();
    if (posts.length === 0) return;

    const internalCount = await db.getStoreCount('internalLinks');
    const externalCount = await db.getStoreCount('externalLinks');
    const lastPostCount = Number(localStorage.getItem(this.storageKey) || '0');

    if (internalCount + externalCount > 0 && lastPostCount === posts.length) return;

    await this.rebuildLinks();
    localStorage.setItem(this.storageKey, String(posts.length));
  }
}
