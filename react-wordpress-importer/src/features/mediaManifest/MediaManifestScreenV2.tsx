// src/features/mediaManifest/MediaManifestScreenV2.tsx
import { useState, useEffect } from 'react';
import { buildMediaManifest, MediaManifestRow } from '../../analysis/manifest/mediaManifestV2';
import VirtualTableV2 from '../../ui/tables/VirtualTableV2';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Attachment } from '../../core/domain/types/Attachment';
import { Post } from '../../core/domain/types/Post';

const MediaManifestScreenV2: React.FC = () => {
  const [manifest, setManifest] = useState<MediaManifestRow[]>([]);
  const [filteredManifest, setFilteredManifest] = useState<MediaManifestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'missing' | 'matched'>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const posts = await dbService.getAllData<Post>('posts');
      const attachments = await dbService.getAllData<Attachment>('attachments');
      const manifestData = buildMediaManifest(posts, attachments);
      setManifest(manifestData);
      setFilteredManifest(manifestData);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = manifest;
    if (filter === 'missing') {
      filtered = manifest.filter((row) => row.status === 'missing');
    } else if (filter === 'matched') {
      filtered = manifest.filter((row) => row.status === 'matched');
    }
    setFilteredManifest(filtered);
  }, [filter, manifest]);

  const downloadCsv = () => {
    const headers = [
      'URL',
      'Filename',
      'Status',
      'Type',
      'Used in Post IDs',
      'Matched Attachment ID',
      'Matched Attachment URL',
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...filteredManifest.map((row) =>
          [
            `"${row.url}"`,
            `"${row.filename}"`,
            row.status,
            row.type,
            `"${row.whereUsedPostIds.join(', ')}"`,
            row.matchedAttachmentId || '',
            `"${row.matchedAttachmentUrl || ''}"`,
          ].join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'media-manifest.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { key: 'filename', label: 'Filename', width: 220 },
    { key: 'status', label: 'Status', width: 120 },
    { key: 'type', label: 'Type', width: 120 },
    { key: 'whereUsedPostIds', label: 'Used In', width: 160 },
    { key: 'url', label: 'URL', width: 420 },
  ];

  const renderRow = (row: MediaManifestRow) => (
    <div className="table-row" style={{ display: 'flex' }}>
      <div className="table-cell" style={{ flex: '2fr' }}>{row.filename}</div>
      <div className="table-cell" style={{ flex: '1fr' }}>{row.status}</div>
      <div className="table-cell" style={{ flex: '1fr' }}>{row.type}</div>
      <div className="table-cell" style={{ flex: '1fr' }}>{row.whereUsedPostIds.join(', ')}</div>
      <div className="table-cell" style={{ flex: '3fr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.url}</div>
    </div>
  );

  if (loading) {
    return <div>Loading and building manifest...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={() => setFilter('all')} disabled={filter === 'all'}>All</button>
        <button onClick={() => setFilter('missing')} disabled={filter === 'missing'}>Missing</button>
        <button onClick={() => setFilter('matched')} disabled={filter === 'matched'}>Matched</button>
        <button onClick={downloadCsv}>Download CSV</button>
      </div>
      <VirtualTableV2
        data={filteredManifest}
        columns={columns}
        rowHeight={40}
        height={600}
        width="100%"
        renderRow={renderRow}
      />
    </div>
  );
};

export default MediaManifestScreenV2;
