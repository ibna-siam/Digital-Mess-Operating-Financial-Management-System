/* ===================================================================
   InstallPromptBanner — Polite PWA installation trigger
   =================================================================== */

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPromptBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If dismissed previously in this session, do not re-prompt aggressively
    if (sessionStorage.getItem('pwa_install_dismissed')) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_install_dismissed', 'true');
    setIsVisible(false);
  };

  useEffect(() => {
    const handleManualTrigger = () => {
      if (deferredPrompt) {
        setIsVisible(true);
        deferredPrompt.prompt().then(() => deferredPrompt.userChoice);
      } else {
        alert('To install MessMate, tap your browser menu (three dots or share icon) and select "Install app" or "Add to Home Screen".');
      }
    };

    window.addEventListener('pwa-trigger-install', handleManualTrigger);
    return () => window.removeEventListener('pwa-trigger-install', handleManualTrigger);
  }, [deferredPrompt]);

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className="pwa-install-banner fixed bottom-20 right-5 max-w-sm w-[calc(100%-32px)] sm:w-auto left-4 sm:left-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-45 flex flex-col gap-3 animate-slide-up"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/icons/icon-192.svg"
            alt="MessMate"
            style={{ width: '32px', height: '32px', borderRadius: '8px' }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Install MessMate
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Add to home screen for fast access & alerts
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleInstallClick}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Download size={15} />
          <span>Install App</span>
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
};
