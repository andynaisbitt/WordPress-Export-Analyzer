import { useEffect, useMemo, useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { buildSeoAuditReportV2 } from '../../analysis/seo/seoAuditInsightsV2';
import { normalizeSeoForPosts } from '../../analysis/seo/seoNormalizerV2';
import { Post } from '../../core/domain/types/Post';
import { PostMeta } from '../../core/domain/types/PostMeta';

const SeoAuditScreenV2 = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postMeta, setPostMeta] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const db = new IndexedDbService();
      await db.openDatabase();
      const [loadedPosts, loadedMeta] = await Promise.all([db.getPosts(), db.getPostMeta()]);
      setPosts(loadedPosts);
      setPostMeta(loadedMeta);
      setLoading(false);
    };
    void load();
  }, []);

  const normalizedReport = useMemo(() => normalizeSeoForPosts(posts, postMeta), [posts, postMeta]);
  const auditReport = useMemo(() => buildSeoAuditReportV2(normalizedReport), [normalizedReport]);
  const summary = auditReport.summary;
  const lists = auditReport.lists;
  const [previewId, setPreviewId] = useState<number | null>(null);

  useEffect(() => {
    if (!previewId && normalizedReport.entries.length > 0) {
      setPreviewId(normalizedReport.entries[0].postId);
    }
  }, [normalizedReport.entries, previewId]);

  const previewEntry = useMemo(
    () => normalizedReport.entries.find((entry) => entry.postId === previewId) ?? normalizedReport.entries[0],
    [normalizedReport.entries, previewId]
  );

  if (loading) {
    return <div>Loading SEO audit...</div>;
  }

  return (
    <div className="seo-audit">
      <div className="seo-header">
        <div>
          <h2>SEO Audit</h2>
          <p>Normalized SEO data for Yoast/AIOSEO with warnings and social checks.</p>
          <div className="seo-plugin-row">
            <span>Yoast: {normalizedReport.pluginUsage.yoast ? 'Detected' : 'Not detected'}</span>
            <span>AIOSEO: {normalizedReport.pluginUsage.aioseo ? 'Detected' : 'Not detected'}</span>
          </div>
        </div>
        <div className="seo-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              const blob = new Blob([JSON.stringify(normalizedReport.entries, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `seo-normalized-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            Download SEO JSON
          </button>
        </div>
      </div>

      {normalizedReport.warnings.length > 0 && (
        <div className="seo-warning">
          {normalizedReport.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Posts</h4>
          <p>{summary.total}</p>
        </div>
        <div className="stat-card">
          <h4>Missing Titles</h4>
          <p>{summary.missingTitle}</p>
        </div>
        <div className="stat-card">
          <h4>Missing Descriptions</h4>
          <p>{summary.missingDescription}</p>
        </div>
        <div className="stat-card">
          <h4>Missing Canonical</h4>
          <p>{summary.missingCanonical}</p>
        </div>
        <div className="stat-card">
          <h4>Missing OG Image</h4>
          <p>{summary.missingOpenGraphImage}</p>
        </div>
        <div className="stat-card">
          <h4>Missing Twitter Title</h4>
          <p>{summary.missingTwitterTitle}</p>
        </div>
        <div className="stat-card">
          <h4>Missing Focus Keywords</h4>
          <p>{summary.missingFocusKeyword}</p>
        </div>
        <div className="stat-card">
          <h4>NoIndex</h4>
          <p>{summary.noIndexCount}</p>
        </div>
        <div className="stat-card">
          <h4>Low Readability</h4>
          <p>{summary.lowReadability}</p>
        </div>
        <div className="stat-card">
          <h4>Schema Missing</h4>
          <p>{summary.schemaMissing}</p>
        </div>
      </div>

      {previewEntry && (
        <div className="seo-preview">
          <div className="seo-preview-header">
            <h3>Social Preview</h3>
            <select value={previewEntry.postId} onChange={(event) => setPreviewId(Number(event.target.value))}>
              {normalizedReport.entries.slice(0, 50).map((entry) => (
                <option key={entry.postId} value={entry.postId}>
                  {entry.title}
                </option>
              ))}
            </select>
          </div>
          <div className="seo-preview-card">
            {previewEntry.seo.openGraph.image ? (
              <img src={previewEntry.seo.openGraph.image} alt="Social preview" />
            ) : (
              <div className="seo-preview-placeholder">No OpenGraph image</div>
            )}
            <div>
              <h4>{previewEntry.seo.openGraph.title || previewEntry.seo.title}</h4>
              <p>{previewEntry.seo.description}</p>
              <span>{previewEntry.seo.canonical || `/${previewEntry.slug}`}</span>
            </div>
          </div>
        </div>
      )}

      <div className="seo-lists">
        <div className="seo-list">
          <h3>Missing Titles</h3>
          <ul>
            {lists.missingTitle.map((entry) => (
              <li key={entry.postId}>{entry.slug || entry.postId}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Missing Descriptions</h3>
          <ul>
            {lists.missingDescription.map((entry) => (
              <li key={entry.postId}>{entry.title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Missing Canonical</h3>
          <ul>
            {lists.missingCanonical.map((entry) => (
              <li key={entry.postId}>{entry.title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Missing OG Image</h3>
          <ul>
            {lists.missingOpenGraphImage.map((entry) => (
              <li key={entry.postId}>{entry.title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Missing Twitter Title</h3>
          <ul>
            {lists.missingTwitterTitle.map((entry) => (
              <li key={entry.postId}>{entry.title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Missing Focus Keywords</h3>
          <ul>
            {lists.missingFocusKeyword.map((entry) => (
              <li key={entry.postId}>{entry.title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>NoIndex</h3>
          <ul>
            {lists.noIndex.map((entry) => (
              <li key={entry.postId}>{entry.title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Low Readability</h3>
          <ul>
            {lists.lowReadability.map((entry) => (
              <li key={entry.postId}>{entry.title}</li>
            ))}
          </ul>
        </div>
        <div className="seo-list">
          <h3>Schema Missing</h3>
          <ul>
            {lists.schemaMissing.map((entry) => (
              <li key={entry.postId}>{entry.title}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SeoAuditScreenV2;
