import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { useToastV2 as useToast } from '../../ui/toast/useToastV2';
import { Post } from '../../core/domain/types/Post';
import TurndownService from 'turndown';

const PostDetailScreenV2 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [draft, setDraft] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'html' | 'markdown' | 'preview'>('preview');
  const backTo = (location.state as { backTo?: string } | undefined)?.backTo ?? '/posts';
  const backLabel = backTo === '/pages' ? 'Back to Pages' : 'Back to Posts';

  const postId = useMemo(() => {
    if (!id) return null;
    const parsed = Number(id);
    return Number.isNaN(parsed) ? null : parsed;
  }, [id]);

  useEffect(() => {
    const loadPost = async () => {
      if (!postId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const dbService = new IndexedDbService();
      await dbService.openDatabase();
      const fetched = await dbService.getDataById<Post>('posts', postId);
      setPost(fetched ?? null);
      setDraft(fetched ?? null);
      setLoading(false);
    };
    void loadPost();
  }, [postId]);

  const handleSave = async () => {
    if (!draft) return;
    const dbService = new IndexedDbService();
    await dbService.openDatabase();
    await dbService.updateData('posts', draft);
    setPost(draft);
    showToast('Post saved locally.', 'success');
  };

  if (loading) {
    return <div>Loading post...</div>;
  }

  const markdown = useMemo(() => {
    const html = draft?.ContentEncoded || draft?.CleanedHtmlSource || '';
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    return turndown.turndown(html);
  }, [draft?.ContentEncoded, draft?.CleanedHtmlSource]);

  if (!post || !draft) {
    return (
      <div>
        <p>Post not found.</p>
        <button className="btn-secondary" onClick={() => navigate(backTo)}>
          {backLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="post-detail">
      <div className="post-detail-header">
        <div>
          <h2>Edit Post</h2>
          <p>ID: {post.PostId} • Type: {post.PostType}</p>
        </div>
        <div className="post-detail-actions">
          <button className="btn-secondary" onClick={() => navigate(backTo)}>
            {backLabel}
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>

      <div className="post-detail-grid">
        <div className="post-detail-card">
          <label>Title</label>
          <input
            type="text"
            value={draft.Title}
            onChange={(event) => setDraft({ ...draft, Title: event.target.value })}
          />
        </div>
        <div className="post-detail-card">
          <label>Slug</label>
          <input
            type="text"
            value={draft.PostName}
            onChange={(event) => setDraft({ ...draft, PostName: event.target.value })}
          />
        </div>
        <div className="post-detail-card">
          <label>Status</label>
          <input
            type="text"
            value={draft.Status}
            onChange={(event) => setDraft({ ...draft, Status: event.target.value })}
          />
        </div>
        <div className="post-detail-card">
          <label>Author</label>
          <input
            type="text"
            value={draft.Creator}
            onChange={(event) => setDraft({ ...draft, Creator: event.target.value })}
          />
        </div>
      </div>

      <div className="post-detail-editor">
        <div className="post-detail-tabs">
          <button className={`btn-secondary${viewMode === 'preview' ? ' qa-active' : ''}`} onClick={() => setViewMode('preview')}>
            HTML Preview
          </button>
          <button className={`btn-secondary${viewMode === 'html' ? ' qa-active' : ''}`} onClick={() => setViewMode('html')}>
            HTML Source
          </button>
          <button className={`btn-secondary${viewMode === 'markdown' ? ' qa-active' : ''}`} onClick={() => setViewMode('markdown')}>
            Markdown
          </button>
        </div>
        {viewMode === 'preview' && (
          <div className="post-html-preview" dangerouslySetInnerHTML={{ __html: draft.ContentEncoded || draft.CleanedHtmlSource || '' }} />
        )}
        {viewMode === 'html' && (
          <textarea
            value={draft.ContentEncoded || draft.CleanedHtmlSource || ''}
            onChange={(event) =>
              setDraft({
                ...draft,
                ContentEncoded: event.target.value,
                CleanedHtmlSource: event.target.value,
              })
            }
          />
        )}
        {viewMode === 'markdown' && (
          <textarea value={markdown} readOnly />
        )}
      </div>

      {draft.Link && (
        <div className="post-detail-links">
          <span>Original URL:</span>
          <a href={draft.Link} target="_blank" rel="noopener noreferrer">
            {draft.Link}
          </a>
        </div>
      )}
    </div>
  );
};

export default PostDetailScreenV2;
