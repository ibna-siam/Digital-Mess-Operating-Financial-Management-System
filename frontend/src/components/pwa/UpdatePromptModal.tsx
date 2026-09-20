/* ===================================================================
   UpdatePromptModal — Friendly PWA update notification pill
   =================================================================== */

import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowUpCircle } from 'lucide-react';
import { skipWaitingAndReload } from '../../serviceWorkerRegistration.js';

export const UpdatePromptModal: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        setWaitingWorker(registration);
        setShowPrompt(true);
      }
    });

    const handleUpdateFound = (e: any) => {
      if (e.detail?.registration?.waiting) {
        setWaitingWorker(e.detail.registration);
        setShowPrompt(true);
      }
    };

    window.addEventListener('pwa-update-available', handleUpdateFound);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateFound);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      skipWaitingAndReload(waitingWorker);
    } else {
      window.location.reload();
    }
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: '9999px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 55,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.85rem',
        fontWeight: 600,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <ArrowUpCircle size={18} style={{ color: '#10b981' }} />
      <span>New version available!</span>
      <button
        onClick={handleUpdate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          border: 'none',
          borderRadius: '9999px',
          padding: '4px 12px',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <RefreshCw size={12} />
        <span>Update</span>
      </button>
    </div>
  );
};
