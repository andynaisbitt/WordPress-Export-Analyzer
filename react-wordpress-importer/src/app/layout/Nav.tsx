import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navLinks = [

  { path: '/', label: 'Dashboard' },

  { path: '/upload', label: 'Upload' },

  { path: '/posts', label: 'Posts' },

  { path: '/pages', label: 'Pages' },

  { path: '/categories', label: 'Categories' },

  { path: '/tags', label: 'Tags' },

  { path: '/authors', label: 'Authors' },

  { path: '/comments', label: 'Comments' },

  { path: '/attachments', label: 'Attachments' },

  { path: '/post-meta', label: 'Post Meta' },

  { path: '/internal-links', label: 'Internal Links' },

  { path: '/media-manifest', label: 'Media Manifest' },

  { path: '/cleanup', label: 'Cleanup' },

  { path: '/content-qa', label: 'Content QA' },

  { path: '/export', label: 'Export' },

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
      <ul className="nav-list">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <motion.li key={link.path} layout className="nav-item">
              <NavLink
                to={link.path}
                className={({ isActive: isRouteActive }) =>
                  `nav-link${isRouteActive ? ' nav-link-active' : ''}`
                }
              >
                {isActive && <motion.span layoutId="nav-pill" className="nav-pill" />}
                <span className="nav-label">{link.label}</span>
              </NavLink>
            </motion.li>
          );
        })}
      </ul>
    </motion.nav>
  );
};

export default Nav;
