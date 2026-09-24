/* ===================================================================
   MessMate Production Service Worker (Phase 11)
   Cache Strategy: Cache-First for static assets, Network-First for shell,
   Strict Network-Only for sensitive financial & auth APIs.
   Full Web Push Notification & Background Sync lifecycle.
   =================================================================== */

const CACHE_NAME = 'messmate-sw-v3-static';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/favicon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon-512.svg',
];

// Sensitive APIs that must NEVER be cached by the service worker (strict server authority)
const NETWORK_ONLY_PREFIXES = [
  '/api/v1/auth/',
  '/api/v1/messes/',
  '/api/v1/sync/',
  '/socket.io/',
];

// 1. Service Worker Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(SHELL_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[ServiceWorker] Pre-cache warning:', err);
      })
  );
});

// 2. Service Worker Activation & Cache Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('messmate-sw-') && cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Deleting obsolete cache:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// 3. Fetch Event Interception & Caching Strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (mutations always require live network)
  if (request.method !== 'GET') {
    return;
  }

  // Bypass caching on Vite HMR & dev scripts to avoid stale code in dev mode
  if (
    url.pathname.includes('@vite') ||
    url.pathname.includes('@react-refresh') ||
    url.pathname.includes('/node_modules/.vite/') ||
    (url.port === '5173' && (url.pathname.startsWith('/src/') || url.pathname.includes('vite')))
  ) {
    return;
  }

  // A. Strict Network-Only for authentication, financial endpoints & documents
  const isSensitive = NETWORK_ONLY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  if (isSensitive) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'You are currently offline. This operation requires an active internet connection.',
            isOffline: true,
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'X-MessMate-Offline': 'true' },
          }
        );
      })
    );
    return;
  }

  // B. Navigation requests (HTML pages): Network-First, fallback to cached /offline.html or /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          const offlineHtml = await caches.match('/offline.html');
          if (offlineHtml) return offlineHtml;

          const shellResponse = await caches.match('/index.html');
          if (shellResponse) return shellResponse;

          return new Response(
            '<!DOCTYPE html><html><head><title>MessMate — Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;padding:32px;text-align:center;"><h2>You are offline</h2><p>MessMate requires an internet connection to load new pages.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // C. Static hashed assets (JS/CSS/Fonts/Images): Cache-First, fallback to network
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Return empty response for missing static assets offline
            return new Response('', { status: 408 });
          });
      })
    );
    return;
  }

  // D. General requests: Network-First
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// 4. Web Push Notification Reception
self.addEventListener('push', (event) => {
  let data = {
    title: 'MessMate Notification',
    body: 'You have a new update in your mess.',
    url: '/',
    icon: '/icons/icon-192.png',
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data.url || (data.data && data.data.url) || '/',
      ...data.data,
    },
    tag: data.tag || 'messmate-general',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open MessMate' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. Notification Click Handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 6. Listen for manual skipWaiting message from UI update banner
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
