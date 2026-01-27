import React, { useEffect, useMemo, useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { ExternalLink } from '../../core/domain/types/ExternalLink';

const ExternalLinksView: React.FC = () => {
  const [allLinks, setAllLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

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
