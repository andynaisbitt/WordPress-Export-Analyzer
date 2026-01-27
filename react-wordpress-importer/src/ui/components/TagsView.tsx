// react-wordpress-importer/src/components/TagsView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Tag } from '../../core/domain/types/Tag';

const TagsView: React.FC = () => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetchedTags = await dbService.getTags();
        setAllTags(fetchedTags);
      } catch (err) {
        console.error("Error fetching tags:", err);
        setError("Failed to load tags.");
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  const filteredTags = useMemo(() => {
    if (!searchTerm) {
      return allTags;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allTags.filter(tag =>
      tag.Name.toLowerCase().includes(lowerCaseSearchTerm) ||
      tag.Nicename.toLowerCase().includes(lowerCaseSearchTerm) ||
      tag.Description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allTags, searchTerm]);

  if (loading) {
    return <p>Loading tags...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="tags-view-container">
      <h2>Tags ({filteredTags.length} / {allTags.length})</h2>
      <input
        type="text"
        placeholder="Search tags..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      {filteredTags.length === 0 && !loading && !error ? (
        <p>No tags found matching your search criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Nicename</th>
              <th>Description</th>
              <th>Post Count</th>
            </tr>
          </thead>
          <tbody>
            {filteredTags.map(tag => (
              <tr key={tag.TermId}>
                <td>{tag.TermId}</td>
                <td>{tag.Name}</td>
                <td>{tag.Nicename}</td>
                <td>{tag.Description || 'N/A'}</td>
                <td>{tag.PostCount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TagsView;
