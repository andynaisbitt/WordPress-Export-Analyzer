import React, { useEffect, useMemo, useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { ExternalLink } from '../../core/domain/types/ExternalLink';
import { buildInternalAndExternalLinks } from '../../analysis/links/linkExtractorV2';

const ExternalLinksView: React.FC = () => {
  const [allLinks, setAllLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    const fetchLinks = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetched = await dbService.getExternalLinks();
        setAllLinks(fetched);
      } catch (err) {
        console.error('Error fetching external links:', err);
        setError('Failed to load external links.');
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  const rebuildLinks = async () => {
    setRebuilding(true);
    try {
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const posts = await dbService.getPosts();
      const siteInfo = await dbService.getSiteInfo();
      const siteUrl = siteInfo.find((info) => info.Key === 'link')?.Value || '';
      const linkData = buildInternalAndExternalLinks(posts, siteUrl);
      await dbService.clearStore('internalLinks');
      await dbService.clearStore('externalLinks');
      await dbService.addData('internalLinks', linkData.internalLinks);
      await dbService.addData('externalLinks', linkData.externalLinks);
      const refreshed = await dbService.getExternalLinks();
      setAllLinks(refreshed);
    } catch (err) {
      console.error('Error rebuilding links:', err);
      setError('Failed to rebuild links.');
    } finally {
      setRebuilding(false);
    }
  };

  const downloadCsv = () => {
    const headers = ['id', 'source_post_id', 'source_title', 'anchor_text', 'url'];
    const rows = filtered.map((link) => [
      link.Id,
      link.SourcePostId,
      link.SourcePostTitle,
      link.AnchorText,
      link.Url,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `external-links-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return allLinks;
    const needle = searchTerm.toLowerCase();
    return allLinks.filter(
      (link) =>
        link.Url.toLowerCase().includes(needle) ||
        link.AnchorText.toLowerCase().includes(needle) ||
        link.SourcePostTitle.toLowerCase().includes(needle)
    );
  }, [allLinks, searchTerm]);

  const displayLinks = useMemo(() => {
    if (showAll || filtered.length <= 300) return filtered;
    return filtered.slice(0, 300);
  }, [filtered, showAll]);

  if (loading) {
    return <p>Loading external links...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="external-links-view-container">
      <h2>External Links ({filtered.length})</h2>
      <input
        type="text"
        placeholder="Search external links..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={rebuildLinks} disabled={rebuilding}>
          {rebuilding ? 'Rebuilding...' : 'Rebuild Links'}
        </button>
        <button className="btn-secondary" onClick={downloadCsv}>
          Export CSV
        </button>
      </div>
      {filtered.length > 300 && (
        <div style={{ marginBottom: '12px', color: '#6a7a83' }}>
          Showing {displayLinks.length} of {filtered.length}. Rendering too many rows can be slow.
          <button className="btn-secondary" onClick={() => setShowAll((prev) => !prev)} style={{ marginLeft: '12px' }}>
            {showAll ? 'Show less' : 'Load all'}
          </button>
        </div>
      )}
      {filtered.length === 0 ? (
        <p>No external links found matching your search criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Source Post</th>
              <th>Anchor Text</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {displayLinks.map((link) => (
              <tr key={link.Id}>
                <td>{link.Id}</td>
                <td>{link.SourcePostTitle}</td>
                <td>{link.AnchorText || 'N/A'}</td>
                <td>{link.Url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ExternalLinksView;
