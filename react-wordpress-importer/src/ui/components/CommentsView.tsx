// react-wordpress-importer/src/components/CommentsView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Comment } from '../../core/domain/types/Comment';

const CommentsView: React.FC = () => {
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetchedComments = await dbService.getComments();
        setAllComments(fetchedComments);
      } catch (err) {
        console.error("Error fetching comments:", err);
        setError("Failed to load comments.");
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, []);

  const filteredComments = useMemo(() => {
    if (!searchTerm) {
      return allComments;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allComments.filter(comment =>
      comment.Author.toLowerCase().includes(lowerCaseSearchTerm) ||
      comment.AuthorEmail.toLowerCase().includes(lowerCaseSearchTerm) ||
      comment.Content.toLowerCase().includes(lowerCaseSearchTerm) ||
      comment.Approved.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allComments, searchTerm]);

  if (loading) {
    return <p>Loading comments...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="comments-view-container">
      <h2>Comments ({filteredComments.length} / {allComments.length})</h2>
      <input
        type="text"
        placeholder="Search comments..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      {filteredComments.length === 0 && !loading && !error ? (
        <p>No comments found matching your search criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Post ID</th>
              <th>Author</th>
              <th>Email</th>
              <th>Date</th>
              <th>Content</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredComments.map(comment => (
              <tr key={comment.CommentId}>
                <td>{comment.CommentId}</td>
                <td>{comment.PostId}</td>
                <td>{comment.Author}</td>
                <td>{comment.AuthorEmail}</td>
                <td>{comment.Date ? new Date(comment.Date).toLocaleDateString() : 'N/A'}</td>
                <td>{comment.Content.substring(0, 100)}...</td> {/* Truncate long content */}
                <td>{comment.Approved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CommentsView;
