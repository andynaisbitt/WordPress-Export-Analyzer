// react-wordpress-importer/src/components/PostMetaView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { PostMeta } from '../../core/domain/types/PostMeta';

const PostMetaView: React.FC = () => {
  const [allPostMeta, setAllPostMeta] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchPostMeta = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetchedPostMeta = await dbService.getPostMeta();
        setAllPostMeta(fetchedPostMeta);
      } catch (err) {
        console.error("Error fetching post meta:", err);
        setError("Failed to load post meta.");
      } finally {
        setLoading(false);
      }
    };

    fetchPostMeta();
  }, []);

  const filteredPostMeta = useMemo(() => {
    if (!searchTerm) {
      return allPostMeta;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allPostMeta.filter(meta =>
      meta.MetaKey.toLowerCase().includes(lowerCaseSearchTerm) ||
      meta.MetaValue.toLowerCase().includes(lowerCaseSearchTerm) ||
      meta.PostId.toString().includes(lowerCaseSearchTerm)
    );
  }, [allPostMeta, searchTerm]);

  if (loading) {
    return <p>Loading post meta...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="post-meta-view-container">
      <h2>Post Meta ({filteredPostMeta.length} / {allPostMeta.length})</h2>
      <input
        type="text"
        placeholder="Search post meta..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
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
    </div>
  );
};

export default PostMetaView;
