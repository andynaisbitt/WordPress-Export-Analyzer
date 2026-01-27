// react-wordpress-importer/src/components/PostMetaView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { PostMeta } from '../../core/domain/types/PostMeta';

const PostMetaView: React.FC = () => {
  const [allPostMeta, setAllPostMeta] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchPostMeta = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const total = await dbService.getStoreCount('postMeta');
        setTotalCount(total);
        const fetchedPostMeta = await dbService.getStorePage<PostMeta>('postMeta', page, pageSize);
        setAllPostMeta(fetchedPostMeta);
      } catch (err) {
        console.error("Error fetching post meta:", err);
        setError("Failed to load post meta.");
      } finally {
        setLoading(false);
      }
    };

    fetchPostMeta();
  }, [page, pageSize]);

  const filteredPostMeta = useMemo(() => {
    return allPostMeta;
  }, [allPostMeta]);

  const handleSearch = async () => {
    if (!searchTerm) {
      setPage(1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const results = await dbService.searchPostMeta(searchTerm, 500);
      setAllPostMeta(results);
      setTotalCount(results.length);
    } catch (err) {
      console.error("Error searching post meta:", err);
      setError("Failed to search post meta.");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (loading) {
    return <p>Loading post meta...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="post-meta-view-container">
      <h2>Post Meta ({totalCount})</h2>
      <input
        type="text"
        placeholder="Search post meta..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      <button className="btn-secondary" onClick={handleSearch}>
        Search
      </button>
      {filteredPostMeta.length === 0 && !loading && !error ? (
        <p>No post meta found matching your search criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Meta ID</th>
              <th>Post ID</th>
              <th>Meta Key</th>
              <th>Meta Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredPostMeta.map(meta => (
              <tr key={meta.MetaId}>
                <td>{meta.MetaId}</td>
                <td>{meta.PostId}</td>
                <td>{meta.MetaKey}</td>
                <td>{meta.MetaValue.substring(0, 100)}...</td> {/* Truncate long content */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!searchTerm && (
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Next
          </button>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[100, 200, 500].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default PostMetaView;
