import { openDbV2 } from '../db/openDbV2';
import { AttachmentV2 } from '../db/schemaV2';

export class AttachmentsRepoV2 {
  private storeName = 'attachmentsV2' as const;

  async list(): Promise<AttachmentV2[]> {
    const db = await openDbV2();
    return db.getAll(this.storeName);
  }

  async search(query: string): Promise<AttachmentV2[]> {
    const db = await openDbV2();
    const attachments = await db.getAll(this.storeName);
    const lowerCaseQuery = query.toLowerCase();
    return attachments.filter((attachment) => {
      const titleMatch = attachment.title.toLowerCase().includes(lowerCaseQuery);
      const urlMatch = attachment.attachment_url.toLowerCase().includes(lowerCaseQuery);
      const guidMatch = attachment.guid.toLowerCase().includes(lowerCaseQuery);
      return titleMatch || urlMatch || guidMatch;
    });
  }

  async get(id: number): Promise<AttachmentV2 | undefined> {
    const db = await openDbV2();
    return db.get(this.storeName, id);
  }

  async getByWordpressId(wordpress_id: string): Promise<AttachmentV2 | undefined> {
    const db = await openDbV2();
    return db.transaction(this.storeName).store.index('wordpress_id').get(wordpress_id);
  }

  async bulkInsert(attachments: AttachmentV2[]): Promise<void> {
    const db = await openDbV2();
    const tx = db.transaction(this.storeName, 'readwrite');
    await Promise.all(attachments.map((attachment) => tx.store.put(attachment)));
    await tx.done;
  }

  async update(attachment: AttachmentV2): Promise<void> {
    const db = await openDbV2();
    await db.put(this.storeName, attachment);
  }
}
