// react-wordpress-importer/src/components/InternalLinksView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { InternalLink } from '../../core/domain/types/InternalLink';
import { SiteInfo } from '../../core/domain/types/SiteInfo';
import { LinkAnalysisService } from '../../data/services/LinkAnalysisService';

const InternalLinksView: React.FC = () => {
  const [allInternalLinks, setAllInternalLinks] = useState<InternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
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
  const [computedLinks, setComputedLinks] = useState<InternalLink[]>([]);

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
      const service = new LinkAnalysisService();
      const linkData = await service.rebuildLinks();
      if ('stats' in linkData) setRebuildStats(linkData.stats);
      setComputedLinks(linkData.internalLinks as InternalLink[]);
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const refreshed = await dbService.getInternalLinks();
      setAllInternalLinks(refreshed.length ? refreshed : (linkData.internalLinks as InternalLink[]));
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
      const service = new LinkAnalysisService();
      const linkData = await service.scanLinks();
      if ('stats' in linkData) setRebuildStats(linkData.stats);
      setComputedLinks(linkData.internalLinks as InternalLink[]);
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
    const source = allInternalLinks.length ? allInternalLinks : computedLinks;
    if (!searchTerm) {
      return source;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return source.filter(link =>
      link.AnchorText.toLowerCase().includes(lowerCaseSearchTerm) ||
      link.SourcePostTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
      link.TargetPostTitle.toLowerCase().includes(lowerCaseSearchTerm) ||
      link.TargetPostStatus.toLowerCase().includes(lowerCaseSearchTerm) ||
      link.SourcePostId.toString().includes(lowerCaseSearchTerm) ||
      link.TargetPostId.toString().includes(lowerCaseSearchTerm)
    );
  }, [allInternalLinks, computedLinks, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, allInternalLinks.length, computedLinks.length]);

  const pageSize = 200;
  const totalPages = Math.max(1, Math.ceil(filteredInternalLinks.length / pageSize));

  const displayLinks = useMemo(() => {
    if (showAll) return filteredInternalLinks;
    const start = (page - 1) * pageSize;
    return filteredInternalLinks.slice(start, start + pageSize);
  }, [filteredInternalLinks, showAll, page]);

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
      {filteredInternalLinks.length > pageSize && !showAll && (
        <div style={{ marginBottom: '12px', color: '#6a7a83', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Prev
          </button>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Next
          </button>
          <button className="btn-secondary" onClick={() => setShowAll(true)}>
            Load all
          </button>
        </div>
      )}
      {showAll && (
        <div style={{ marginBottom: '12px', color: '#6a7a83' }}>
          Showing all {filteredInternalLinks.length} rows.
          <button className="btn-secondary" onClick={() => { setShowAll(false); setPage(1); }} style={{ marginLeft: '12px' }}>
            Paginate
          </button>
        </div>
      )}
      {filteredInternalLinks.length === 0 && !loading && !error ? (
        <div className="graph-warning">
          No internal links found. Check your Site URL and click "Rebuild Links".
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
