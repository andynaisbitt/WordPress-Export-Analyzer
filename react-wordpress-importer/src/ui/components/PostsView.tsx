// react-wordpress-importer/src/components/PostsView.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Post } from '../../core/domain/types/Post';
import { useNavigate } from 'react-router-dom';
import { buildContentQaReport } from '../../analysis/contentQaV2';

interface PostsViewProps {
  postType?: 'post' | 'page';
  title?: string;
}

const PostsView: React.FC<PostsViewProps> = ({ postType = 'post', title }) => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [searchMode, setSearchMode] = useState<'all' | 'title' | 'content' | 'regex'>('all');
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
    if (searchMode === 'regex') {
      try {
        const regex = new RegExp(searchTerm, 'i');
        return allPosts.filter((post) =>
          regex.test(post.Title) ||
          regex.test(post.Creator) ||
          regex.test(post.Status) ||
          regex.test(post.PostName) ||
          regex.test(post.ContentEncoded || '') ||
          regex.test(post.Excerpt || '')
        );
      } catch {
        return [];
      }
    }
    if (searchMode === 'title') {
      return allPosts.filter((post) =>
        post.Title.toLowerCase().includes(lowerCaseSearchTerm) ||
        post.PostName.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    if (searchMode === 'content') {
      return allPosts.filter((post) =>
        (post.ContentEncoded || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (post.Excerpt || '').toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    return allPosts.filter(post =>
      post.Title.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.Creator.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.Status.toLowerCase().includes(lowerCaseSearchTerm) ||
      post.PostName.toLowerCase().includes(lowerCaseSearchTerm) ||
      (post.ContentEncoded || '').toLowerCase().includes(lowerCaseSearchTerm) ||
      (post.Excerpt || '').toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allPosts, searchTerm, searchMode]);

  const filteredByMeta = useMemo(() => {
    return filteredPosts.filter((post) => {
      if (statusFilter !== 'all' && post.Status !== statusFilter) return false;
      if (authorFilter !== 'all' && post.Creator !== authorFilter) return false;
      return true;
    });
  }, [filteredPosts, statusFilter, authorFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredByMeta.length / pageSize));
  const pagedPosts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredByMeta.slice(start, start + pageSize);
  }, [filteredByMeta, page, pageSize]);

  const statuses = useMemo(() => {
    const unique = new Set(allPosts.map((post) => post.Status).filter(Boolean));
    return Array.from(unique);
  }, [allPosts]);

  const authors = useMemo(() => {
    const unique = new Set(allPosts.map((post) => post.Creator).filter(Boolean));
    return Array.from(unique);
  }, [allPosts]);

  const formatStatus = (status: string) => {
    if (!status) return 'unknown';
    const normalized = status.toLowerCase();
    if (normalized === 'publish') return 'published';
    if (normalized === 'future') return 'scheduled';
    if (normalized === 'private') return 'private';
    if (normalized === 'draft') return 'draft';
    return normalized;
  };

  const qaReport = useMemo(() => buildContentQaReport(allPosts), [allPosts]);
  const qaByPostId = useMemo(() => {
    const map = new Map<number, { severity: string; issues: number }>();
    qaReport.issues.forEach((issue) => {
      map.set(issue.postId, { severity: issue.severity, issues: issue.issues.length });
    });
    return map;
  }, [qaReport.issues]);


  if (loading) {
    return <p>Loading posts...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="posts-view-container">
      <h2>{title ?? (postType === 'page' ? 'Pages' : 'Posts')} ({filteredByMeta.length} / {allPosts.length})</h2>
      <div className="qa-summary">
        <span>QA flagged: {qaReport.summary.flaggedPosts}</span>
        <span>High: {qaReport.summary.high}</span>
        <span>Medium: {qaReport.summary.medium}</span>
        <span>Low: {qaReport.summary.low}</span>
      </div>
      <input
        type="text"
        placeholder={`Search ${postType === 'page' ? 'pages' : 'posts'}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '20px', padding: '8px', width: '300px' }}
      />
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <select value={searchMode} onChange={(e) => { setSearchMode(e.target.value as typeof searchMode); setPage(1); }}>
          <option value="all">Search all</option>
          <option value="title">Title/Slug</option>
          <option value="content">Content/Excerpt</option>
          <option value="regex">Regex</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select value={authorFilter} onChange={(e) => { setAuthorFilter(e.target.value); setPage(1); }}>
          <option value="all">All authors</option>
          {authors.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
      {filteredByMeta.length === 0 && !loading && !error ? (
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
              <th>QA</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedPosts.map(post => {
              const qa = qaByPostId.get(post.PostId);
              return (
                <tr key={post.PostId}>
                  <td>{post.PostId}</td>
                  <td>{post.Title}</td>
                  <td>{formatStatus(post.Status)}</td>
                  <td>{post.PostDate ? new Date(post.PostDate).toLocaleDateString() : 'N/A'}</td>
                  <td>{post.Creator}</td>
                  <td>
                    {qa ? (
                      <span className={`qa-pill qa-${qa.severity}`}>{qa.severity} ({qa.issues})</span>
                    ) : (
                      <span className="qa-pill qa-clean">clean</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-secondary"
                      onClick={() => navigate(`/posts/${post.PostId}`, { state: { backTo: postType === 'page' ? '/pages' : '/posts' } })}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {filteredByMeta.length > pageSize && (
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
        </div>
      )}
    </div>
  );
};

export default PostsView;
