/**
 * Robust, high-capacity IndexedDB Session Storage for Church Care Desktop.
 * Overcomes the 5MB browser/WebView localStorage quota limit, ensuring that
 * all high-resolution embedded ID card & birth certificate Base64 images
 * are preserved across application reloads without truncation or data loss.
 */

const DB_NAME = "ChurchCareCaseStudyDB";
const DB_VERSION = 1;
const STORE_NAME = "active_case_session";
const KEY = "latest_active_case";

export async function saveSessionToIndexedDB(data: any): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.put(data, KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      };

      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadSessionFromIndexedDB(): Promise<any | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.get(KEY);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function clearSessionFromIndexedDB(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.delete(KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      };
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
