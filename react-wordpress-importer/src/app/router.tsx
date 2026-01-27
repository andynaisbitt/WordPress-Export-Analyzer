import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import UploadScreenV2 from '../features/upload/UploadScreenV2';
import DashboardV2 from '../features/dashboard/DashboardV2';
import PostsScreenV2 from '../features/posts/PostsScreenV2';
import PostDetailScreenV2 from '../features/posts/PostDetailScreenV2';
import PagesScreenV2 from '../features/pages/PagesScreenV2';
import CategoriesScreenV2 from '../features/categories/CategoriesScreenV2';
import TagsScreenV2 from '../features/tags/TagsScreenV2';
import AuthorsScreenV2 from '../features/authors/AuthorsScreenV2';
import CommentsScreenV2 from '../features/comments/CommentsScreenV2';
import AttachmentsScreenV2 from '../features/attachments/AttachmentsScreenV2';
import PostMetaScreenV2 from '../features/postmeta/PostMetaScreenV2';
import InternalLinksScreenV2 from '../features/internallinks/InternalLinksScreenV2';
import MediaManifestScreenV2 from '../features/mediaManifest/MediaManifestScreenV2';
import CleanupToolsScreenV2 from '../features/cleanup/CleanupToolsScreenV2';
import ExportWizardScreenV2 from '../features/export/ExportWizardScreenV2';
import ContentQaScreenV2 from '../features/analysis/ContentQaScreenV2';
import ExternalLinksScreenV2 from '../features/externallinks/ExternalLinksScreenV2';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardV2 />,
      },
      {
        path: 'upload',
        element: <UploadScreenV2 />,
      },
      {
        path: 'posts',
        element: <PostsScreenV2 />,
      },
      {
        path: 'posts/:id',
        element: <PostDetailScreenV2 />,
      },
      {
        path: 'pages',
        element: <PagesScreenV2 />,
      },
      {
        path: 'categories',
        element: <CategoriesScreenV2 />,
      },
      {
        path: 'tags',
        element: <TagsScreenV2 />,
      },
      {
        path: 'authors',
        element: <AuthorsScreenV2 />,
      },
      {
        path: 'comments',
        element: <CommentsScreenV2 />,
      },
      {
        path: 'attachments',
        element: <AttachmentsScreenV2 />,
      },
      {
        path: 'post-meta',
        element: <PostMetaScreenV2 />,
      },
      {
        path: 'internal-links',
        element: <InternalLinksScreenV2 />,
      },
      {
        path: 'external-links',
        element: <ExternalLinksScreenV2 />,
      },
      {
        path: 'media-manifest',
        element: <MediaManifestScreenV2 />,
      },
      {
        path: 'cleanup',
        element: <CleanupToolsScreenV2 />,
      },
      {
        path: 'export',
        element: <ExportWizardScreenV2 />,
      },
      {
        path: 'content-qa',
        element: <ContentQaScreenV2 />,
      },
    ],
  },
]);

export default router;
