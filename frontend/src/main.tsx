import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './styles/index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration.js';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Only unregister service worker in active development mode (Vite HMR)
// In production builds and preview mode (even on localhost), register Service Worker for full PWA installability & offline support
if ((import.meta as any).env?.DEV) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
} else {
  // Register production Service Worker for installability, offline fallback and push notifications
  serviceWorkerRegistration.register({
    onUpdate: (registration) => {
      window.dispatchEvent(
        new CustomEvent('pwa-update-available', { detail: { registration } })
      );
    },
  });
}

