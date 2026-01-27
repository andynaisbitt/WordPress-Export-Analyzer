import { useEffect, useMemo, useState } from 'react';
import { IndexedDbService } from '../../data/services/IndexedDbService';
import { buildBlogCmsCsvBundle, buildBlogCmsExportPack, buildBlogCmsZip } from '../../export/v2/blogCmsExport';
import { useToastV2 as useToast } from '../../ui/toast/useToastV2';
import { Post } from '../../core/domain/types/Post';
import { Category } from '../../core/domain/types/Category';
import { Tag } from '../../core/domain/types/Tag';
import { Attachment } from '../../core/domain/types/Attachment';
import { PostMeta } from '../../core/domain/types/PostMeta';
import { buildContentQaReport } from '../../analysis/contentQaV2';
import { buildMediaManifestCsv, buildMediaZip } from '../../export/v2/mediaExportV2';
import { buildMediaManifest } from '../../analysis/manifest/mediaManifestV2';
import { buildAssetLaundromatZip } from '../../export/v2/assetLaundromatV2';

const ExportWizardScreenV2 = () => {
  const { showToast } = useToast();
  const [defaultAuthorId, setDefaultAuthorId] = useState('1');
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [preserveCanonical, setPreserveCanonical] = useState(true);
  const [loading, setLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [data, setData] = useState<{
    posts: Post[];
    categories: Category[];
    tags: Tag[];
    attachments: Attachment[];
    postMeta: PostMeta[];
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const db = new IndexedDbService();
      await db.openDatabase();
      const [posts, categories, tags, attachments, postMeta] = await Promise.all([
        db.getPosts(),
        db.getCategories(),
        db.getTags(),
        db.getAttachments(),
        db.getPostMeta(),
      ]);
      setData({ posts, categories, tags, attachments, postMeta });
    };
    void load();
  }, []);

  const pack = useMemo(() => {
    if (!data) return null;
    const qa = buildContentQaReport(data.posts);
    return buildBlogCmsExportPack({
      posts: data.posts,
      categories: data.categories,
      tags: data.tags,
      attachments: data.attachments,
      postMeta: data.postMeta,
      defaultAuthorId: Number(defaultAuthorId || 1),
      preserveCanonical,
      qa,
    });
  }, [data, defaultAuthorId, preserveCanonical]);

  const mediaAudit = useMemo(() => {
    if (!data) return null;
    const manifest = buildMediaManifest(data.posts, data.attachments);
    const matched = manifest.filter((row) => row.status === 'matched').length;
    const missing = manifest.filter((row) => row.status === 'missing').length;
    return {
      total: manifest.length,
      matched,
      missing,
      attachments: data.attachments.length,
    };
  }, [data]);

  const downloadPack = () => {
    if (!pack) return;
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blogcms-import-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    if (!pack) return;
    const csvBundle = buildBlogCmsCsvBundle(pack);
    const files = [
      { name: 'blogcms-posts.csv', content: csvBundle.postsCsv },
      { name: 'blogcms-categories.csv', content: csvBundle.categoriesCsv },
      { name: 'blogcms-tags.csv', content: csvBundle.tagsCsv },
      { name: 'blogcms-content-qa.csv', content: csvBundle.qaCsv },
    ];
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const downloadZip = async () => {
    if (!pack) return;
    const blob = await buildBlogCmsZip(pack);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blogcms-export-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadMediaManifest = () => {
    if (!data) return;
    const { csv } = buildMediaManifestCsv(data.posts, data.attachments);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `media-manifest-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadMediaZip = async () => {
    if (!data) return;
    const blob = await buildMediaZip(data.attachments);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `media-download-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCleanAssetZip = async () => {
    if (!data || !pack) return;
    setAssetLoading(true);
    try {
      const blob = await buildAssetLaundromatZip({
        pack,
        posts: data.posts,
        attachments: data.attachments,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blogcms-clean-assets-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setAssetLoading(false);
    }
  };

  const appendLog = (entry: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${entry}`]);
  };

  const importToApi = async () => {
    if (!pack) return;
    if (!baseUrl || !token) {
      showToast('Base URL and token are required.', 'error');
      return;
    }
    setLoading(true);
    setLog([]);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const fetchJson = async (url: string) => {
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
        return res.json();
      };

      appendLog('Fetching existing categories and tags...');
      const [existingCategories, existingTags] = await Promise.all([
        fetchJson(`${baseUrl}/api/v1/blog/admin/categories`),
        fetchJson(`${baseUrl}/api/v1/blog/admin/tags`),
      ]);

      const categoryIdBySlug = new Map<string, number>();
      const tagIdBySlug = new Map<string, number>();

      existingCategories?.forEach((cat: any) => {
        if (cat?.slug) categoryIdBySlug.set(cat.slug, cat.id);
      });
      existingTags?.forEach((tag: any) => {
        if (tag?.slug) tagIdBySlug.set(tag.slug, tag.id);
      });

      const pendingCategories = [...pack.categories];
      let guard = 0;
      while (pendingCategories.length && guard < 10) {
        guard += 1;
        const remaining: typeof pendingCategories = [];
        for (const category of pendingCategories) {
          if (category.parent_slug && !categoryIdBySlug.has(category.parent_slug)) {
            remaining.push(category);
            continue;
          }
          if (categoryIdBySlug.has(category.slug)) continue;
          const payload = {
            name: category.name,
            slug: category.slug,
            description: category.description,
            parent_id: category.parent_slug ? categoryIdBySlug.get(category.parent_slug) : null,
          };
          const res = await fetch(`${baseUrl}/api/v1/blog/admin/categories`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            appendLog(`Category create failed: ${category.slug}`);
            continue;
          }
          const created = await res.json();
          categoryIdBySlug.set(category.slug, created.id);
          appendLog(`Created category: ${category.slug}`);
        }
        pendingCategories.splice(0, pendingCategories.length, ...remaining);
      }

      for (const tag of pack.tags) {
        if (tagIdBySlug.has(tag.slug)) continue;
        const res = await fetch(`${baseUrl}/api/v1/blog/admin/tags`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: tag.name,
            slug: tag.slug,
            description: tag.description,
          }),
        });
        if (!res.ok) {
          appendLog(`Tag create failed: ${tag.slug}`);
          continue;
        }
        const created = await res.json();
        tagIdBySlug.set(tag.slug, created.id);
        appendLog(`Created tag: ${tag.slug}`);
      }

      appendLog('Creating posts...');
      for (const post of pack.posts) {
        const tag_ids = (post.tag_slugs || [])
          .map((slug) => tagIdBySlug.get(slug))
          .filter((id): id is number => Boolean(id));
        const category_ids = (post.category_slugs || [])
          .map((slug) => categoryIdBySlug.get(slug))
          .filter((id): id is number => Boolean(id));

        const payload = {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          meta_title: post.meta_title,
          meta_description: post.meta_description,
          meta_keywords: post.meta_keywords,
          canonical_url: post.canonical_url,
          featured_image: post.featured_image,
          featured_image_alt: post.featured_image_alt,
          featured_image_caption: post.featured_image_caption,
          published: post.published,
          scheduled_for: post.scheduled_for,
          is_featured: post.is_featured,
          allow_comments: post.allow_comments,
          author_id: post.author_id,
          tag_ids,
          category_ids,
        };

        const res = await fetch(`${baseUrl}/api/v1/blog/admin/posts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          appendLog(`Post create failed: ${post.slug}`);
          continue;
        }
        appendLog(`Created post: ${post.slug}`);
      }

      showToast('BlogCMS import complete.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(`Import failed: ${message}`, 'error');
      appendLog(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-wizard">
      <h2>Export to BlogCMS</h2>
      <p>Generate a BlogCMS JSON pack or import directly to your BlogCMS admin API.</p>

      <div className="export-grid">
        <div className="export-card">
          <h3>Pack Summary</h3>
          <div className="export-stats">
            <span>Posts: {pack?.posts.length ?? 0}</span>
            <span>Categories: {pack?.categories.length ?? 0}</span>
            <span>Tags: {pack?.tags.length ?? 0}</span>
            <span>Attachments: {pack?.attachments.length ?? 0}</span>
            <span>QA flagged: {pack?.qa?.summary.flaggedPosts ?? 0}</span>
          </div>
          <label>
            Default BlogCMS author ID
            <input
              type="number"
              value={defaultAuthorId}
              onChange={(event) => setDefaultAuthorId(event.target.value)}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={preserveCanonical}
              onChange={(event) => setPreserveCanonical(event.target.checked)}
            />
            Preserve original canonical URLs
          </label>
          <div className="export-actions">
            <button className="btn-primary" onClick={downloadPack} disabled={!pack}>
              Download JSON pack
            </button>
            <button className="btn-secondary" onClick={downloadCsv} disabled={!pack}>
              Download CSV bundle
            </button>
            <button className="btn-secondary" onClick={downloadZip} disabled={!pack}>
              Download ZIP bundle
            </button>
          </div>
        </div>

        <div className="export-card">
          <h3>Direct API Import</h3>
          <label>
            BlogCMS Base URL
            <input
              type="text"
              placeholder="https://your-blogcms.com"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </label>
          <label>
            Admin JWT Token
            <input
              type="password"
              placeholder="Paste token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <button className="btn-secondary" onClick={importToApi} disabled={loading || !pack}>
            {loading ? 'Importing...' : 'Import to BlogCMS API'}
          </button>
          <p className="export-note">
            Media uploads are not automated yet; featured images keep the original WordPress URLs.
          </p>
        </div>
        <div className="export-card">
          <h3>Media Migration</h3>
          <p className="export-note">
            Generate a media manifest CSV or attempt to download attachments into a ZIP. Some hosts may block downloads due to CORS.
          </p>
          <div className="export-actions">
            <button className="btn-secondary" onClick={downloadMediaManifest} disabled={!data}>
              Download Media Manifest CSV
            </button>
            <button className="btn-secondary" onClick={downloadMediaZip} disabled={!data}>
              Download Media ZIP
            </button>
          </div>
        </div>
        <div className="export-card">
          <h3>Asset Laundromat</h3>
          <p className="export-note">
            Rename media files to SEO-friendly names, update Markdown references, and download an updated BlogCMS pack with a clean media folder.
          </p>
          <div className="export-stats">
            <span>Manifest items: {mediaAudit?.total ?? 0}</span>
            <span>Matched: {mediaAudit?.matched ?? 0}</span>
            <span>Missing: {mediaAudit?.missing ?? 0}</span>
            <span>Attachments: {mediaAudit?.attachments ?? 0}</span>
          </div>
          <div className="export-actions">
            <button className="btn-secondary" onClick={downloadCleanAssetZip} disabled={!data || !pack || assetLoading}>
              {assetLoading ? 'Preparing clean ZIP...' : 'Download Clean Media ZIP'}
            </button>
          </div>
        </div>
      </div>

      <div className="export-log">
        <h3>Import Log</h3>
        <div className="debug-log-list">
          {log.length === 0 ? <span>No import activity yet.</span> : log.map((entry, idx) => <div key={`${entry}-${idx}`}>{entry}</div>)}
        </div>
      </div>
    </div>
  );
};

export default ExportWizardScreenV2;
