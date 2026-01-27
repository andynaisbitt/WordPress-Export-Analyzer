// react-wordpress-importer/src/components/CategoriesView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Category } from '../../core/domain/types/Category';

const CategoriesView: React.FC = () => {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetchedCategories = await dbService.getCategories();
        setAllCategories(fetchedCategories);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError("Failed to load categories.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) {
      return allCategories;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allCategories.filter(category =>
      category.Name.toLowerCase().includes(lowerCaseSearchTerm) ||
      category.Nicename.toLowerCase().includes(lowerCaseSearchTerm) ||
      category.Description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allCategories, searchTerm]);

  if (loading) {
    return <p>Loading categories...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="categories-view-container">
      <h2>Categories ({filteredCategories.length} / {allCategories.length})</h2>
      <input
        type="text"
        placeholder="Search categories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      {filteredCategories.length === 0 && !loading && !error ? (
        <p>No categories found matching your search criteria.</p>
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
            {filteredCategories.map(category => (
              <tr key={category.TermId}>
                <td>{category.TermId}</td>
                <td>{category.Name}</td>
                <td>{category.Nicename}</td>
                <td>{category.Description || 'N/A'}</td>
                <td>{category.PostCount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CategoriesView;
