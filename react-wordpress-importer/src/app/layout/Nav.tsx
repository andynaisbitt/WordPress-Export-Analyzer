import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

type NavItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
};

const Icon = ({ path }: { path: string }) => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const icons = {
  dashboard: <Icon path="M4 11h7V4H4v7zm9 9h7v-9h-7v9zM4 20h7v-7H4v7zm9-16h7v5h-7V4z" />,
  upload: <Icon path="M12 3v10m0 0 4-4m-4 4-4-4M5 20h14" />,
  posts: <Icon path="M6 4h12M6 9h12M6 14h8M6 19h6" />,
  pages: <Icon path="M6 4h9l3 3v13H6zM15 4v3h3" />,
  categories: <Icon path="M4 6h7v7H4zM13 6h7v7h-7zM4 15h7v5H4zM13 15h7v5h-7z" />,
  tags: <Icon path="M4 12V4h8l8 8-8 8-8-8z" />,
  authors: <Icon path="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-7 8a7 7 0 0 1 14 0" />,
  comments: <Icon path="M4 5h16v10H7l-3 3z" />,
  attachments: <Icon path="M7 12l5-5a3 3 0 1 1 4 4l-6 6a4 4 0 0 1-6-6l6-6" />,
  meta: <Icon path="M4 6h16M4 12h16M4 18h10" />,
  internal: <Icon path="M4 12h16M12 4v16M8 8h8v8H8z" />,
  external: <Icon path="M14 4h6v6M20 4l-9 9M5 7v13h13" />,
  media: <Icon path="M4 6h16v12H4zM8 10l3 3 5-5 3 3" />,
  cleanup: <Icon path="M4 7h16M9 7V4h6v3M8 7l1 12h6l1-12" />,
  qa: <Icon path="M4 12l4 4 8-8" />,
  seo: <Icon path="M4 16l5-5 4 4 7-7" />,
  remediation: <Icon path="M6 12h12M6 7h12M6 17h8" />,
  graph: <Icon path="M5 19V8m0 11h5m5-11h4m-4 0V5m0 3h4" />,
  taxonomy: <Icon path="M12 3v6m0 0 4-4m-4 4-4-4M6 14h12v7H6z" />,
  export: <Icon path="M12 12v9m0-9-4 4m4-4 4 4M5 3h14v6H5z" />,
};

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Core',
    items: [
      { path: '/', label: 'Dashboard', icon: icons.dashboard },
      { path: '/upload', label: 'Upload', icon: icons.upload },
    ],
  },
  {
    title: 'Content',
    items: [
      { path: '/posts', label: 'Posts', icon: icons.posts },
      { path: '/pages', label: 'Pages', icon: icons.pages },
      { path: '/categories', label: 'Categories', icon: icons.categories },
      { path: '/tags', label: 'Tags', icon: icons.tags },
      { path: '/authors', label: 'Authors', icon: icons.authors },
      { path: '/comments', label: 'Comments', icon: icons.comments },
      { path: '/attachments', label: 'Attachments', icon: icons.attachments },
    ],
  },
  {
    title: 'Metadata',
    items: [
      { path: '/post-meta', label: 'Post Meta', icon: icons.meta },
      { path: '/media-manifest', label: 'Media Manifest', icon: icons.media },
    ],
  },
  {
    title: 'Links',
    items: [
      { path: '/internal-links', label: 'Internal Links', icon: icons.internal },
      { path: '/external-links', label: 'External Links', icon: icons.external },
      { path: '/knowledge-graph', label: 'Knowledge Graph', icon: icons.graph },
    ],
  },
  {
    title: 'Quality',
    items: [
      { path: '/content-qa', label: 'Content QA', icon: icons.qa },
      { path: '/seo-audit', label: 'SEO Audit', icon: icons.seo },
      { path: '/remediation', label: 'Remediation', icon: icons.remediation },
      { path: '/taxonomy-cleaner', label: 'Taxonomy Cleaner', icon: icons.taxonomy },
    ],
  },
  {
    title: 'Tools',
    items: [
      { path: '/cleanup', label: 'Cleanup', icon: icons.cleanup },
      { path: '/export', label: 'Export', icon: icons.export },
    ],
  },
];

const Nav = () => {
  const location = useLocation();

  return (
    <motion.nav
      className="sidebar-nav"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="nav-sections">
        {navSections.map((section) => (
          <div key={section.title} className="nav-section">
            <div className="nav-section-title">{section.title}</div>
            <ul className="nav-list">
              {section.items.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <motion.li key={link.path} layout className="nav-item">
                    <NavLink
                      to={link.path}
                      title={link.label}
                      className={({ isActive: isRouteActive }) =>
                        `nav-link${isRouteActive ? ' nav-link-active' : ''}`
                      }
                    >
                      {isActive && <motion.span layoutId="nav-pill" className="nav-pill" />}
                      <span className="nav-icon-wrap">{link.icon}</span>
                      <span className="nav-label">{link.label}</span>
                    </NavLink>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </motion.nav>
  );
};

export default Nav;
