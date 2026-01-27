import { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import { WordpressDBSchemaV2 } from './schemaV2';

type Migration = (
  db: IDBPDatabase<WordpressDBSchemaV2>,
  transaction: IDBPTransaction<WordpressDBSchemaV2, StoreNames<WordpressDBSchemaV2>[], 'versionchange'>
) => void;

const migrations: { [key: number]: Migration } = {
  1: (db, transaction) => {
    void db;
    void transaction;
    // Version 1 setup is handled directly in openDbV2 for initial creation
    // This can be used for any data migrations needed if starting from an older schema version
    console.log('Running migration for version 1 (initial setup)');
  },
  // Add new migration functions for future schema changes
  // Example for version 2:
  // 2: (db, transaction) => {
  //   console.log('Running migration for version 2');
  //   const someStore = transaction.objectStore('someNewStore');
  //   someStore.createIndex('newIndex', 'newProperty');
  // }
};

export function migrateDb(
  db: IDBPDatabase<WordpressDBSchemaV2>,
  oldVersion: number,
  newVersion: number,
  transaction: IDBPTransaction<WordpressDBSchemaV2, StoreNames<WordpressDBSchemaV2>[], 'versionchange'>
) {
  for (let i = oldVersion + 1; i <= newVersion; i++) {
    const migration = migrations[i];
    if (migration) {
      migration(db, transaction);
    } else {
      console.warn(`No migration found for version ${i}`);
    }
  }
}
