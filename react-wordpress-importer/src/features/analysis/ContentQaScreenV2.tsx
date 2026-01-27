import { useEffect, useMemo, useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { buildContentQaReport, ContentIssue } from '../../analysis/contentQaV2';

const ContentQaScreenV2 = () => {
  const [issues, setIssues] = useState<ContentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const db = new IndexedDbService();
      await db.openDatabase();
      const posts = await db.getPosts();
      const report = buildContentQaReport(posts);
      setIssues(report.issues);
      setLoading(false);
    };
    void load();
  }, []);

  const summary = useMemo(() => {
    const total = issues.length;
    return {
      total,
      high: issues.filter((issue) => issue.severity === 'high').length,
      medium: issues.filter((issue) => issue.severity === 'medium').length,
      low: issues.filter((issue) => issue.severity === 'low').length,
    };
  }, [issues]);

  const filtered = useMemo(() => {
    if (filter === 'all') return issues;
    return issues.filter((issue) => issue.severity === filter);
  }, [issues, filter]);

  const downloadCsv = () => {
    const headers = [
      'post_id',
      'title',
      'slug',
      'severity',
      'issues',
      'word_count',
      'link_count',
      'image_count',
      'heading_count',
      'shortcodes',
      'gutenberg_comments',
    ];
    const rows = filtered.map((issue) => [
      issue.postId,
      `"${issue.title.replace(/"/g, '""')}"`,
      issue.slug,
      issue.severity,
      `"${issue.issues.join('; ').replace(/"/g, '""')}"`,
      issue.wordCount,
      issue.linkCount,
      issue.imageCount,
      issue.headingCount,
      issue.hasShortcodes ? 'yes' : 'no',
      issue.hasWpComments ? 'yes' : 'no',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `content-qa-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div>Running content QA analysis...</div>;
  }

  return (
    <div className="qa-screen">
      <div className="qa-header">
        <div>
          <h2>Content QA</h2>
          <p>Find posts with formatting problems, missing metadata, or risky patterns.</p>
        </div>
        <button className="btn-secondary" onClick={downloadCsv}>
          Export QA CSV
        </button>
      </div>

      <div className="qa-summary">
        <span>Total flagged: {summary.total}</span>
        <span>High: {summary.high}</span>
        <span>Medium: {summary.medium}</span>
        <span>Low: {summary.low}</span>
      </div>

      <div className="qa-filters">
        {(['all', 'high', 'medium', 'low'] as const).map((level) => (
          <button
            key={level}
            className={`btn-secondary${filter === level ? ' qa-active' : ''}`}
            onClick={() => setFilter(level)}
          >
            {level}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p>No issues for this filter.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Slug</th>
              <th>Severity</th>
              <th>Issues</th>
              <th>Words</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((issue) => (
              <tr key={`${issue.postId}-${issue.severity}`}>
                <td>{issue.postId}</td>
                <td>{issue.title}</td>
                <td>{issue.slug}</td>
                <td>{issue.severity}</td>
                <td>{issue.issues.join(', ')}</td>
                <td>{issue.wordCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ContentQaScreenV2;
