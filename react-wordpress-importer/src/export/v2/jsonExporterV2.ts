import { openDbV2 } from '../../data/db/openDbV2';
import { StoreNames } from 'idb';
import { WordpressDBSchemaV2 } from '../../data/db/schemaV2';

export async function exportToJson(): Promise<Partial<Record<StoreNames<WordpressDBSchemaV2>, unknown[]>>> {
  const db = await openDbV2();
  const exportedData: Partial<Record<StoreNames<WordpressDBSchemaV2>, unknown[]>> = {};

  const storeNames = Array.from(db.objectStoreNames) as StoreNames<WordpressDBSchemaV2>[];

  for (const storeName of storeNames) {
    if (db.objectStoreNames.contains(storeName)) {
      exportedData[storeName] = await db.getAll(storeName);
    }
  }

  return exportedData;
}
