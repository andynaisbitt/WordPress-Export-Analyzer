import { useEffect, useMemo, useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { buildSeoAuditReportV2, buildSeoIssueRows, SeoIssueRow } from '../../analysis/seo/seoAuditInsightsV2';
import { normalizeSeoForPosts } from '../../analysis/seo/seoNormalizerV2';
import { extractJsonLdSchemas } from '../../analysis/seo/schemaExtractor';
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
  const [issueFilter, setIssueFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [issueQuery, setIssueQuery] = useState('');

  useEffect(() => {
    if (!previewId && normalizedReport.entries.length > 0) {
      setPreviewId(normalizedReport.entries[0].postId);
    }
  }, [normalizedReport.entries, previewId]);

  const previewEntry = useMemo(
    () => normalizedReport.entries.find((entry) => entry.postId === previewId) ?? normalizedReport.entries[0],
    [normalizedReport.entries, previewId]
  );

  const issueRows = useMemo(() => buildSeoIssueRows(normalizedReport), [normalizedReport]);
  const filteredRows = useMemo(() => {
    const severityFiltered = issueFilter === 'all'
      ? issueRows
      : issueRows.filter((row) => row.severity === issueFilter);
    if (!issueQuery) return severityFiltered;
    const needle = issueQuery.toLowerCase();
    return severityFiltered.filter((row) =>
      row.title.toLowerCase().includes(needle) ||
      row.slug.toLowerCase().includes(needle) ||
      row.issues.some((issue) => issue.toLowerCase().includes(needle))
    );
  }, [issueRows, issueFilter, issueQuery]);

  const exportIssueCsv = (rows: SeoIssueRow[]) => {
    const headers = ['post_id', 'title', 'slug', 'source', 'score', 'severity', 'issues'];
    const lines = rows.map((row) => [
      row.postId,
      `"${row.title.replace(/"/g, '""')}"`,
      row.slug,
      row.source,
      row.score,
      row.severity,
      `"${row.issues.join('; ').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...lines.map((line) => line.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seo-issues-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
              const schemaPack = posts.map((post) => ({
                postId: post.PostId,
                slug: post.PostName || '',
                schemas: extractJsonLdSchemas(post.ContentEncoded || post.CleanedHtmlSource || ''),
              }));
              const blob = new Blob([JSON.stringify(schemaPack, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `schema-pack-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            Download Schema Pack
          </button>
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

      <div className="seo-issues">
        <div className="seo-issues-header">
          <div>
            <h3>SEO Issue Ledger</h3>
            <p>Every post scored with severity and exact reasons.</p>
          </div>
          <div className="seo-issues-actions">
            <input
              type="text"
              placeholder="Filter issues (e.g. canonical)"
              value={issueQuery}
              onChange={(event) => setIssueQuery(event.target.value)}
            />
            <button className="btn-secondary" onClick={() => exportIssueCsv(filteredRows)}>
              Export CSV
            </button>
          </div>
        </div>
        <div className="seo-issues-filters">
          {(['all', 'high', 'medium', 'low'] as const).map((level) => (
            <button
              key={level}
              className={`btn-secondary${issueFilter === level ? ' qa-active' : ''}`}
              onClick={() => setIssueFilter(level)}
            >
              {level}
            </button>
          ))}
        </div>
        <table>
          <thead>
            <tr>
              <th>Score</th>
              <th>Severity</th>
              <th>Title</th>
              <th>Slug</th>
              <th>Source</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.postId}>
                <td>{row.score}</td>
                <td>{row.severity}</td>
                <td>{row.title}</td>
                <td>{row.slug}</td>
                <td>{row.source}</td>
                <td>{row.issues.join(', ') || 'OK'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
