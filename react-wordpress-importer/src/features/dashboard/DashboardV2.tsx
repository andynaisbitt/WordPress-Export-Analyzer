import Dashboard from '../../ui/components/Dashboard';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { buildSeoSummary } from '../../analysis/seo/seoAuditV3';
import { useEffect, useState } from 'react';
import { buildInternalAndExternalLinks } from '../../analysis/links/linkExtractorV2';
import { useNavigate } from 'react-router-dom';

const DashboardV2 = () => {
  const [seoSummary, setSeoSummary] = useState({
    totalPosts: 0,
    missingTitles: 0,
    missingExcerpts: 0,
    shortContent: 0,
    duplicateSlugs: 0,
  });
  const [linkStats, setLinkStats] = useState({ internal: 0, external: 0 });
  const [linkBusy, setLinkBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSeo = async () => {
      const db = new IndexedDbService();
      await db.openDatabase();
      const posts = await db.getPosts();
      setSeoSummary(buildSeoSummary(posts));
      setLinkStats({
        internal: await db.getStoreCount('internalLinks'),
        external: await db.getStoreCount('externalLinks'),
      });
    };
    void loadSeo();
  }, []);

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
      <Dashboard />
      <section className="dashboard-section">
        <h3>SEO Snapshot</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Total Posts</h4>
            <p>{seoSummary.totalPosts}</p>
          </div>
          <div className="stat-card">
            <h4>Missing Titles</h4>
            <p>{seoSummary.missingTitles}</p>
          </div>
          <div className="stat-card">
            <h4>Missing Excerpts</h4>
            <p>{seoSummary.missingExcerpts}</p>
          </div>
          <div className="stat-card">
            <h4>Short Content</h4>
            <p>{seoSummary.shortContent}</p>
          </div>
          <div className="stat-card">
            <h4>Duplicate Slugs</h4>
            <p>{seoSummary.duplicateSlugs}</p>
          </div>
        </div>
      </section>
      <section className="dashboard-section">
        <h3>Quick Actions</h3>
        <div className="dashboard-actions">
          <button className="btn-secondary" onClick={() => navigate('/seo-audit')}>
            Open SEO Audit
          </button>
          <button className="btn-secondary" onClick={() => navigate('/content-qa')}>
            Open Content QA
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
