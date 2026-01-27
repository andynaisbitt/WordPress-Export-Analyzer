import { Outlet, useLocation } from 'react-router-dom';
import Nav from './Nav';
import MotionLayoutV2 from '../../ui/motion/MotionLayoutV2';

const AppLayout = () => {
  const location = useLocation();
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
    '/media-manifest': 'Media Manifest',
    '/cleanup': 'Cleanup',
    '/content-qa': 'Content QA',
    '/export': 'Export',
  };
  const pageTitle =
    titleMap[location.pathname] ??
    (location.pathname.startsWith('/posts/') ? 'Post Editor' : location.pathname.replace('/', '').replace('-', ' '));

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="brand-eyebrow">WordPress</div>
          <div className="brand-title">Export Analyzer</div>
          <div className="brand-subtitle">Audit, parse, and ship content fast.</div>
        </div>
        <Nav />
        <div className="sidebar-footer">
          <span>Local-only processing • No server</span>
        </div>
      </aside>
      <main className="app-main">
        <header className="app-header">
          <div>
            <div className="page-kicker">Workspace</div>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="header-badge">V2</div>
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
