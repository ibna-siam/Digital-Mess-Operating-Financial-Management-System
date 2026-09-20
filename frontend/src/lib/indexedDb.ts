/* ===================================================================
   MessMate IndexedDB Storage & Action Queue (Phase 11)
   Provides safe client storage for offline action queue & cached snapshots.
   =================================================================== */

export interface QueuedAction {
  idempotencyKey: string;
  actionType: string;
  messId?: string;
  payload: Record<string, any>;
  clientTimestamp: string;
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'CONFLICT' | 'BLOCKED';
  lastError?: string;
}

const DB_NAME = 'messmate_pwa_db';
const DB_VERSION = 1;
const QUEUE_STORE = 'action_queue';
const CACHE_STORE = 'cache_store';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported in this browser'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'idempotencyKey' });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class OfflineStorage {
  /**
   * Enqueue a safe action into IndexedDB with an authoritative UUIDv4 idempotency key.
   */
  static async enqueueAction(action: {
    actionType: string;
    messId?: string;
    payload: Record<string, any>;
  }): Promise<QueuedAction> {
    const db = await getDB();
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const queuedItem: QueuedAction = {
      idempotencyKey,
      actionType: action.actionType,
      messId: action.messId,
      payload: action.payload,
      clientTimestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING',
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.add(queuedItem);

      req.onsuccess = () => resolve(queuedItem);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all pending or retryable actions from queue.
   */
  static async getPendingActions(): Promise<QueuedAction[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: QueuedAction[] = req.result || [];
        resolve(all.filter((item) => item.status === 'PENDING' || item.status === 'SYNCING'));
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all actions including failed / conflict history.
   */
  static async getAllActions(): Promise<QueuedAction[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Update an existing queued action's status.
   */
  static async updateAction(
    idempotencyKey: string,
    updates: Partial<QueuedAction>
  ): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const getReq = store.get(idempotencyKey);

      getReq.onsuccess = () => {
        const current = getReq.result;
        if (!current) return resolve();

        const updated = { ...current, ...updates };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Remove action from queue.
   */
  static async removeAction(idempotencyKey: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.delete(idempotencyKey);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Cache arbitrary non-sensitive JSON data locally for offline reads.
   */
  static async setCachedData(key: string, data: any): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      const req = store.put({ key, data, timestamp: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve cached data snapshot.
   */
  static async getCachedData<T = any>(
    key: string
  ): Promise<{ data: T; timestamp: number } | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const store = tx.objectStore(CACHE_STORE);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
}
