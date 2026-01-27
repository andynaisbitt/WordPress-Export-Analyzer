// react-wordpress-importer/src/components/AttachmentsView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Attachment } from '../../core/domain/types/Attachment';

const AttachmentsView: React.FC = () => {
  const [allAttachments, setAllAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchAttachments = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetchedAttachments = await dbService.getAttachments();
        setAllAttachments(fetchedAttachments);
      } catch (err) {
        console.error("Error fetching attachments:", err);
        setError("Failed to load attachments.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, []);

  const filteredAttachments = useMemo(() => {
    if (!searchTerm) {
      return allAttachments;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allAttachments.filter(attachment =>
      attachment.Title.toLowerCase().includes(lowerCaseSearchTerm) ||
      attachment.Url.toLowerCase().includes(lowerCaseSearchTerm) ||
      attachment.MimeType.toLowerCase().includes(lowerCaseSearchTerm) ||
      attachment.PostName.toLowerCase().includes(lowerCaseSearchTerm) ||
      attachment.Description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allAttachments, searchTerm]);


  if (loading) {
    return <p>Loading attachments...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="attachments-view-container">
      <h2>Attachments ({filteredAttachments.length} / {allAttachments.length})</h2>
      <input
        type="text"
        placeholder="Search attachments..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      {filteredAttachments.length === 0 && !loading && !error ? (
        <p>No attachments found matching your search criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>URL</th>
              <th>Mime Type</th>
              <th>Parent Post ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttachments.map(attachment => (
              <tr key={attachment.PostId}>
                <td>{attachment.PostId}</td>
                <td>{attachment.Title || 'N/A'}</td>
                <td><a href={attachment.Url} target="_blank" rel="noopener noreferrer">{attachment.Url}</a></td>
                <td>{attachment.MimeType}</td>
                <td>{attachment.ParentId || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AttachmentsView;
