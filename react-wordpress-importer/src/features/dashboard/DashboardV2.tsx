import { IndexedDbService } from '../../data/services/IndexedDbService';
import { useEffect, useMemo, useState } from 'react';
import { buildInternalAndExternalLinks } from '../../analysis/links/linkExtractorV2';
import { useNavigate } from 'react-router-dom';
import { detectPluginsFromPostMeta } from '../../analysis/plugins/pluginDetectorV2';
import { normalizeSeoForPosts } from '../../analysis/seo/seoNormalizerV2';
import { buildSeoAuditReportV2 } from '../../analysis/seo/seoAuditInsightsV2';
import { Post } from '../../core/domain/types/Post';
import { PostMeta } from '../../core/domain/types/PostMeta';
import { SiteInfo } from '../../core/domain/types/SiteInfo';

const DashboardV2 = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postMeta, setPostMeta] = useState<PostMeta[]>([]);
  const [siteInfo, setSiteInfo] = useState<SiteInfo[]>([]);
  const [linkStats, setLinkStats] = useState({ internal: 0, external: 0 });
  const [linkBusy, setLinkBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSeo = async () => {
      const db = new IndexedDbService();
      await db.openDatabase();
      const [loadedPosts, loadedMeta, loadedSite] = await Promise.all([
        db.getPosts(),
        db.getPostMeta(),
        db.getSiteInfo(),
      ]);
      setPosts(loadedPosts);
      setPostMeta(loadedMeta);
      setSiteInfo(loadedSite);
      setLinkStats({
        internal: await db.getStoreCount('internalLinks'),
        external: await db.getStoreCount('externalLinks'),
      });
    };
    void loadSeo();
  }, []);

  const normalizedReport = useMemo(() => normalizeSeoForPosts(posts, postMeta), [posts, postMeta]);
  const seoReport = useMemo(() => buildSeoAuditReportV2(normalizedReport), [normalizedReport]);
  const pluginReport = useMemo(() => detectPluginsFromPostMeta(postMeta), [postMeta]);

  const siteTitle = siteInfo.find((info) => info.Key === 'title')?.Value || 'Untitled site';
  const siteDescription = siteInfo.find((info) => info.Key === 'description')?.Value || 'No description';
  const totalPosts = posts.filter((post) => post.PostType === 'post').length;
  const totalPages = posts.filter((post) => post.PostType === 'page').length;
  const totalAttachments = posts.filter((post) => post.PostType === 'attachment').length;

  const rebuildLinks = async () => {
    setLinkBusy(true);
    const db = new IndexedDbService();
    await db.openDatabase();
    const posts = await db.getPosts();
    const siteInfo = await db.getSiteInfo();
    const siteUrl = siteInfo.find((info) => info.Key === 'link')?.Value || '';
    const linkData = buildInternalAndExternalLinks(posts, siteUrl);
    await db.clearStore('internalLinks');
    await db.clearStore('externalLinks');
    await db.addData('internalLinks', linkData.internalLinks);
    await db.addData('externalLinks', linkData.externalLinks);
    setLinkStats({
      internal: linkData.internalLinks.length,
      external: linkData.externalLinks.length,
    });
    setLinkBusy(false);
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-kicker">Migration Control</p>
          <h2>{siteTitle}</h2>
          <p className="dashboard-subtitle">{siteDescription}</p>
        </div>
        <div className="dashboard-hero-card">
          <h4>Content Inventory</h4>
          <div className="status-meta">
            <span>Posts: {totalPosts}</span>
            <span>Pages: {totalPages}</span>
            <span>Media: {totalAttachments}</span>
          </div>
          <p className={`status-pill ${totalPosts + totalPages > 0 ? 'status-live' : 'status-idle'}`}>
            {totalPosts + totalPages > 0 ? 'Import detected' : 'Awaiting XML import'}
          </p>
        </div>
      </section>

      <section className="dashboard-section">
        <h3>SEO Health</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Missing Titles</h4>
            <p>{seoReport.summary.missingTitle}</p>
          </div>
          <div className="stat-card">
            <h4>Missing Descriptions</h4>
            <p>{seoReport.summary.missingDescription}</p>
          </div>
          <div className="stat-card">
            <h4>Missing Canonical</h4>
            <p>{seoReport.summary.missingCanonical}</p>
          </div>
          <div className="stat-card">
            <h4>Missing OG Image</h4>
            <p>{seoReport.summary.missingOpenGraphImage}</p>
          </div>
          <div className="stat-card">
            <h4>Schema Missing</h4>
            <p>{seoReport.summary.schemaMissing}</p>
          </div>
          <div className="stat-card">
            <h4>NoIndex Posts</h4>
            <p>{seoReport.summary.noIndexCount}</p>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h3>Plugin Signals</h3>
        {pluginReport.plugins.length === 0 ? (
          <p>No plugin signals detected in post meta.</p>
        ) : (
          <div className="plugin-grid">
            {pluginReport.plugins.map((plugin) => (
              <div key={plugin.id} className="plugin-card">
                <h4>{plugin.name}</h4>
                <p>{plugin.description}</p>
                <div className="plugin-meta">Keys found: {plugin.evidenceCount}</div>
                <div className="plugin-keys">{plugin.sampleKeys.join(', ')}</div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="dashboard-section">
        <h3>Quick Actions</h3>
        <div className="dashboard-actions">
          <button className="btn-secondary" onClick={() => navigate('/seo-audit')}>
            Open SEO Audit
          </button>
          <button className="btn-secondary" onClick={() => navigate('/post-meta')}>
            Open Post Meta
          </button>
          <button className="btn-secondary" onClick={() => navigate('/remediation')}>
            Open Remediation
          </button>
          <button className="btn-secondary" onClick={() => navigate('/content-qa')}>
            Open Content QA
          </button>
          <button className="btn-secondary" onClick={() => navigate('/knowledge-graph')}>
            Knowledge Graph
          </button>
          <button className="btn-secondary" onClick={() => navigate('/internal-links')}>
            Internal Links ({linkStats.internal})
          </button>
          <button className="btn-secondary" onClick={() => navigate('/external-links')}>
            External Links ({linkStats.external})
          </button>
          <button className="btn-primary" onClick={rebuildLinks} disabled={linkBusy}>
            {linkBusy ? 'Rebuilding Links...' : 'Rebuild Links Now'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default DashboardV2;
