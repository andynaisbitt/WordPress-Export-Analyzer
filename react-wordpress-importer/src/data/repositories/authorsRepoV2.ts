import { openDbV2 } from '../db/openDbV2';
import { AuthorV2 } from '../db/schemaV2';

export class AuthorsRepoV2 {
  private storeName = 'authorsV2' as const;

  async addAuthor(author: AuthorV2): Promise<number> {
    const db = await openDbV2();
    return db.add(this.storeName, author);
  }

  async getAuthor(id: number): Promise<AuthorV2 | undefined> {
    const db = await openDbV2();
    return db.get(this.storeName, id);
  }

  async getAuthorByWordpressId(wordpress_id: string): Promise<AuthorV2 | undefined> {
    const db = await openDbV2();
    return db.transaction(this.storeName).store.index('wordpress_id').get(wordpress_id);
  }

  async updateAuthor(author: AuthorV2): Promise<void> {
    const db = await openDbV2();
    await db.put(this.storeName, author);
  }

  async deleteAuthor(id: number): Promise<void> {
    const db = await openDbV2();
    await db.delete(this.storeName, id);
  }

  async listAuthors(): Promise<AuthorV2[]> {
    const db = await openDbV2();
    return db.getAll(this.storeName);
  }

  async bulkInsert(authors: AuthorV2[]): Promise<void> {
    const db = await openDbV2();
    const tx = db.transaction(this.storeName, 'readwrite');
    await Promise.all(authors.map(author => tx.store.put(author)));
    await tx.done;
  }
}
