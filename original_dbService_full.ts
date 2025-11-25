import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StoredFile, DocCategory } from '../types';
// Importojmë listën direkt nga kodi, jo me fetch
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

  // --- ON-DEMAND LOADING LOGIC (FIXED) ---

  async seedDatabase(): Promise<boolean> {
    try {
      console.log("Duke sinkronizuar indeksin e ligjeve (Direct Import)...");
      
      // Përdorim array-n e importuar direkt. Nuk ka më fetch errors.
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
      
      // 1. SHTO ligjet e reja
      for (const name of fileNames) {
          const id = name; 
          if (!existingKeys.includes(id)) {
              await store.put({
                  id: id,
                  name: name,
                  type: 'application/pdf',
                  size: 0, 
                  lastModified: Date.now(),
                  content: null, 
                  category: DocCategory.LAW_BASE
              });
              addedCount++;
          }
      }

      // 2. FSHI ligjet e vjetra (Clean up ghost files)
      // Kontrollojmë çdo skedar në DB. Nëse është "LAW_BASE" dhe nuk është në listën e re, e fshijmë.
      for (const key of existingKeys) {
          const record = await store.get(key);
          // Sigurohemi që të fshijmë vetëm ligjet automatike, jo dosjet e përdoruesit
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

  async hydrateFile(id: string): Promise<Blob | null> {
    try {
        const db = await getDB();
        const record = await db.get('files', id);
        
        if (record && record.content) {
            return record.content;
        }

        console.log(`Duke shkarkuar dokumentin: ${id}...`);
        
        // FIX: Encode the filename to handle spaces and special characters
        const encodedId = encodeURIComponent(id);
        
        const res = await fetch(`/ligje/${encodedId}?v=${Date.now()}`);
        
        if (!res.ok) {
            console.error(`Serveri ktheu gabim për ${id}: ${res.status}`);
            throw new Error("File not found on server");
        }
        
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("Serveri ktheu HTML në vend të PDF.");
        }

        const blob = await res.blob();
        
        if (record) {
            record.content = blob;
            record.size = blob.size;
            await db.put('files', record);
        }

        return blob;
    } catch (e) {
        console.error(`Dështoi shkarkimi i skedarit ${id}`, e);
        return null;
    }
  }
};