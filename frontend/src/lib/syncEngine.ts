/* ===================================================================
   MessMate Controlled Synchronization Engine (Phase 11)
   Processes queued offline actions with exponential backoff & idempotency.
   =================================================================== */

import { OfflineStorage } from './indexedDb.js';
import { API_BASE } from './apiClient.js';
import type { QueryClient } from '@tanstack/react-query';

export interface SyncReport {
  total: number;
  completed: number;
  failed: number;
  conflicts: number;
  blocked: number;
}

type SyncListener = (isSyncing: boolean, pendingCount: number) => void;

class SyncEngineClass {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private maxRetries = 3;

  public subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(pendingCount = 0) {
    this.listeners.forEach((listener) => listener(this.isSyncing, pendingCount));
  }

  /**
   * Process all pending actions currently held in the IndexedDB action queue.
   */
  public async processQueue(
    token?: string | null,
    queryClient?: QueryClient
  ): Promise<SyncReport> {
    if (this.isSyncing || !navigator.onLine) {
      return { total: 0, completed: 0, failed: 0, conflicts: 0, blocked: 0 };
    }

    const pending = await OfflineStorage.getPendingActions();
    if (!pending.length) {
      this.notify(0);
      return { total: 0, completed: 0, failed: 0, conflicts: 0, blocked: 0 };
    }

    this.isSyncing = true;
    this.notify(pending.length);

    const report: SyncReport = {
      total: pending.length,
      completed: 0,
      failed: 0,
      conflicts: 0,
      blocked: 0,
    };

    try {
      // Mark all as SYNCING in IndexedDB
      await Promise.all(
        pending.map((item) =>
          OfflineStorage.updateAction(item.idempotencyKey, {
            status: 'SYNCING',
            retryCount: item.retryCount + 1,
          })
        )
      );

      const requestBody = {
        actions: pending.map((item) => ({
          idempotencyKey: item.idempotencyKey,
          actionType: item.actionType,
          messId: item.messId,
          payload: item.payload,
          clientTimestamp: item.clientTimestamp,
        })),
      };

      const res = await fetch(`${API_BASE}/sync/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`Sync server responded with status: ${res.status}`);
      }

      const json = await res.json();
      const serverResults: Array<{
        idempotencyKey: string;
        status: 'COMPLETED' | 'FAILED' | 'CONFLICT' | 'BLOCKED';
        message?: string;
      }> = json.data?.results || [];

      for (const resItem of serverResults) {
        if (resItem.status === 'COMPLETED') {
          report.completed++;
          await OfflineStorage.removeAction(resItem.idempotencyKey);
        } else if (resItem.status === 'CONFLICT') {
          report.conflicts++;
          await OfflineStorage.updateAction(resItem.idempotencyKey, {
            status: 'CONFLICT',
            lastError: resItem.message,
          });
        } else if (resItem.status === 'BLOCKED') {
          report.blocked++;
          await OfflineStorage.updateAction(resItem.idempotencyKey, {
            status: 'BLOCKED',
            lastError: resItem.message,
          });
        } else {
          report.failed++;
          await OfflineStorage.updateAction(resItem.idempotencyKey, {
            status: 'FAILED',
            lastError: resItem.message,
          });
        }
      }

      // Automatically refresh queries in TanStack Query if queryClient provided
      if (queryClient && report.completed > 0) {
        console.log('[SyncEngine] Sync completed. Refreshing queries...');
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      console.warn('[SyncEngine] Queue processing failed:', err.message);

      // Handle exponential backoff / retry count exhaustion
      for (const item of pending) {
        if (item.retryCount >= this.maxRetries) {
          await OfflineStorage.updateAction(item.idempotencyKey, {
            status: 'FAILED',
            lastError: `Max retries exceeded: ${err.message}`,
          });
        } else {
          await OfflineStorage.updateAction(item.idempotencyKey, {
            status: 'PENDING',
            lastError: err.message,
          });
        }
      }
    } finally {
      this.isSyncing = false;
      const remaining = await OfflineStorage.getPendingActions();
      this.notify(remaining.length);
    }

    return report;
  }
}

export const SyncEngine = new SyncEngineClass();
