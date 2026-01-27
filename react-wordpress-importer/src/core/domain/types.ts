// src/core/domain/types.ts

export interface Post {
  PostId: number;
  Title: string;
  PostDate: string;
  Creator: string;
  Status: string;
  ContentEncoded: string;
  CleanedHtmlSource?: string;
  PostType: 'post' | 'page' | 'attachment';
  PostName: string;
}

export interface Attachment {
  PostId: number;
  AttachmentUrl: string;
  Title: string;
}

export interface Category {
  TermId: number;
  Name: string;
  Slug: string;
}

export interface Tag {
  TermId: number;
  Name: string;
  Slug: string;
}

export interface Author {
  AuthorId: number;
  AuthorLogin: string;
  AuthorEmail: string;
  AuthorDisplayName: string;
}

export interface Comment {
  CommentId: number;
  CommentPostId: number;
  CommentAuthor: string;
  CommentAuthorEmail: string;
  CommentAuthorUrl: string;
  CommentDate: string;
  CommentContent: string;
}

export interface PostMeta {
  PostId: number;
  MetaKey: string;
  MetaValue: string;
}

export interface SiteInfo {
  Title: string;
  Url: string;
  Description: string;
}

export interface InternalLink {
  SourcePostId: number;
  TargetPostId?: number;
  LinkText: string;
  TargetUrl: string;
  Status: 'resolved' | 'unresolved';
}
