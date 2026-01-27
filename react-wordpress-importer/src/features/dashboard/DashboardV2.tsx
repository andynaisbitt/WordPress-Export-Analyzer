import Dashboard from '../../ui/components/Dashboard';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { buildSeoSummary } from '../../analysis/seo/seoAuditV3';
import { useEffect, useState } from 'react';

const DashboardV2 = () => {
  const [seoSummary, setSeoSummary] = useState({
    totalPosts: 0,
    missingTitles: 0,
    missingExcerpts: 0,
    shortContent: 0,
    duplicateSlugs: 0,
  });

  useEffect(() => {
    const loadSeo = async () => {
      const db = new IndexedDbService();
      await db.openDatabase();
      const posts = await db.getPosts();
      setSeoSummary(buildSeoSummary(posts));
    };
    void loadSeo();
  }, []);

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
    </div>
  );
};

export default DashboardV2;
