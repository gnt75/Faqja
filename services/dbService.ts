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

      if (!Array.isArray(fileNames) || fileNames.length === 0) {
        console.log("Lista e ligjeve është bosh. Sigurohuni që keni bërë 'npm run generate'.");
        return false;
      }

      const db = await getDB();
      const existing = await db.getAllKeys('files');
      
      let count = 0;
      const tx = db.transaction('files', 'readwrite');
      
      for (const name of fileNames) {
          const id = name; 
          if (!existing.includes(id)) {
              await tx.store.put({
                  id: id,
                  name: name,
                  type: 'application/pdf',
                  size: 0, 
                  lastModified: Date.now(),
                  content: null, 
                  category: DocCategory.LAW_BASE
              });
              count++;
          }
      }
      await tx.done;
      console.log(`Indeksi u përditësua. U shtuan ${count} rekorde metadata.`);
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
        // Këtu fetch është OK sepse po kërkojmë PDF direkt, jo JSON
        const res = await fetch(`/ligje/${id}`);
        
        if (!res.ok) {
            console.error(`Serveri ktheu gabim për ${id}: ${res.status}`);
            throw new Error("File not found on server");
        }
        
        // Sigurohemi që nuk morëm HTML gabimisht
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