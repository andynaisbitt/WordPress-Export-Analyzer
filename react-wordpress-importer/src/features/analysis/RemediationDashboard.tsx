import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { List } from 'react-window';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { Post } from '../../core/domain/types/Post';
import { findMissingMetaDescription, findMissingTitles } from '../../analysis/seo/seoAuditV3';

interface RemediationIssue {
  postId: number;
  title: string;
  slug: string;
  missingTitle: boolean;
  missingDescription: boolean;
  severity: 'High' | 'Medium';
  resolved?: boolean;
}

const ROW_HEIGHT = 72;
const EXPANDED_HEIGHT = 240;

const RemediationDashboard = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [issues, setIssues] = useState<RemediationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { title?: string; description?: string }>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const db = new IndexedDbService();
      await db.openDatabase();
      const loadedPosts = await db.getPosts();
      setPosts(loadedPosts);
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    const missingTitle = new Set(findMissingTitles(posts).map((post) => post.PostId));
    const missingDescription = new Set(findMissingMetaDescription(posts).map((post) => post.PostId));
    const issueList = posts
      .filter((post) => post.PostType === 'post')
      .filter((post) => missingTitle.has(post.PostId) || missingDescription.has(post.PostId))
      .map((post) => {
        const hasTitle = missingTitle.has(post.PostId);
        const hasDesc = missingDescription.has(post.PostId);
        return {
          postId: post.PostId,
          title: post.Title || 'Untitled post',
          slug: post.PostName || '',
          missingTitle: hasTitle,
          missingDescription: hasDesc,
          severity: hasTitle && hasDesc ? 'High' : 'Medium',
        } as RemediationIssue;
      });
    setIssues(issueList);
  }, [posts]);

  const summary = useMemo(() => {
    const active = issues.filter((issue) => !issue.resolved);
    return {
      total: active.length,
      high: active.filter((issue) => issue.severity === 'High').length,
      medium: active.filter((issue) => issue.severity === 'Medium').length,
    };
  }, [issues]);

  const getItemSize = (index: number) => {
    const issue = issues[index];
    if (!issue) return ROW_HEIGHT;
    return expandedId === issue.postId ? EXPANDED_HEIGHT : ROW_HEIGHT;
  };

  const applyFix = async (issue: RemediationIssue) => {
    const db = new IndexedDbService();
    await db.openDatabase();
    const original = posts.find((post) => post.PostId === issue.postId);
    if (!original) return;

    const draft = drafts[issue.postId] || {};
    const updated: Post = {
      ...original,
      Title: issue.missingTitle ? draft.title || 'Untitled post' : original.Title,
      Excerpt: issue.missingDescription ? draft.description || original.Excerpt || '' : original.Excerpt,
    };

    await db.updateData('posts', updated);
    setPosts((prev) => prev.map((post) => (post.PostId === updated.PostId ? updated : post)));
    setIssues((prev) => prev.map((item) => (item.postId === issue.postId ? { ...item, resolved: true } : item)));
  };

  const generateFix = (issue: RemediationIssue) => {
    const original = posts.find((post) => post.PostId === issue.postId);
    if (!original) return;
    setDrafts((prev) => ({
      ...prev,
      [issue.postId]: {
        title: issue.missingTitle ? `Draft title for ${original.PostName || 'post'}` : prev[issue.postId]?.title,
        description: issue.missingDescription
          ? `Summary needed for ${original.Title || 'this post'}`
          : prev[issue.postId]?.description,
      },
    }));
  };

  if (loading) {
    return <div>Loading remediation dashboard...</div>;
  }

  if (issues.length === 0) {
    return (
      <div className="remediation-dashboard">
        <h2>AI Remediation</h2>
        <p>No SEO critical issues found. Everything looks clean.</p>
      </div>
    );
  }

  return (
    <div className="remediation-dashboard">
      <div className="remediation-header">
        <div>
          <h2>AI Remediation</h2>
          <p>Fix SEO-critical issues instantly. Hook in AI later - manual fixes work now.</p>
        </div>
        <div className="remediation-summary">
          <span>Total issues: {summary.total}</span>
          <span>High: {summary.high}</span>
          <span>Medium: {summary.medium}</span>
        </div>
      </div>

      <List
        height={Math.min(600, issues.length * ROW_HEIGHT + 16)}
        width="100%"
        rowCount={issues.length}
        rowHeight={getItemSize}
        rowComponent={({ index, style }) => {
          const issue = issues[index];
          if (!issue) return null;
          const isExpanded = expandedId === issue.postId;
          const draft = drafts[issue.postId] || {};
          const isResolved = issue.resolved;
          return (
            <div style={style} className="remediation-row">
              <div className={`remediation-row-inner${isResolved ? ' resolved' : ''}`}>
                <div>
                  <div className="remediation-title">{issue.title}</div>
                  <div className="remediation-meta">/{issue.slug || 'no-slug'} * {issue.severity}</div>
                </div>
                <div className="remediation-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setExpandedId(isExpanded ? null : issue.postId)}
                  >
                    {isExpanded ? 'Collapse' : 'Review'}
                  </button>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {isExpanded && !isResolved && (
                  <motion.div
                    className="remediation-panel"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {issue.missingTitle && (
                      <label>
                        Suggested title
                        <input
                          type="text"
                          value={draft.title ?? ''}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [issue.postId]: { ...prev[issue.postId], title: event.target.value },
                            }))
                          }
                        />
                      </label>
                    )}
                    {issue.missingDescription && (
                      <label>
                        Meta description
                        <input
                          type="text"
                          value={draft.description ?? ''}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [issue.postId]: { ...prev[issue.postId], description: event.target.value },
                            }))
                          }
                        />
                      </label>
                    )}
                    <div className="remediation-panel-actions">
                      <button className="btn-secondary" onClick={() => generateFix(issue)}>
                        Generate Fix
                      </button>
                      <button className="btn-primary" onClick={() => applyFix(issue)}>
                        Apply Fix
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }}
        rowProps={{}}
        className="remediation-list"
      />
    </div>
  );
};

export default RemediationDashboard;
