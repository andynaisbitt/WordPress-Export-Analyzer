// react-wordpress-importer/src/services/IndexedDbService.ts

import { Post } from '../../core/domain/types/Post';
import { Category } from '../../core/domain/types/Category';
import { Tag } from '../../core/domain/types/Tag';
import { Author } from '../../core/domain/types/Author';
import { Comment } from '../../core/domain/types/Comment';
import { Attachment } from '../../core/domain/types/Attachment';
import { InternalLink } from '../../core/domain/types/InternalLink';
import { ExternalLink } from '../../core/domain/types/ExternalLink';
import { PostMeta } from '../../core/domain/types/PostMeta';
import { SiteInfo } from '../../core/domain/types/SiteInfo';

const DB_NAME = 'WordPressAnalyzerDB';
const DB_VERSION = 2;

export class IndexedDbService {
    private db: IDBDatabase | null = null;

    async openDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const ensureStore = (name: string, options: IDBObjectStoreParameters) => {
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name, options);
                    }
                };

                // Create object stores for each data type
                ensureStore('posts', { keyPath: 'PostId' });
                ensureStore('categories', { keyPath: 'TermId' });
                ensureStore('tags', { keyPath: 'TermId' });
                ensureStore('authors', { keyPath: 'AuthorId' });
                ensureStore('comments', { keyPath: 'CommentId' });
                ensureStore('attachments', { keyPath: 'PostId' }); // Assuming PostId as key for attachments
                ensureStore('internalLinks', { keyPath: 'Id', autoIncrement: true });
                ensureStore('externalLinks', { keyPath: 'Id', autoIncrement: true });
                ensureStore('postMeta', { keyPath: 'MetaId', autoIncrement: true });
                ensureStore('siteInfo', { keyPath: 'Key' });
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
                'posts', 'categories', 'tags', 'authors', 'comments', 'attachments',
                'internalLinks', 'externalLinks', 'postMeta', 'siteInfo'
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
            transaction.objectStore('externalLinks').clear();
            transaction.objectStore('postMeta').clear();
            transaction.objectStore('siteInfo').clear();
        });
    }

    async clearStore(storeName: string): Promise<void> {
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
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject((event.target as IDBRequest).error);
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

    async getStoreCount(storeName: string): Promise<number> {
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
            const request = store.count();

            request.onsuccess = (event) => resolve((event.target as IDBRequest).result);
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async getStorePage<T>(storeName: string, page: number, pageSize: number): Promise<T[]> {
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
            const request = store.openCursor();
            const results: T[] = [];
            const start = (page - 1) * pageSize;
            let index = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                if (!cursor) {
                    resolve(results);
                    return;
                }
                if (index >= start && results.length < pageSize) {
                    results.push(cursor.value as T);
                }
                index += 1;
                if (results.length >= pageSize) {
                    resolve(results);
                    return;
                }
                cursor.continue();
            };

            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async searchPostMeta(query: string, limit = 500): Promise<PostMeta[]> {
        if (!this.db) {
            await this.openDatabase();
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error("Database not open."));
                return;
            }

            const transaction = this.db.transaction('postMeta', 'readonly');
            const store = transaction.objectStore('postMeta');
            const request = store.openCursor();
            const results: PostMeta[] = [];
            const needle = query.toLowerCase();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                if (!cursor) {
                    resolve(results);
                    return;
                }
                const meta = cursor.value as PostMeta;
                if (
                    meta.MetaKey.toLowerCase().includes(needle) ||
                    meta.MetaValue.toLowerCase().includes(needle) ||
                    meta.PostId.toString().includes(needle)
                ) {
                    results.push(meta);
                    if (results.length >= limit) {
                        resolve(results);
                        return;
                    }
                }
                cursor.continue();
            };

            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async getDataById<T>(storeName: string, id: number | string): Promise<T | undefined> {
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
            const request = store.get(id);

            request.onsuccess = (event) => {
                resolve((event.target as IDBRequest).result);
            };

            request.onerror = (event) => {
                reject((event.target as IDBRequest).error);
            };
        });
    }

    async updateData<T>(storeName: string, value: T): Promise<void> {
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
            const request = store.put(value);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async deleteData(storeName: string, id: number | string): Promise<void> {
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
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject((event.target as IDBRequest).error);
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

    async getExternalLinks(): Promise<ExternalLink[]> {
        return this.getAllData<ExternalLink>('externalLinks');
    }

    async getPostMeta(): Promise<PostMeta[]> {
        return this.getAllData<PostMeta>('postMeta');
    }

    async getSiteInfo(): Promise<SiteInfo[]> {
        return this.getAllData<SiteInfo>('siteInfo');
    }
}
