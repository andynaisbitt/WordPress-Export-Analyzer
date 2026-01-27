// react-wordpress-importer/src/components/Dashboard.tsx

import React, { useEffect, useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { SiteInfo } from '../../core/domain/types/SiteInfo';
import { Post } from '../../core/domain/types/Post';

const Dashboard: React.FC = () => {
  const [siteInfo, setSiteInfo] = useState<SiteInfo[]>([]);
  const [postCount, setPostCount] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(0);
  const [categoryCount, setCategoryCount] = useState<number>(0);
  const [tagCount, setTagCount] = useState<number>(0);
  const [authorCount, setAuthorCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();

        const fetchedSiteInfo = await dbService.getSiteInfo();
        setSiteInfo(fetchedSiteInfo);

        const allPosts = await dbService.getPosts();
        setPostCount(allPosts.filter((p: Post) => p.PostType === 'post').length);
        setPageCount(allPosts.filter((p: Post) => p.PostType === 'page').length);

        setCategoryCount((await dbService.getCategories()).length);
        setTagCount((await dbService.getTags()).length);
        setAuthorCount((await dbService.getAuthors()).length);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <p>Loading dashboard data...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  const siteTitle = siteInfo.find(info => info.Key === 'title')?.Value || 'N/A';
  const siteDescription = siteInfo.find(info => info.Key === 'description')?.Value || 'N/A';

  const totalContent = postCount + pageCount;
  const hasImport = totalContent > 0;

  return (
    <div className="dashboard-container">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-kicker">Site Snapshot</p>
          <h2>{siteTitle}</h2>
          <p className="dashboard-subtitle">{siteDescription}</p>
        </div>
        <div className="dashboard-hero-card">
          <h4>Import Status</h4>
          <p className={`status-pill ${hasImport ? 'status-live' : 'status-idle'}`}>
            {hasImport ? 'Content loaded' : 'Waiting for XML import'}
          </p>
          <div className="status-meta">
            <span>Posts: {postCount}</span>
            <span>Pages: {pageCount}</span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="stat-card large">
          <h4>Total Content</h4>
          <p>{totalContent}</p>
          <span>Posts + pages</span>
        </div>
        <div className="stat-card">
          <h4>Posts</h4>
          <p>{postCount}</p>
          <span>Blog entries</span>
        </div>
        <div className="stat-card">
          <h4>Pages</h4>
          <p>{pageCount}</p>
          <span>Static pages</span>
        </div>
        <div className="stat-card">
          <h4>Categories</h4>
          <p>{categoryCount}</p>
          <span>Taxonomy groups</span>
        </div>
        <div className="stat-card">
          <h4>Tags</h4>
          <p>{tagCount}</p>
          <span>Topic labels</span>
        </div>
        <div className="stat-card">
          <h4>Authors</h4>
          <p>{authorCount}</p>
          <span>Contributors</span>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
