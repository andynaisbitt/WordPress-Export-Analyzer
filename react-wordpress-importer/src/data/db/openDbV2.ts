import { openDB } from 'idb';
import { WordpressDBSchemaV2 } from './schemaV2';
import { migrateDb } from './migrationsV2'; // Assuming migrationsV2.ts will be created

const DB_NAME = 'wordpress-data-v2';
const DB_VERSION = 1; // Initial version

export async function openDbV2() {
  return openDB<WordpressDBSchemaV2>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      const resolvedNewVersion = newVersion ?? oldVersion;
      migrateDb(db, oldVersion, resolvedNewVersion, transaction);

      // Define object stores and indexes for version 1
      if (oldVersion < 1) {
        // Posts store
        const postsStore = db.createObjectStore('postsV2', { keyPath: 'id', autoIncrement: true });
        postsStore.createIndex('wordpress_id', 'wordpress_id', { unique: true });
        postsStore.createIndex('post_type', 'post_type');
        postsStore.createIndex('post_status', 'post_status');
        postsStore.createIndex('post_name', 'post_name');
        postsStore.createIndex('author_id', 'author_id');
        postsStore.createIndex('post_date', 'post_date');

        // Attachments store
        const attachmentsStore = db.createObjectStore('attachmentsV2', { keyPath: 'id', autoIncrement: true });
        attachmentsStore.createIndex('wordpress_id', 'wordpress_id', { unique: true });
        attachmentsStore.createIndex('post_id', 'post_id');
        attachmentsStore.createIndex('mime_type', 'mime_type');

        // Taxonomy store
        const taxonomyStore = db.createObjectStore('taxonomyV2', { keyPath: 'id', autoIncrement: true });
        taxonomyStore.createIndex('wordpress_id', 'wordpress_id', { unique: true });
        taxonomyStore.createIndex('taxonomy_type', 'taxonomy_type');
        taxonomyStore.createIndex('slug', 'slug');
        taxonomyStore.createIndex('parent_id', 'parent_id');

        // Authors store
        const authorsStore = db.createObjectStore('authorsV2', { keyPath: 'id', autoIncrement: true });
        authorsStore.createIndex('wordpress_id', 'wordpress_id', { unique: true });
        authorsStore.createIndex('login', 'login');
        authorsStore.createIndex('display_name', 'display_name');

        // Comments store
        const commentsStore = db.createObjectStore('commentsV2', { keyPath: 'id', autoIncrement: true });
        commentsStore.createIndex('wordpress_id', 'wordpress_id', { unique: true });
        commentsStore.createIndex('post_id', 'post_id');
        commentsStore.createIndex('author_email', 'author_email');
        commentsStore.createIndex('date', 'date');

        // Post Meta store
        const postMetaStore = db.createObjectStore('postMetaV2', { keyPath: 'id', autoIncrement: true });
        postMetaStore.createIndex('wordpress_id', 'wordpress_id', { unique: false }); // wordpress_id can be repeated for different meta keys
        postMetaStore.createIndex('post_id', 'post_id');
        postMetaStore.createIndex('meta_key', 'meta_key');

        // Internal Links store
        const internalLinksStore = db.createObjectStore('internalLinksV2', { keyPath: 'id', autoIncrement: true });
        internalLinksStore.createIndex('source_post_id', 'source_post_id');
        internalLinksStore.createIndex('target_post_id', 'target_post_id');

        // Audit Log store
        const auditLogStore = db.createObjectStore('auditLogV2', { keyPath: 'id', autoIncrement: true });
        auditLogStore.createIndex('timestamp', 'timestamp');
        auditLogStore.createIndex('action', 'action');
      }
    },
  });
}
