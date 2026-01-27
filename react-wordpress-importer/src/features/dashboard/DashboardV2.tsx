import { IndexedDbService } from '../../data/services/IndexedDbService';
import { useEffect, useMemo, useState } from 'react';
import { buildInternalAndExternalLinks } from '../../analysis/links/linkExtractorV2';
import { useNavigate } from 'react-router-dom';
import { detectPluginsFromPostMeta } from '../../analysis/plugins/pluginDetectorV2';
import { normalizeSeoForPosts } from '../../analysis/seo/seoNormalizerV2';
import { buildSeoAuditReportV2, buildSeoIssueRows } from '../../analysis/seo/seoAuditInsightsV2';
import { Post } from '../../core/domain/types/Post';
import { PostMeta } from '../../core/domain/types/PostMeta';
import { SiteInfo } from '../../core/domain/types/SiteInfo';
import { buildContentQaReport } from '../../analysis/contentQaV2';
import { buildGraphInsights } from '../../analysis/graph/graphInsightsV2';
import { InternalLink } from '../../core/domain/types/InternalLink';
import { ExternalLink } from '../../core/domain/types/ExternalLink';

const DashboardV2 = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postMeta, setPostMeta] = useState<PostMeta[]>([]);
  const [siteInfo, setSiteInfo] = useState<SiteInfo[]>([]);
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [categoryCount, setCategoryCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);
  const [authorCount, setAuthorCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [linkStats, setLinkStats] = useState({ internal: 0, external: 0 });
  const [linkBusy, setLinkBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSeo = async () => {
      const db = new IndexedDbService();
      await db.openDatabase();
      const [
        loadedPosts,
        loadedMeta,
        loadedSite,
        loadedInternalLinks,
        loadedExternalLinks,
        loadedCategories,
        loadedTags,
        loadedAuthors,
        loadedComments,
        loadedAttachments,
      ] = await Promise.all([
        db.getPosts(),
        db.getPostMeta(),
        db.getSiteInfo(),
        db.getInternalLinks(),
        db.getExternalLinks(),
        db.getCategories(),
        db.getTags(),
        db.getAuthors(),
        db.getComments(),
        db.getAttachments(),
      ]);
      setPosts(loadedPosts);
      setPostMeta(loadedMeta);
      setSiteInfo(loadedSite);
      setInternalLinks(loadedInternalLinks);
      setExternalLinks(loadedExternalLinks);
      setCategoryCount(loadedCategories.length);
      setTagCount(loadedTags.length);
      setAuthorCount(loadedAuthors.length);
      setCommentCount(loadedComments.length);
      setAttachmentCount(loadedAttachments.length);
      setLinkStats({
        internal: await db.getStoreCount('internalLinks'),
        external: await db.getStoreCount('externalLinks'),
      });
    };
    void loadSeo();
  }, []);

  const normalizedReport = useMemo(() => normalizeSeoForPosts(posts, postMeta), [posts, postMeta]);
  const seoReport = useMemo(() => buildSeoAuditReportV2(normalizedReport), [normalizedReport]);
  const seoIssueRows = useMemo(() => buildSeoIssueRows(normalizedReport), [normalizedReport]);
  const pluginReport = useMemo(() => detectPluginsFromPostMeta(postMeta), [postMeta]);
  const qaReport = useMemo(() => buildContentQaReport(posts), [posts]);
  const linkInsights = useMemo(() => buildGraphInsights(posts, internalLinks), [posts, internalLinks]);

  const worstSeo = useMemo(
    () => [...seoIssueRows].sort((a, b) => a.score - b.score).slice(0, 6),
    [seoIssueRows]
  );

  const migrationScore = useMemo(() => {
    if (seoIssueRows.length === 0) return 0;
    const avgScore = seoIssueRows.reduce((sum, row) => sum + row.score, 0) / seoIssueRows.length;
    const qaPenalty = qaReport.summary.high * 4 + qaReport.summary.medium * 2;
    const linkPenalty = linkInsights.orphanPosts.length * 1.5;
    const score = Math.max(0, Math.min(100, avgScore - qaPenalty * 0.2 - linkPenalty * 0.1));
    return Math.round(score);
  }, [seoIssueRows, qaReport.summary, linkInsights.orphanPosts.length]);

  const siteTitle = siteInfo.find((info) => info.Key === 'title')?.Value || 'Untitled site';
  const siteDescription = siteInfo.find((info) => info.Key === 'description')?.Value || 'No description';
  const totalPosts = posts.filter((post) => post.PostType === 'post').length;
  const totalPages = posts.filter((post) => post.PostType === 'page').length;
  const totalAttachments = attachmentCount || posts.filter((post) => post.PostType === 'attachment').length;

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
          <div className="dashboard-score">
            <span>Migration readiness</span>
            <div className="score-bar">
              <div className="score-fill" style={{ width: `${migrationScore}%` }} />
            </div>
            <strong>{migrationScore}/100</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h3>Core Counts</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Categories</h4>
            <p>{categoryCount}</p>
          </div>
          <div className="stat-card">
            <h4>Tags</h4>
            <p>{tagCount}</p>
          </div>
          <div className="stat-card">
            <h4>Authors</h4>
            <p>{authorCount}</p>
          </div>
          <div className="stat-card">
            <h4>Comments</h4>
            <p>{commentCount}</p>
          </div>
          <div className="stat-card">
            <h4>Internal Links</h4>
            <p>{linkStats.internal}</p>
          </div>
          <div className="stat-card">
            <h4>External Links</h4>
            <p>{linkStats.external}</p>
          </div>
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
        <h3>Critical SEO Risks</h3>
        <div className="dashboard-panels">
          <div className="panel-card">
            <h4>Worst scoring posts</h4>
            <ul className="panel-list">
              {worstSeo.map((row) => (
                <li key={row.postId}>
                  <span>{row.title}</span>
                  <span className={`risk-pill risk-${row.severity}`}>{row.score}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel-card">
            <h4>Content QA</h4>
            <div className="panel-metric">
              <span>Total issues</span>
              <strong>{qaReport.summary.totalIssues}</strong>
            </div>
            <div className="panel-metric">
              <span>High severity</span>
              <strong>{qaReport.summary.high}</strong>
            </div>
            <div className="panel-metric">
              <span>Medium severity</span>
              <strong>{qaReport.summary.medium}</strong>
            </div>
            <div className="panel-metric">
              <span>Low severity</span>
              <strong>{qaReport.summary.low}</strong>
            </div>
          </div>
          <div className="panel-card">
            <h4>Link Health</h4>
            <div className="panel-metric">
              <span>Orphan posts</span>
              <strong>{linkInsights.orphanPosts.length}</strong>
            </div>
            <div className="panel-metric">
              <span>Avg inbound</span>
              <strong>{linkInsights.avgInbound.toFixed(1)}</strong>
            </div>
            <div className="panel-metric">
              <span>Avg outbound</span>
              <strong>{linkInsights.avgOutbound.toFixed(1)}</strong>
            </div>
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
