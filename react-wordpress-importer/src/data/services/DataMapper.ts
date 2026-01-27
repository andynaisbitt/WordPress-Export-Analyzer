// react-wordpress-importer/src/services/DataMapper.ts

import { Post } from '../../core/domain/types/Post';
import { Category } from '../../core/domain/types/Category';
import { Tag } from '../../core/domain/types/Tag';
import { Author } from '../../core/domain/types/Author';
import { Comment } from '../../core/domain/types/Comment';
import { Attachment } from '../../core/domain/types/Attachment';
import { PostMeta } from '../../core/domain/types/PostMeta';
import { SiteInfo } from '../../core/domain/types/SiteInfo';

export interface MappedData {
  siteInfo: SiteInfo[];
  authors: Author[];
  categories: Category[];
  tags: Tag[];
  posts: Post[];
  attachments: Attachment[];
  comments: Comment[];
  postMeta: PostMeta[];
}

const toArray = <T>(value?: T | T[]): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getText = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    if ('__cdata' in value && value.__cdata !== undefined) {
      return String(value.__cdata ?? '');
    }
    if ('#text' in value && value['#text'] !== undefined) {
      return String(value['#text'] ?? '');
    }
  }
  return '';
};

const getInt = (value: any, fallback = 0): number => {
  const text = getText(value);
  const parsed = parseInt(text || '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export class DataMapper {
  map(parsedXml: any): MappedData {
    const channel = parsedXml?.rss?.channel ?? parsedXml?.channel ?? {};

    const siteInfo: SiteInfo[] = [
      { Key: 'title', Value: getText(channel.title) || 'Untitled Site' },
      { Key: 'description', Value: getText(channel.description) || '' },
      { Key: 'link', Value: getText(channel.link) || '' },
    ];

    const authors: Author[] = toArray(channel['wp:author']).map((a: any) => ({
      AuthorId: getInt(a?.['wp:author_id']),
      Login: getText(a?.['wp:author_login']),
      Email: getText(a?.['wp:author_email']),
      DisplayName: getText(a?.['wp:author_display_name']),
      FirstName: getText(a?.['wp:author_first_name']),
      LastName: getText(a?.['wp:author_last_name']),
    }));

    const rawCategories = toArray(channel['wp:category']);
    const rawTags = toArray(channel['wp:tag']);

    const categoryCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    const items = toArray(channel.item);
    const posts: Post[] = [];
    const attachments: Attachment[] = [];
    const comments: Comment[] = [];
    const postMeta: PostMeta[] = [];

    for (const item of items) {
      const postType = getText(item?.['wp:post_type']);
      const postId = getInt(item?.['wp:post_id']);

      if (postType === 'post' || postType === 'page') {
        const itemCategories = toArray(item?.category);
        const categorySlugs: string[] = [];
        const tagSlugs: string[] = [];
        itemCategories.forEach((cat: any) => {
          const domain = getText(cat?.['@_domain']);
          const nicename = getText(cat?.['@_nicename']) || getText(cat);
          if (!nicename) return;
          if (domain === 'category') {
            categoryCounts.set(nicename, (categoryCounts.get(nicename) || 0) + 1);
            categorySlugs.push(nicename);
          } else if (domain === 'post_tag') {
            tagCounts.set(nicename, (tagCounts.get(nicename) || 0) + 1);
            tagSlugs.push(nicename);
          }
        });

        posts.push({
          PostId: postId,
          Title: getText(item?.title) || 'Untitled Post',
          Link: getText(item?.link),
          PostType: postType,
          PostDate: getText(item?.['wp:post_date']) ? new Date(getText(item?.['wp:post_date'])) : null,
          PostName: getText(item?.['wp:post_name']),
          CleanedHtmlSource: getText(item?.['content:encoded']),
          ContentEncoded: getText(item?.['content:encoded']),
          Excerpt: getText(item?.['excerpt:encoded']) || getText(item?.description),
          CategorySlugs: categorySlugs,
          TagSlugs: tagSlugs,
          Creator: getText(item?.['dc:creator']),
          Status: getText(item?.['wp:status']),
        });

        toArray(item?.['wp:comment']).forEach((c: any) => {
          comments.push({
            CommentId: getInt(c?.['wp:comment_id']),
            PostId: postId,
            Author: getText(c?.['wp:comment_author']),
            AuthorEmail: getText(c?.['wp:comment_author_email']),
            AuthorUrl: getText(c?.['wp:comment_author_url']),
            AuthorIp: getText(c?.['wp:comment_author_IP']),
            Date: getText(c?.['wp:comment_date']) ? new Date(getText(c?.['wp:comment_date'])) : null,
            DateGmt: getText(c?.['wp:comment_date_gmt']) ? new Date(getText(c?.['wp:comment_date_gmt'])) : null,
            Content: getText(c?.['wp:comment_content']),
            Approved: getText(c?.['wp:comment_approved']),
            Type: getText(c?.['wp:comment_type']),
            Parent: getInt(c?.['wp:comment_parent']),
            UserId: getInt(c?.['wp:comment_user_id']),
          });
        });

        toArray(item?.['wp:postmeta']).forEach((pm: any) => {
          postMeta.push({
            PostId: postId,
            MetaKey: getText(pm?.['wp:meta_key']),
            MetaValue: getText(pm?.['wp:meta_value']),
          });
        });
      } else if (postType === 'attachment') {
        attachments.push({
          PostId: postId,
          Title: getText(item?.title),
          Url: getText(item?.['wp:attachment_url']) || getText(item?.guid),
          MimeType: getText(item?.['wp:post_mime_type']),
          PostName: getText(item?.['wp:post_name']),
          Guid: getText(item?.guid),
          ParentId: getInt(item?.['wp:post_parent']),
          Description: getText(item?.['excerpt:encoded']),
          Content: getText(item?.['content:encoded']),
        });
      }
    }

    const categories: Category[] = rawCategories.map((c: any) => {
      const nicename = getText(c?.['wp:category_nicename']);
      return {
        TermId: getInt(c?.['wp:term_id']),
        Nicename: nicename,
        Parent: getText(c?.['wp:category_parent']),
        Name: getText(c?.['wp:cat_name']),
        Description: getText(c?.['wp:category_description']),
        PostCount: categoryCounts.get(nicename) || 0,
      };
    });

    const tags: Tag[] = rawTags.map((t: any) => {
      const nicename = getText(t?.['wp:tag_nicename']) || getText(t?.['wp:tag_slug']);
      return {
        TermId: getInt(t?.['wp:term_id']),
        Nicename: nicename,
        Name: getText(t?.['wp:tag_name']),
        Description: getText(t?.['wp:tag_description']),
        PostCount: tagCounts.get(nicename) || 0,
      };
    });

    return {
      siteInfo,
      authors,
      categories,
      tags,
      posts,
      attachments,
      comments,
      postMeta,
    };
  }
}
