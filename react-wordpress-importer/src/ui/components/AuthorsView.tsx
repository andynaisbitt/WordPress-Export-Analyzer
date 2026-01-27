// react-wordpress-importer/src/components/AuthorsView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Author } from '../../core/domain/types/Author';

const AuthorsView: React.FC = () => {
  const [allAuthors, setAllAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchAuthors = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetchedAuthors = await dbService.getAuthors();
        setAllAuthors(fetchedAuthors);
      } catch (err) {
        console.error("Error fetching authors:", err);
        setError("Failed to load authors.");
      } finally {
        setLoading(false);
      }
    };

    fetchAuthors();
  }, []);

  const filteredAuthors = useMemo(() => {
    if (!searchTerm) {
      return allAuthors;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allAuthors.filter(author =>
      author.DisplayName.toLowerCase().includes(lowerCaseSearchTerm) ||
      author.Login.toLowerCase().includes(lowerCaseSearchTerm) ||
      author.Email.toLowerCase().includes(lowerCaseSearchTerm) ||
      author.FirstName.toLowerCase().includes(lowerCaseSearchTerm) ||
      author.LastName.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allAuthors, searchTerm]);

  if (loading) {
    return <p>Loading authors...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="authors-view-container">
      <h2>Authors ({filteredAuthors.length} / {allAuthors.length})</h2>
      <input
        type="text"
        placeholder="Search authors..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      {filteredAuthors.length === 0 && !loading && !error ? (
        <p>No authors found matching your search criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Display Name</th>
              <th>Login</th>
              <th>Email</th>
              <th>First Name</th>
              <th>Last Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredAuthors.map(author => (
              <tr key={author.AuthorId}>
                <td>{author.AuthorId}</td>
                <td>{author.DisplayName}</td>
                <td>{author.Login}</td>
                <td>{author.Email}</td>
                <td>{author.FirstName || 'N/A'}</td>
                <td>{author.LastName || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AuthorsView;
