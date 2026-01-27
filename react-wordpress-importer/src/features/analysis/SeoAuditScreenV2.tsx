import { useEffect, useMemo, useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { buildSeoSummary, findDuplicateSlugs, findMissingExcerpts, findMissingMetaDescription, findMissingTitles, findShortContent } from '../../analysis/seo/seoAuditV3';
import { Post } from '../../core/domain/types/Post';

const SeoAuditScreenV2 = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const db = new IndexedDbService();
      await db.openDatabase();
      setPosts(await db.getPosts());
      setLoading(false);
    };
    void load();
  }, []);

  const summary = useMemo(() => buildSeoSummary(posts), [posts]);
  const missingTitles = useMemo(() => findMissingTitles(posts.filter((p) => p.PostType === 'post')), [posts]);
  const missingExcerpts = useMemo(() => findMissingExcerpts(posts.filter((p) => p.PostType === 'post')), [posts]);
  const missingMeta = useMemo(() => findMissingMetaDescription(posts.filter((p) => p.PostType === 'post')), [posts]);
  const shortContent = useMemo(() => findShortContent(posts.filter((p) => p.PostType === 'post')), [posts]);
  const duplicateSlugs = useMemo(() => findDuplicateSlugs(posts.filter((p) => p.PostType === 'post')), [posts]);

  if (loading) {
    return <div>Loading SEO audit...</div>;
  }

  return (
    <div className="seo-audit">
      <h2>SEO Audit</h2>
      <p>Quick SEO health checks across your WordPress export.</p>

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Posts</h4>
          <p>{summary.totalPosts}</p>
        </div>
        <div className="stat-card">
          <h4>Missing Titles</h4>
          <p>{summary.missingTitles}</p>
        </div>
        <div className="stat-card">
          <h4>Missing Excerpts</h4>
          <p>{summary.missingExcerpts}</p>
        </div>
        <div className="stat-card">
          <h4>Missing Meta Desc</h4>
          <p>{summary.missingMetaDescription}</p>
        </div>
        <div className="stat-card">
          <h4>Short Content</h4>
          <p>{summary.shortContent}</p>
        </div>
        <div className="stat-card">
          <h4>Duplicate Slugs</h4>
          <p>{summary.duplicateSlugs}</p>
        </div>
      </div>

      <div className="seo-lists">
        <div className="seo-list">
          <h3>Missing Titles</h3>
          <ul>
            {missingTitles.map((post) => (
              <li key={post.PostId}>{post.PostName || post.PostId}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Missing Excerpts</h3>
          <ul>
            {missingExcerpts.map((post) => (
              <li key={post.PostId}>{post.Title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Missing Meta Descriptions</h3>
          <ul>
            {missingMeta.map((post) => (
              <li key={post.PostId}>{post.Title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Short Content</h3>
          <ul>
            {shortContent.map((post) => (
              <li key={post.PostId}>{post.Title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Duplicate Slugs</h3>
          <ul>
            {duplicateSlugs.map((dup) => (
              <li key={dup.slug}>{dup.slug} ({dup.posts.length})</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SeoAuditScreenV2;
