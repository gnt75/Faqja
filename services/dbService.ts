import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StoredFile, DocCategory } from '../types';
import { lawList } from '../lawList';

interface JuristiDB extends DBSchema {
  files: {
    key: string;
    value: StoredFile & { category: DocCategory };
    indexes: { 'by-category': DocCategory };
  };
}

const DB_NAME = 'juristi-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<JuristiDB>>;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<JuristiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('files', { keyPath: 'id' });
        store.createIndex('by-category', 'category');
      },
    });
  }
  return dbPromise;
};

export const dbService = {
  async saveFile(file: File, category: DocCategory): Promise<StoredFile> {
    const db = await getDB();
    const id = crypto.randomUUID();

    const record: StoredFile & { category: DocCategory } = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      content: file,
      category,
    };

    await db.put('files', record);
    const { content, ...metadata } = record;
    return { ...metadata, content: file };
  },

  async getAllMetadata(category: DocCategory): Promise<StoredFile[]> {
    const db = await getDB();
    return db.getAllFromIndex('files', 'by-category', category);
  },

  async getFileContent(id: string): Promise<Blob | undefined | null> {
    const db = await getDB();
    const record = await db.get('files', id);
    return record?.content;
  },

  async deleteFile(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('files', id);
  },

  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  // ================================
  // SEED DATABASE (correct)
  // ================================
  async seedDatabase(): Promise<boolean> {
    try {
      console.log("Duke sinkronizuar indeksin e ligjeve (Direct Import)...");

      const fileNames = lawList;

      if (!Array.isArray(fileNames)) {
        console.log("Lista e ligjeve është bosh ose e pavlefshme.");
        return false;
      }

      const db = await getDB();
      const tx = db.transaction('files', 'readwrite');
      const store = tx.store;

      const existingKeys = await store.getAllKeys();

      let addedCount = 0;
      let deletedCount = 0;

      // Add new laws
      for (const name of fileNames) {
        const id = name;
        if (!existingKeys.includes(id)) {
          await store.put({
            id,
            name,
            type: 'application/pdf',
            size: 0,
            lastModified: Date.now(),
            content: null,
            category: DocCategory.LAW_BASE,
          });
          addedCount++;
        }
      }

      // Remove stale laws
      for (const key of existingKeys) {
        const record = await store.get(key);

        if (record && record.category === DocCategory.LAW_BASE) {
          if (!fileNames.includes(record.name)) {
            await store.delete(key);
            deletedCount++;
          }
        }
      }

      await tx.done;

      console.log(`Indeksi u përditësua: +${addedCo
