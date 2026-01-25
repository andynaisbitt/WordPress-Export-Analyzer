// react-wordpress-importer/src/services/IndexedDbService.ts

import { Post } from '../types/Post';
import { Category } from '../types/Category';
import { Tag } from '../types/Tag';
import { Author } from '../types/Author';
import { Comment } from '../types/Comment';
import { Attachment } from '../types/Attachment';
import { InternalLink } from '../types/InternalLink';
import { PostMeta } from '../types/PostMeta';
import { SiteInfo } from '../types/SiteInfo';

const DB_NAME = 'WordPressAnalyzerDB';
const DB_VERSION = 1;

export class IndexedDbService {
    private db: IDBDatabase | null = null;

    async openDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                // Create object stores for each data type
                db.createObjectStore('posts', { keyPath: 'PostId' });
                db.createObjectStore('categories', { keyPath: 'TermId' });
                db.createObjectStore('tags', { keyPath: 'TermId' });
                db.createObjectStore('authors', { keyPath: 'AuthorId' });
                db.createObjectStore('comments', { keyPath: 'CommentId' });
                db.createObjectStore('attachments', { keyPath: 'PostId' }); // Assuming PostId as key for attachments
                db.createObjectStore('internalLinks', { keyPath: 'Id', autoIncrement: true });
                db.createObjectStore('postMeta', { keyPath: 'MetaId', autoIncrement: true });
                db.createObjectStore('siteInfo', { keyPath: 'Key' });
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                console.log('IndexedDB opened successfully');
                resolve();
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    }

    async clearAllData(): Promise<void> {
        if (!this.db) {
            await this.openDatabase();
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not open."));
                return;
            }

            const transaction = this.db.transaction([
                'posts', 'categories', 'tags', 'authors', 'comments', 'attachments', 'internalLinks', 'postMeta', 'siteInfo'
            ], 'readwrite');

            transaction.oncomplete = () => {
                console.log('All object stores cleared.');
                resolve();
            };
            transaction.onerror = (event) => {
                console.error('Clear transaction error:', (event.target as IDBTransaction).error);
                reject((event.target as IDBTransaction).error);
            };

            transaction.objectStore('posts').clear();
            transaction.objectStore('categories').clear();
            transaction.objectStore('tags').clear();
            transaction.objectStore('authors').clear();
            transaction.objectStore('comments').clear();
            transaction.objectStore('attachments').clear();
            transaction.objectStore('internalLinks').clear();
            transaction.objectStore('postMeta').clear();
            transaction.objectStore('siteInfo').clear();
        });
    }

    async addData<T>(storeName: string, data: T[]): Promise<void> {
        if (!this.db) {
            await this.openDatabase();
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not open."));
                return;
            }

            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            data.forEach(item => {
                store.add(item);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
        });
    }

    async getAllData<T>(storeName: string): Promise<T[]> {
        if (!this.db) {
            await this.openDatabase();
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not open."));
                return;
            }

            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve((event.target as IDBRequest).result);
            };

            request.onerror = (event) => {
                reject((event.target as IDBRequest).error);
            };
        });
    }

    // Example methods for specific data types
    async getPosts(): Promise<Post[]> {
        return this.getAllData<Post>('posts');
    }

    async getCategories(): Promise<Category[]> {
        return this.getAllData<Category>('categories');
    }

    async getTags(): Promise<Tag[]> {
        return this.getAllData<Tag>('tags');
    }

    async getAuthors(): Promise<Author[]> {
        return this.getAllData<Author>('authors');
    }

    async getComments(): Promise<Comment[]> {
        return this.getAllData<Comment>('comments');
    }
    
    async getAttachments(): Promise<Attachment[]> {
        return this.getAllData<Attachment>('attachments');
    }

    async getInternalLinks(): Promise<InternalLink[]> {
        return this.getAllData<InternalLink>('internalLinks');
    }

    async getPostMeta(): Promise<PostMeta[]> {
        return this.getAllData<PostMeta>('postMeta');
    }

    async getSiteInfo(): Promise<SiteInfo[]> {
        return this.getAllData<SiteInfo>('siteInfo');
    }
}
