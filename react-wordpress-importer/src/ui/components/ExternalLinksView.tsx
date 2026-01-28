import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { ExternalLink } from '../../core/domain/types/ExternalLink';
import { SiteInfo } from '../../core/domain/types/SiteInfo';
import { LinkAnalysisService } from '../../data/services/LinkAnalysisService';

const ExternalLinksView: React.FC = () => {
  const [allLinks, setAllLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [pageSize, setPageSize] = useState(200);
  const [sortKey, setSortKey] = useState('url');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterSourceId, setFilterSourceId] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterMissingAnchor, setFilterMissingAnchor] = useState(false);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    sourceId: true,
    sourceTitle: true,
    anchor: true,
    url: true,
    actions: true,
  });
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
  const [computedLinks, setComputedLinks] = useState<ExternalLink[]>([]);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLinks = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetched = await dbService.getExternalLinks();
        setAllLinks(fetched);
        const loadedSiteInfo = await dbService.getSiteInfo();
        setSiteInfo(loadedSiteInfo);
      } catch (err) {
        console.error('Error fetching external links:', err);
        setError('Failed to load external links.');
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  useEffect(() => {
    if (allLinks.length === 0) {
      void scanLinks();
    }
  }, [allLinks.length]);

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
      setComputedLinks(linkData.externalLinks as ExternalLink[]);
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const refreshed = await dbService.getExternalLinks();
      setAllLinks(refreshed.length ? refreshed : (linkData.externalLinks as ExternalLink[]));
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
      setComputedLinks(linkData.externalLinks as ExternalLink[]);
    } finally {
      setRebuilding(false);
    }
  };

  const handleCopy = async (value: string, rowKey: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedRow(rowKey);
      window.setTimeout(() => setCopiedRow((current) => (current === rowKey ? null : current)), 1500);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSourceId('');
    setFilterDomain('');
    setFilterMissingAnchor(false);
    setSortKey('url');
    setSortDir('asc');
    setPageSize(200);
    setShowAll(false);
    setPage(1);
  };

  const applyMissingAnchorsPreset = () => {
    setFilterMissingAnchor(true);
    setFilterDomain('');
    setFilterSourceId('');
    setSortKey('anchor');
    setSortDir('asc');
    setShowAll(false);
    setPage(1);
  };

  const downloadCsv = () => {
    const columnDefs = [
      { key: 'id', label: 'id', value: (link: ExternalLink, idx: number) => link.Id ?? idx + 1 },
      { key: 'sourceId', label: 'source_post_id', value: (link: ExternalLink) => link.SourcePostId },
      { key: 'sourceTitle', label: 'source_title', value: (link: ExternalLink) => link.SourcePostTitle },
      { key: 'anchor', label: 'anchor_text', value: (link: ExternalLink) => link.AnchorText },
      { key: 'url', label: 'url', value: (link: ExternalLink) => link.Url },
    ];
    const activeColumns = columnDefs.filter((col) => visibleColumns[col.key as keyof typeof visibleColumns]);
    const headers = activeColumns.map((col) => col.label);
    const rows = sortedLinks.map((link, idx) => activeColumns.map((col) => col.value(link, idx)));
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
    const source = allLinks.length ? allLinks : computedLinks;
    if (!searchTerm) return source;
    const needle = searchTerm.toLowerCase();
    return source.filter(
      (link) =>
        link.Url.toLowerCase().includes(needle) ||
        link.AnchorText.toLowerCase().includes(needle) ||
        link.SourcePostTitle.toLowerCase().includes(needle)
    );
  }, [allLinks, computedLinks, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, allLinks.length, computedLinks.length, filterSourceId, filterDomain, filterMissingAnchor, pageSize]);

  const normalizedFilters = useMemo(() => {
    const sourceId = filterSourceId.trim();
    const domain = filterDomain.trim().toLowerCase();
    return {
      sourceId,
      domain,
      hasSourceId: sourceId.length > 0,
      hasDomain: domain.length > 0,
    };
  }, [filterSourceId, filterDomain]);

  const filteredWithFacets = useMemo(() => {
    return filtered.filter((link) => {
      if (normalizedFilters.hasSourceId && String(link.SourcePostId) !== normalizedFilters.sourceId) return false;
      if (normalizedFilters.hasDomain && !link.Url.toLowerCase().includes(normalizedFilters.domain)) return false;
      if (filterMissingAnchor && link.AnchorText?.trim()) return false;
      return true;
    });
  }, [filtered, normalizedFilters, filterMissingAnchor]);

  const sortedLinks = useMemo(() => {
    const sorted = [...filteredWithFacets];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'sourceId':
          return (a.SourcePostId - b.SourcePostId) * dir;
        case 'sourceTitle':
          return (a.SourcePostTitle || '').localeCompare(b.SourcePostTitle || '') * dir;
        case 'anchor':
          return (a.AnchorText || '').localeCompare(b.AnchorText || '') * dir;
        case 'url':
        default:
          return (a.Url || '').localeCompare(b.Url || '') * dir;
      }
    });
    return sorted;
  }, [filteredWithFacets, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedLinks.length / pageSize));

  const displayLinks = useMemo(() => {
    if (showAll) return sortedLinks;
    const start = (page - 1) * pageSize;
    return sortedLinks.slice(start, start + pageSize);
  }, [sortedLinks, showAll, page, pageSize]);

  if (loading) {
    return <p>Loading external links...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="external-links-view-container">
      <h2>External Links ({sortedLinks.length})</h2>
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
      <div className="link-controls">
        <input
          type="text"
          placeholder="Search external links..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="link-filters">
          <label className="link-filter">
            Source ID
            <input
              type="text"
              placeholder="e.g. 12"
              value={filterSourceId}
              onChange={(event) => setFilterSourceId(event.target.value)}
            />
          </label>
          <label className="link-filter">
            Domain contains
            <input
              type="text"
              placeholder="example.com"
              value={filterDomain}
              onChange={(event) => setFilterDomain(event.target.value)}
            />
          </label>
          <label className="link-filter">
            Sort by
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              <option value="url">URL</option>
              <option value="sourceTitle">Source title</option>
              <option value="sourceId">Source ID</option>
              <option value="anchor">Anchor text</option>
            </select>
          </label>
          <label className="link-filter">
            Order
            <select value={sortDir} onChange={(event) => setSortDir(event.target.value as 'asc' | 'desc')}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </label>
          <label className="link-filter">
            Page size
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </label>
          <label className="link-filter checkbox">
            <input
              type="checkbox"
              checked={filterMissingAnchor}
              onChange={(event) => setFilterMissingAnchor(event.target.checked)}
            />
            Missing anchor
          </label>
        </div>
        <div className="link-controls-actions">
          <button className="btn-secondary" onClick={applyMissingAnchorsPreset}>
            QA: Missing anchors
          </button>
          <button className="btn-secondary" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
        <div className="link-columns">
          <span>Columns</span>
          {Object.entries(visibleColumns).map(([key, value]) => (
            <label key={key} className="link-column">
              <input
                type="checkbox"
                checked={value}
                onChange={() => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
              />
              {key}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={rebuildLinks} disabled={rebuilding}>
          {rebuilding ? 'Rebuilding...' : 'Rebuild Links'}
        </button>
        <button className="btn-secondary" onClick={scanLinks} disabled={rebuilding}>
          {rebuilding ? 'Scanning...' : 'Scan Content'}
        </button>
        <button className="btn-secondary" onClick={downloadCsv}>
          Export filtered CSV
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
          </div>
          {rebuildStats.samples.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#6a7a83' }}>
              Samples: {rebuildStats.samples.join(', ')}
            </div>
          )}
        </div>
      )}
      {sortedLinks.length > pageSize && !showAll && (
        <div className="pagination-bar">
          <span>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Prev
          </button>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Next
          </button>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(1)}>
            First
          </button>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
            Last
          </button>
          <label className="pagination-input">
            Jump to
            <input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isNaN(value)) {
                  setPage(Math.min(totalPages, Math.max(1, value)));
                }
              }}
            />
          </label>
          <button className="btn-secondary" onClick={() => setShowAll(true)}>
            Load all
          </button>
        </div>
      )}
      {showAll && (
        <div className="pagination-bar">
          Showing all {sortedLinks.length} rows.
          <button className="btn-secondary" onClick={() => { setShowAll(false); setPage(1); }} style={{ marginLeft: '12px' }}>
            Paginate
          </button>
        </div>
      )}
      {sortedLinks.length === 0 ? (
        <div className="graph-warning">
          No external links found. Check your Site URL and click "Rebuild Links".
        </div>
      ) : (
        <div className="table-wrap">
          <table>
          <thead>
            <tr>
              {visibleColumns.id && <th>ID</th>}
              {visibleColumns.sourceId && <th>Source Post ID</th>}
              {visibleColumns.sourceTitle && <th>Source Post</th>}
              {visibleColumns.anchor && <th>Anchor Text</th>}
              {visibleColumns.url && <th>URL</th>}
              {visibleColumns.actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayLinks.map((link, idx) => (
              <tr key={link.Id ?? `${link.SourcePostId}-${link.Url}-${idx}`}>
                {visibleColumns.id && <td>{link.Id ?? idx + 1}</td>}
                {visibleColumns.sourceId && <td>{link.SourcePostId}</td>}
                {visibleColumns.sourceTitle && <td>{link.SourcePostTitle}</td>}
                {visibleColumns.anchor && <td>{link.AnchorText || 'N/A'}</td>}
                {visibleColumns.url && <td>{link.Url}</td>}
                {visibleColumns.actions && (
                  <td>
                    <div className="row-actions">
                      <button className="btn-secondary btn-mini" onClick={() => navigate(`/posts/${link.SourcePostId}`)}>
                        Open source
                      </button>
                      <button
                        className="btn-secondary btn-mini"
                        onClick={() => handleCopy(link.Url, `${link.SourcePostId}-${idx}-copy`)}
                      >
                        {copiedRow === `${link.SourcePostId}-${idx}-copy` ? 'Copied' : 'Copy URL'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExternalLinksView;
