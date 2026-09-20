/* ===================================================================
   OfflineStatusBar — Lightweight, non-intrusive connection bar
   =================================================================== */

import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, Cloud } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus.js';

export const OfflineStatusBar: React.FC = () => {
  const { isOnline, wasOffline, isSyncing, pendingSyncCount, triggerSync } = useNetworkStatus();

  // If online, not syncing, and was not recently offline with no pending items, hide bar
  if (isOnline && !isSyncing && !wasOffline && pendingSyncCount === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        width: '100%',
        padding: '6px 16px',
        fontSize: '0.8rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
        zIndex: 40,
        backgroundColor: !isOnline
          ? '#fee2e2'
          : isSyncing
          ? '#e0e7ff'
          : '#d1fae5',
        color: !isOnline
          ? '#991b1b'
          : isSyncing
          ? '#3730a3'
          : '#065f46',
        borderBottom: `1px solid ${
          !isOnline ? '#fca5a5' : isSyncing ? '#c7d2fe' : '#a7f3d0'
        }`,
      }}
    >
      {!isOnline ? (
        <>
          <WifiOff size={15} />
          <span>
            You are offline. Showing cached information. (Financial mutations are paused)
          </span>
          {pendingSyncCount > 0 && (
            <span
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.7rem',
              }}
            >
              {pendingSyncCount} queued
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>Syncing offline actions with server...</span>
        </>
      ) : wasOffline ? (
        <>
          <CheckCircle2 size={15} />
          <span>Back online! All data up-to-date.</span>
        </>
      ) : pendingSyncCount > 0 ? (
        <>
          <Cloud size={15} />
          <span>{pendingSyncCount} offline action(s) ready to sync</span>
          <button
            onClick={triggerSync}
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Sync Now
          </button>
        </>
      ) : null}
    </div>
  );
};
