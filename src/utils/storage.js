/**
 * IndexedDB storage utility for Nana Banana Pro
 * Handles all database operations for history, collection, and analysis
 */

import {
  DB_NAME,
  DB_VERSION,
  HISTORY_STORE,
  COLLECTION_STORE,
  ANALYSIS_STORE,
} from './constants';

let db = null;
let dbInitPromise = null;

/**
 * Initialize IndexedDB with timeout protection
 * @returns {Promise<IDBDatabase>}
 */
export const initDB = () => {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise((resolve, reject) => {
    // Timeout after 10 seconds - if it takes longer, something is wrong
    const timeout = setTimeout(() => {
      console.error('❌ Database initialization timed out');
      reject(new Error('Database initialization timed out. Click the Reset Storage button or run resetNanaBananaStorage() in console.'));
    }, 10000);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        clearTimeout(timeout);
        console.error('❌ IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        db = request.result;
        console.log('✅ IndexedDB opened successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        console.log('📦 Creating IndexedDB stores...');
        const database = event.target.result;

        if (!database.objectStoreNames.contains(HISTORY_STORE)) {
          const historyStore = database.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ Created history store');
        }

        if (!database.objectStoreNames.contains(COLLECTION_STORE)) {
          const collectionStore = database.createObjectStore(COLLECTION_STORE, { keyPath: 'id' });
          collectionStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ Created collection store');
        }

        if (!database.objectStoreNames.contains(ANALYSIS_STORE)) {
          const analysisStore = database.createObjectStore(ANALYSIS_STORE, { keyPath: 'id' });
          analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ Created analysis store');
        }
      };

      request.onblocked = () => {
        clearTimeout(timeout);
        console.warn('⚠️ Database blocked - close other tabs with this site');
        reject(new Error('Database blocked. Close other tabs with this site and refresh.'));
      };
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });

  return dbInitPromise;
};

/**
 * Emergency reset function - clears all data and reinitializes
 * Also exposed globally for console access
 */
export const resetNanaBananaStorage = async () => {
  if (confirm('This will DELETE all your saved images, history, and collection. Continue?')) {
    try {
      if (db) {
        db.close();
        db = null;
      }
      dbInitPromise = null;

      await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => {
          alert('Please close other tabs with this site and try again');
          reject(new Error('Blocked'));
        };
      });

      alert('Storage cleared! Refreshing...');
      location.reload();
    } catch (e) {
      alert('Failed to clear storage: ' + e.message + '\n\nTry running this in console:\nindexedDB.deleteDatabase("GeminiImageToolsDB")');
    }
  }
};

// Expose reset function globally for console access
if (typeof window !== 'undefined') {
  window.resetNanaBananaStorage = resetNanaBananaStorage;
  console.log('💡 If storage issues occur, run: resetNanaBananaStorage()');
}

/**
 * Database helper functions
 */
export const dbHelpers = {
  /**
   * Add or update an item in a store
   * @param {string} storeName 
   * @param {Object} item 
   * @returns {Promise<IDBValidKey>}
   */
  put: (storeName, item) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * Get a single item by ID
   * @param {string} storeName 
   * @param {string} id 
   * @returns {Promise<Object|undefined>}
   */
  get: (storeName, id) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * Get all items from a store, sorted by timestamp descending
   * @param {string} storeName 
   * @returns {Promise<Array>}
   */
  getAll: (storeName) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          // Sort by timestamp descending (newest first)
          const results = (request.result || []).sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * Delete an item by ID
   * @param {string} storeName 
   * @param {string} id 
   * @returns {Promise<void>}
   */
  delete: (storeName, id) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * Clear all items from a store
   * @param {string} storeName 
   * @returns {Promise<void>}
   */
  clear: (storeName) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  },
};

/**
 * Generate a unique ID for database entries
 */
let idCounter = 0;
export const generateUniqueId = () => {
  return `${Date.now()}-${idCounter++}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Analysis History Functions
 * Manage analyze mode history with generated prompts
 */

/**
 * Save an analysis entry to history
 * @param {Object} entry - Analysis entry with mode, images, prompt, etc.
 * @returns {Promise<void>}
 */
export const saveAnalysisHistory = async (entry) => {
  await initDB();
  const historyEntry = {
    id: generateUniqueId(),
    timestamp: Date.now(),
    mode: entry.mode,
    images: entry.images,
    prompt: entry.prompt,
    modelProfile: entry.modelProfile,
    userInstruction: entry.userInstruction || ''
  };
  await dbHelpers.put(ANALYSIS_STORE, historyEntry);
};

/**
 * Get all analysis history entries
 * @returns {Promise<Array>} Array of history entries sorted by timestamp descending
 */
export const getAnalysisHistory = async () => {
  await initDB();
  return await dbHelpers.getAll(ANALYSIS_STORE);
};

/**
 * Delete a specific analysis history item
 * @param {string} id - ID of the history item to delete
 * @returns {Promise<void>}
 */
export const deleteAnalysisHistoryItem = async (id) => {
  await initDB();
  await dbHelpers.delete(ANALYSIS_STORE, id);
};

/**
 * Clear all analysis history
 * @returns {Promise<void>}
 */
export const clearAnalysisHistory = async () => {
  await initDB();
  await dbHelpers.clear(ANALYSIS_STORE);
};
