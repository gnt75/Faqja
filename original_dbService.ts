import { openDB, DBSchema } from "idb";

// Skema e IndexedDB
interface FileDBSchema extends DBSchema {
  files: {
    key: string;
    value: {
      id: string;
      name: string;
      path: string;
      size: number;
      content?: Blob;
    };
  };
}

class DBService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.init();
  }

  async init() {
    return openDB<FileDBSchema>("juristi-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
      },
    });
  }

  // ----------------------------
  // HYDRATE FILE (fix version)
  // ----------------------------
  async hydrateFile(id: string) {
    const db = await this.dbPromise;

    const record = await db.get("files", id);
    if (!record) return null;

    const filePath = `/ligje/${record.path}`;

    try {
      const res = await fetch(filePath);

      if (!res.ok) {
        console.error(`❌ Fetch dështoi për ${filePath}:`, res.status, res.statusText);
        return null;
      }

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/pdf")) {
        const preview = await res.text();
        console.error("❌ Serveri ktheu CONTENT-JO-PDF: ", {
          contentType,
          preview: preview.slice(0, 200),
        });
        throw new Error(`Server returned non-PDF content for file ${id}`);
      }

      const blob = await res.blob();

      record.content = blob;
      record.size = blob.size;
      await db.put("files", record);

      return blob;
    } catch (e) {
      console.error(`❌ Dështoi shkarkimi i skedarit ${id}:`, e);
      return null;
    }
  }
}

export const dbService = new DBService();
