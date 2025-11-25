import { openDB, DBSchema, IDBPDatabase } from "idb";
import { StoredFile, DocCategory } from "../types";
import { lawList } from "../lawList";

// =====================================================
// DB SCHEMA
// =====================================================
interface JuristiDB extends DBSchema {
  files: {
    key: string;
    value: StoredFile & { category: DocCategory };
    indexes: { "by-category": DocCategory };
  };
}

const DB_NAME = "juristi-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<JuristiDB>>;

// -----------------------------------------------------
// DB INITIALIZER
// -----------------------------------------------------
const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<JuristiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("files", { keyPath: "id" });
        store.createIndex("by-category", "category");
      },
    });
  }
  return dbPromise;
};

// =====================================================
// SERVICE API
// =====================================================
export const dbService = {
  // ---------------------------------------------------
  // SAVE FILE (User uploads)
  // ---------------------------------------------------
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

    await db.put("files", record);
    const { content, ...metadata } = record;
    return { ...metadata, content: file };
  },

  // ---------------------------------------------------
  // GET ALL METADATA
  // ---------------------------------------------------
  async getAllMetadata(category: DocCategory): Promise<StoredFile[]> {
    const db = await getDB();
    return db.getAllFromIndex("files", "by-category", category);
  },

  // ---------------------------------------------------
  // GET FILE CONTENT (blob)
  // ---------------------------------------------------
  async getFileContent(id: string): Promise<Blob | undefined | null> {
    const db = await getDB();
    const record = await db.get("files", id);
    return record?.content || null;
  },

  // ---------------------------------------------------
  // DELETE FILE
  // ---------------------------------------------------
  async deleteFile(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("files", id);
  },

  // ---------------------------------------------------
  // BLOB → BASE64
  // ---------------------------------------------------
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  // =====================================================
  // SEED DATABASE (auto-sync laws from lawList)
  // =====================================================
  async seedDatabase(): Promise<boolean> {
    try {
      console.log("Duke sinkronizuar indeksin e ligjeve...");

      const fileNames = lawList;

      if (!Array.isArray(fileNames)) {
        console.warn("Lista e ligjeve është bosh ose e pavlefshme.");
        return false;
      }

      const db = await getDB();
      const tx = db.transaction("files", "readwrite");
      const store = tx.store;

      const existingKeys = await store.getAllKeys();
      let addedCount = 0;
      let deletedCount = 0;

      // ADD new laws
      for (const name of fileNames) {
        const id = name;
        if (!existingKeys.includes(id)) {
          await store.put({
            id,
            name,
            type: "application/pdf",
            size: 0,
            lastModified: Date.now(),
            content: null,
            category: DocCategory.LAW_BASE,
          });
          addedCount++;
        }
      }

      // REMOVE stale laws
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

      console.log(`Indeksi u përditësua: +${addedCount} të reja, -${deletedCount} të fshira.`);
      return true;
    } catch (error) {
      console.error("Gabim gjatë indeksimit:", error);
      return false;
    }
  },

  // =====================================================
  // HYDRATE FILE — DOWNLOAD PDF IF NOT CACHED
  // =====================================================
  async hydrateFile(id: string): Promise<Blob | null> {
    try {
      const db = await getDB();
      const record = await db.get("files", id);

      // Cached already?
      if (record?.content) {
        return record.content;
      }

      console.log(`Duke shkarkuar dokumentin: ${id}...`);

      // Encode URL-safe
      const encodedId = encodeURIComponent(id);

      const res = await fetch(`/ligje/${encodedId}?v=${Date.now
