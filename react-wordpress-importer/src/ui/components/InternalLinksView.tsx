// react-wordpress-importer/src/components/InternalLinksView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { InternalLink } from '../../core/domain/types/InternalLink';
import { buildInternalAndExternalLinks } from '../../analysis/links/linkExtractorV2';
import { SiteInfo } from '../../core/domain/types/SiteInfo';

const InternalLinksView: React.FC = () => {
  const [allInternalLinks, setAllInternalLinks] = useState<InternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAll, setShowAll] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [siteInfo, setSiteInfo] = useState<SiteInfo[]>([]);
  const [rebuildStats, setRebuildStats] = useState<{
    postsScanned: number;
    postsWithContent: number;
    htmlLinks: number;
    markdownLinks: number;
    totalLinks: number;
    unresolvedInternal: number;
    samples: string[];
    siteUrl: string;
  } | null>(null);

  useEffect(() => {
    const fetchInternalLinks = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetchedInternalLinks = await dbService.getInternalLinks();
        setAllInternalLinks(fetchedInternalLinks);
        const loadedSiteInfo = await dbService.getSiteInfo();
        setSiteInfo(loadedSiteInfo);
      } catch (err) {
        console.error("Error fetching internal links:", err);
        setError("Failed to load internal links.");
      } finally {
        setLoading(false);
      }
    };

    fetchInternalLinks();
  }, []);

  useEffect(() => {
    if (allInternalLinks.length === 0) {
      void scanLinks();
    }
  }, [allInternalLinks.length]);

  const siteUrl = siteInfo.find((info) => info.Key === 'link')?.Value || '';

  const updateSiteUrl = async (value: string) => {
    const dbService = new IndexedDbService();
    await dbService.openDatabase();
    const entry = { Key: 'link', Value: value };
    const existing = siteInfo.find((info) => info.Key === 'link');
    if (existing) {
      await dbService.updateData('siteInfo', entry);
      setSiteInfo((prev) => prev.map((info) => (info.Key === 'link' ? entry : info)));
    } else {
      await dbService.addData('siteInfo', [entry]);
      setSiteInfo((prev) => [...prev, entry]);
    }
  };

  const rebuildLinks = async () => {
    setRebuilding(true);
    try {
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const posts = await dbService.getPosts();
      const siteInfo = await dbService.getSiteInfo();
      const siteUrl = siteInfo.find((info) => info.Key === 'link')?.Value || '';
      const linkData = buildInternalAndExternalLinks(posts, siteUrl);
      if ('stats' in linkData) {
        setRebuildStats(linkData.stats);
      }
      await dbService.clearStore('internalLinks');
      await dbService.clearStore('externalLinks');
      await dbService.addData('internalLinks', linkData.internalLinks.map((link) => ({ ...link, Id: undefined })));
      await dbService.addData('externalLinks', linkData.externalLinks.map((link) => ({ ...link, Id: undefined })));
      const refreshed = await dbService.getInternalLinks();
      setAllInternalLinks(refreshed);
    } catch (err) {
      console.error('Error rebuilding links:', err);
      setError('Failed to rebuild links.');
    } finally {
      setRebuilding(false);
    }
  };

  const scanLinks = async () => {
    setRebuilding(true);
    try {
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const posts = await dbService.getPosts();
      const siteInfo = await dbService.getSiteInfo();
      const siteUrl = siteInfo.find((info) => info.Key === 'link')?.Value || '';
      const linkData = buildInternalAndExternalLinks(posts, siteUrl);
      if ('stats' in linkData) {
        setRebuildStats(linkData.stats);
      }
    } finally {
      setRebuilding(false);
    }
  };

  const downloadCsv = () => {
    const headers = ['id', 'source_post_id', 'target_post_id', 'anchor_text', 'source_title', 'target_title', 'target_slug', 'target_status'];
    const rows = filteredInternalLinks.map((link, idx) => [
      link.Id ?? idx + 1,
      link.SourcePostId,
      link.TargetPostId,
      link.AnchorText,
      link.SourcePostTitle,
      link.TargetPostTitle,
      link.TargetPostName,
      link.TargetPostStatus,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `internal-links-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredInternalLinks = useMemo(() => {
    if (!searchTerm) {
      return allInternalLinks;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allInternalLinks.filter(link =>
      link.AnchorText.toLowerCase().includes(lowerCaseSearchTerm) ||
      link.SourcePostTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
      link.TargetPostTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
      link.TargetPostStatus.toLowerCase().includes(lowerCaseSearchTerm) ||
      link.SourcePostId.toString().includes(lowerCaseSearchTerm) ||
      link.TargetPostId.toString().includes(lowerCaseSearchTerm)
    );
  }, [allInternalLinks, searchTerm]);

  const displayLinks = useMemo(() => {
    if (showAll || filteredInternalLinks.length <= 300) {
      return filteredInternalLinks;
    }
    return filteredInternalLinks.slice(0, 300);
  }, [filteredInternalLinks, showAll]);

  if (loading) {
    return <p>Loading internal links...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="internal-links-view-container">
      <h2>Internal Links ({filteredInternalLinks.length} / {allInternalLinks.length})</h2>
      <div className="graph-tools" style={{ marginBottom: '12px' }}>
        <label>
          Site URL
          <input
            type="text"
            placeholder="https://yoursite.com"
            value={siteUrl}
            onChange={(event) => updateSiteUrl(event.target.value)}
          />
        </label>
      </div>
      <input
        type="text"
        placeholder="Search internal links..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={rebuildLinks} disabled={rebuilding}>
          {rebuilding ? 'Rebuilding...' : 'Rebuild Links'}
        </button>
        <button className="btn-secondary" onClick={scanLinks} disabled={rebuilding}>
          {rebuilding ? 'Scanning...' : 'Scan Content'}
        </button>
        <button className="btn-secondary" onClick={downloadCsv}>
          Export CSV
        </button>
      </div>
      {rebuildStats && (
        <div className="debug-card" style={{ marginBottom: '12px' }}>
          <h4>Rebuild Diagnostics</h4>
          <div className="debug-metrics">
            <span>Posts scanned: {rebuildStats.postsScanned}</span>
            <span>With content: {rebuildStats.postsWithContent}</span>
            <span>HTML links: {rebuildStats.htmlLinks}</span>
            <span>Markdown links: {rebuildStats.markdownLinks}</span>
            <span>Total links: {rebuildStats.totalLinks}</span>
            <span>Unresolved internal: {rebuildStats.unresolvedInternal}</span>
          </div>
          {rebuildStats.samples.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#6a7a83' }}>
              Samples: {rebuildStats.samples.join(', ')}
            </div>
          )}
        </div>
      )}
      {filteredInternalLinks.length > 300 && (
        <div style={{ marginBottom: '12px', color: '#6a7a83' }}>
          Showing {displayLinks.length} of {filteredInternalLinks.length}. Rendering too many rows can be slow.
          <button className="btn-secondary" onClick={() => setShowAll((prev) => !prev)} style={{ marginLeft: '12px' }}>
            {showAll ? 'Show less' : 'Load all'}
          </button>
        </div>
      )}
      {filteredInternalLinks.length === 0 && !loading && !error ? (
        <div className="graph-warning">
          No internal links found. Check your Site URL and click “Rebuild Links”.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Source Post ID</th>
              <th>Target Post ID</th>
              <th>Anchor Text</th>
              <th>Source Post Title</th>
              <th>Target Post Title</th>
              <th>Target Post Status</th>
            </tr>
          </thead>
          <tbody>
            {displayLinks.map((link, idx) => (
              <tr key={link.Id ?? `${link.SourcePostId}-${link.TargetPostId}-${idx}`}>
                <td>{link.Id ?? idx + 1}</td>
                <td>{link.SourcePostId}</td>
                <td>{link.TargetPostId}</td>
                <td>{link.AnchorText || 'N/A'}</td>
                <td>{link.SourcePostTitle || 'N/A'}</td>
                <td>{link.TargetPostTitle || 'N/A'}</td>
                <td>{link.TargetPostStatus || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InternalLinksView;
