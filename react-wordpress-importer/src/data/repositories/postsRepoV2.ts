import { openDbV2 } from '../db/openDbV2';
import { PostV2 } from '../db/schemaV2';

export class PostsRepoV2 {
  private storeName = 'postsV2' as const;

  async list(): Promise<PostV2[]> {
    const db = await openDbV2();
    return db.getAll(this.storeName);
  }

  async search(query: string): Promise<PostV2[]> {
    const db = await openDbV2();
    const posts = await db.getAll(this.storeName);
    const lowerCaseQuery = query.toLowerCase();
    return posts.filter(
      (post) =>
        post.post_title.toLowerCase().includes(lowerCaseQuery) ||
        post.post_content.toLowerCase().includes(lowerCaseQuery)
    );
  }

  async get(id: number): Promise<PostV2 | undefined> {
    const db = await openDbV2();
    return db.get(this.storeName, id);
  }

  async getByWordpressId(wordpress_id: string): Promise<PostV2 | undefined> {
    const db = await openDbV2();
    return db.transaction(this.storeName).store.index('wordpress_id').get(wordpress_id);
  }

  async bulkInsert(posts: PostV2[]): Promise<void> {
    const db = await openDbV2();
    const tx = db.transaction(this.storeName, 'readwrite');
    await Promise.all(posts.map((post) => tx.store.put(post)));
    await tx.done;
  }

  async update(post: PostV2): Promise<void> {
    const db = await openDbV2();
    await db.put(this.storeName, post);
  }
}
