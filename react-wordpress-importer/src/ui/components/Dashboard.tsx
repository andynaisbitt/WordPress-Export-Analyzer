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

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <div className="site-info">
        <h3>Site Information</h3>
        <p><strong>Title:</strong> {siteTitle}</p>
        <p><strong>Description:</strong> {siteDescription}</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Posts</h4>
          <p>{postCount}</p>
        </div>
        <div className="stat-card">
          <h4>Total Pages</h4>
          <p>{pageCount}</p>
        </div>
        <div className="stat-card">
          <h4>Total Categories</h4>
          <p>{categoryCount}</p>
        </div>
        <div className="stat-card">
          <h4>Total Tags</h4>
          <p>{tagCount}</p>
        </div>
        <div className="stat-card">
          <h4>Total Authors</h4>
          <p>{authorCount}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
