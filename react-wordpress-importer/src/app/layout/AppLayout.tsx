import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Nav from './Nav';
import MotionLayoutV2 from '../../ui/motion/MotionLayoutV2';

const AppLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('wp-theme');
    return stored === 'dark' ? 'dark' : 'light';
  });
  const titleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/upload': 'Upload XML',
    '/posts': 'Posts',
    '/pages': 'Pages',
    '/categories': 'Categories',
    '/tags': 'Tags',
    '/authors': 'Authors',
    '/comments': 'Comments',
    '/attachments': 'Attachments',
    '/post-meta': 'Post Meta',
    '/internal-links': 'Internal Links',
    '/external-links': 'External Links',
    '/media-manifest': 'Media Manifest',
    '/cleanup': 'Cleanup',
    '/content-qa': 'Content QA',
    '/seo-audit': 'SEO Audit',
    '/remediation': 'Remediation',
    '/knowledge-graph': 'Knowledge Graph',
    '/taxonomy-cleaner': 'Taxonomy Cleaner',
    '/export': 'Export',
  };
  const pageTitle =
    titleMap[location.pathname] ??
    (location.pathname.startsWith('/posts/') ? 'Post Editor' : location.pathname.replace('/', '').replace('-', ' '));

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('wp-theme', theme);
  }, [theme]);

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="brand-eyebrow">WordPress</div>
          <div className="brand-title">Export Analyzer</div>
          <div className="brand-subtitle">Audit, parse, and ship content fast.</div>
        </div>
        <div className="sidebar-actions">
          <button className="btn-secondary" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            Theme: {theme === 'light' ? 'Light' : 'Dark'}
          </button>
          <button className="btn-secondary" onClick={() => setSidebarOpen((prev) => !prev)}>
            {sidebarOpen ? 'Collapse Sidebar' : 'Open Sidebar'}
          </button>
        </div>
        <Nav />
        <div className="sidebar-footer">
          <span>Local-only processing * No server</span>
        </div>
      </aside>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <main className="app-main">
        <header className="app-header">
          <div>
            <div className="page-kicker">Workspace</div>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setSidebarOpen((prev) => !prev)}>
              {sidebarOpen ? 'Hide Menu' : 'Show Menu'}
            </button>
            <div className="header-badge">V2</div>
          </div>
        </header>
        <MotionLayoutV2>
          <div className="page-card">
            <Outlet />
          </div>
        </MotionLayoutV2>
      </main>
    </div>
  );
};

export default AppLayout;
