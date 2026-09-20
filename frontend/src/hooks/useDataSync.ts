import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncEvents, SyncTopic } from '../lib/syncEvents.js';

/**
 * useDataSync
 * Subscribes to global synchronization events (triggered by mutations, socket pushes, or other tabs).
 * Automatically invalidates corresponding React Query keys and invokes optional custom fetch/refresh callbacks.
 * 
 * @param topics Array of sync topics to watch (e.g. ['expenses', 'dashboard'])
 * @param onSync Optional callback to run when any of the topics fire (e.g. fetchRecords)
 */
export function useDataSync(topics: (SyncTopic | string)[], onSync?: () => void) {
  const queryClient = useQueryClient();
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!topics || topics.length === 0) return;

    const handler = (_payload?: any) => {
      // Invalidate React Query caches for matching topic
      topics.forEach((t) => {
        queryClient.invalidateQueries({ queryKey: [t] });
      });

      // Debounced call to custom callback if provided
      if (onSyncRef.current) {
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
          onSyncRef.current?.();
          debounceTimerRef.current = null;
        }, 80);
      }
    };

    const unsubscribers = topics.map((t) => syncEvents.on(t, handler));

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [topics.join(','), queryClient]);
}
