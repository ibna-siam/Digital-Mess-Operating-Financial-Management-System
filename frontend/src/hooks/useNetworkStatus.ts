/* ===================================================================
   useNetworkStatus — Real-time connection & sync state monitor
   =================================================================== */

import { useState, useEffect, useCallback } from 'react';
import { SyncEngine } from '../lib/syncEngine.js';
import { OfflineStorage } from '../lib/indexedDb.js';
import { useAuth } from '../context/AuthContext.js';
import { useQueryClient } from '@tanstack/react-query';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const { token } = useAuth();
  const queryClient = useQueryClient();

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await OfflineStorage.getPendingActions();
      setPendingSyncCount(pending.length);
    } catch {
      // IndexedDB might not be available yet
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    await SyncEngine.processQueue(token, queryClient);
    await refreshPendingCount();
  }, [token, queryClient, refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 [Network] Connection restored');
      setIsOnline(true);
      setWasOffline(true);

      // Auto-trigger synchronization
      triggerSync();

      // Clear "wasOffline" banner after 5 seconds
      const timer = setTimeout(() => {
        setWasOffline(false);
      }, 5000);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      console.log('🌐 [Network] Connection lost');
      setIsOnline(false);
      setWasOffline(true);
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to SyncEngine notifications
    const unsubscribeSync = SyncEngine.subscribe((syncing, count) => {
      setIsSyncing(syncing);
      setPendingSyncCount(count);
    });

    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
    };
  }, [triggerSync, refreshPendingCount]);

  return {
    isOnline,
    wasOffline,
    isSyncing,
    pendingSyncCount,
    triggerSync,
  };
}
