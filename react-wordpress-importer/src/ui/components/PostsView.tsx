// react-wordpress-importer/src/components/PostsView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Post } from '../../core/domain/types/Post';
import { useNavigate } from 'react-router-dom';

interface PostsViewProps {
  postType?: 'post' | 'page';
  title?: string;
}

const PostsView: React.FC<PostsViewProps> = ({ postType = 'post', title }) => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const dbService = new IndexedDbService();
        await dbService.openDatabase();
        const fetchedPosts = await dbService.getPosts();
        setAllPosts(fetchedPosts.filter((p: Post) => p.PostType === postType));
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError("Failed to load posts.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    if (!searchTerm) {
      return allPosts;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allPosts.filter(post =>
      post.Title.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.Creator.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.Status.toLowerCase().includes(lowerCaseSearchTerm)
      // Add more fields to search as needed
    );
  }, [allPosts, searchTerm]);


  if (loading) {
    return <p>Loading posts...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="posts-view-container">
      <h2>{title ?? (postType === 'page' ? 'Pages' : 'Posts')} ({filteredPosts.length} / {allPosts.length})</h2>
      <input
        type="text"
        placeholder={`Search ${postType === 'page' ? 'pages' : 'posts'}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      {filteredPosts.length === 0 && !loading && !error ? (
        <p>No posts found matching your search criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Date</th>
              <th>Author</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map(post => (
              <tr key={post.PostId}>
                <td>{post.PostId}</td>
                <td>{post.Title}</td>
                <td>{post.Status}</td>
                <td>{post.PostDate ? new Date(post.PostDate).toLocaleDateString() : 'N/A'}</td>
                <td>{post.Creator}</td>
                <td>
                  <button
                    className="btn-secondary"
                    onClick={() => navigate(`/posts/${post.PostId}`, { state: { backTo: postType === 'page' ? '/pages' : '/posts' } })}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PostsView;
