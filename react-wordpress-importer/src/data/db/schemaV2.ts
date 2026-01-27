import { DBSchema } from 'idb';

// Define interfaces for your data structures
export interface PostV2 {
  id?: number;
  wordpress_id: string;
  post_date: string;
  post_date_gmt: string;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_name: string;
  to_ping: string;
  pinged: string;
  post_modified: string;
  post_modified_gmt: string;
  post_content_filtered: string;
  post_parent: string;
  guid: string;
  menu_order: string;
  post_type: string;
  post_mime_type: string;
  comment_count: string;
  link: string;
  pubDate: string;
  category: string[]; // Array of category slugs
  tag: string[]; // Array of tag slugs
  post_format: string;
  terms: {
    category?: string[];
    post_tag?: string[];
    post_format?: string[];
  };
  author_id: string; // References AuthorV2.wordpress_id
}

export interface AttachmentV2 {
  id?: number;
  wordpress_id: string;
  post_id: string; // References PostV2.wordpress_id
  attachment_url: string;
  title: string;
  mime_type: string;
  guid: string;
}

export interface TaxonomyV2 {
  id?: number;
  wordpress_id: string;
  taxonomy_type: 'category' | 'post_tag' | 'post_format';
  slug: string;
  name: string;
  parent_id?: string; // For hierarchical taxonomies
  description?: string;
  count?: number;
}

export interface AuthorV2 {
  id?: number;
  wordpress_id: string;
  login: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  description: string;
  url: string;
}

export interface CommentV2 {
  id?: number;
  wordpress_id: string;
  post_id: string; // References PostV2.wordpress_id
  author: string;
  author_email: string;
  author_url: string;
  author_ip: string;
  date: string;
  date_gmt: string;
  content: string;
  approved: string;
  type: string;
  parent: string;
  user_id: string;
}

export interface PostMetaV2 {
  id?: number;
  wordpress_id: string;
  post_id: string; // References PostV2.wordpress_id or AttachmentV2.wordpress_id
  meta_key: string;
  meta_value: string;
}

export interface InternalLinkV2 {
  id?: number;
  source_post_id: string; // References PostV2.wordpress_id
  target_post_id: string; // References PostV2.wordpress_id
  link_text: string;
  link_url: string;
}

export interface AuditLogV2 {
  id?: number;
  timestamp: string;
  action: string;
  details: any;
}

export interface WordpressDBSchemaV2 extends DBSchema {
  postsV2: {
    key: number;
    value: PostV2;
    indexes: {
      'wordpress_id': string;
      'post_type': string;
      'post_status': string;
      'post_name': string;
      'author_id': string;
      'post_date': string;
    };
  };
  attachmentsV2: {
    key: number;
    value: AttachmentV2;
    indexes: {
      'wordpress_id': string;
      'post_id': string;
      'mime_type': string;
    };
  };
  taxonomyV2: {
    key: number;
    value: TaxonomyV2;
    indexes: {
      'wordpress_id': string;
      'taxonomy_type': string;
      'slug': string;
      'parent_id': string;
    };
  };
  authorsV2: {
    key: number;
    value: AuthorV2;
    indexes: {
      'wordpress_id': string;
      'login': string;
      'display_name': string;
    };
  };
  commentsV2: {
    key: number;
    value: CommentV2;
    indexes: {
      'wordpress_id': string;
      'post_id': string;
      'author_email': string;
      'date': string;
    };
  };
  postMetaV2: {
    key: number;
    value: PostMetaV2;
    indexes: {
      'wordpress_id': string;
      'post_id': string;
      'meta_key': string;
    };
  };
  internalLinksV2: {
    key: number;
    value: InternalLinkV2;
    indexes: {
      'source_post_id': string;
      'target_post_id': string;
    };
  };
  auditLogV2: {
    key: number;
    value: AuditLogV2;
    indexes: {
      'timestamp': string;
      'action': string;
    };
  };
}
