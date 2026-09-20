# Phase 11 — Production PWA Architecture & Service Worker Specification

**System:** MessMate (Digital Mess Operating & Financial Management System)  
**Document:** PWA Architecture & Service Worker Specification  
**Version:** 1.0.0  

---

## 1. Overview & Objectives

Phase 11 transforms MessMate into a full Progressive Web App (PWA) that can be installed on Android (Chrome, Edge, Samsung Internet), desktop environments (Chrome, Edge), and iOS Safari/WebClip.

### Core Architectural Pillars:
1. **App Shell Architecture:** Fast local bootstrap with zero network roundtrip for essential styles, scripts, and navigation structures.
2. **Strict Financial Security Barrier:** Authoritative ledger mutations, payments, bills, and monthly closings are **strictly excluded from service worker caching** to prevent any data leakage, cross-tenant pollution, or stale financial misrepresentations.
3. **Multi-Platform Installability:** Manifest v3 compliant configuration with maskable icons, standalone display mode, orientation locking, and role-respecting app shortcuts.
4. **Resilient Background Updates:** Silent worker detection with user-friendly "Update Now" prompts without breaking active sessions or logging users out.

---

## 2. Web App Manifest Specification

Located at: [`frontend/public/manifest.json`](file:///d:/Project/Digital%20Mess%20Operating%20&%20Financial%20Management%20System/frontend/public/manifest.json)

| Property | Value | Rationale |
| :--- | :--- | :--- |
| `name` | `MessMate — Digital Mess Operating & Financial Management System` | Full display name for splash screens & app stores |
| `short_name` | `MessMate` | Truncation-safe name for home screens |
| `start_url` | `/` | Launches at the operational home view |
| `display` | `standalone` | Native app appearance without browser chrome / URL bar |
| `orientation` | `portrait-primary` | Standard mobile orientation |
| `theme_color` | `#10b981` | Emerald branding matches header & status bars |
| `background_color`| `#ffffff` | Clean background for seamless splash transitions |

### Icon Assets & Compatibility
- **192x192 PNG & SVG:** Standard home screen launch icon (`/icons/icon-192.png`).
- **512x512 PNG & SVG:** High-DPI splash and task switcher icon (`/icons/icon-512.png`).
- **Maskable Icons:** Adaptive circular / rounded square cropping on Android 8+ (`/icons/icon-maskable-192.png`, `/icons/icon-maskable-512.png`).

---

## 3. Service Worker Caching Strategies

Located at: [`frontend/public/sw.js`](file:///d:/Project/Digital%20Mess%20Operating%20&%20Financial%20Management%20System/frontend/public/sw.js)

### Cache Routing Matrix

```
                      Incoming Request
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Sensitive Endpoint?                Static / Shell?
   (/api/v1/auth/*,                   (/assets/*, icons,
    /api/v1/messes/*/financial/*,      fonts, index.html)
    /api/v1/sync/*)                           │
            │                                 │
     [NETWORK ONLY]                     [CACHE FIRST]
  (Bypass SW Cache entirely;         (Return instant cache,
   Return 503 if offline)             revalidate in background)
```

1. **Cache-First (Static Hashed Assets):**
   - Covers: `/assets/*.js`, `/assets/*.css`, `/icons/*`, and fonts.
   - Assets are hashed by Vite. If present in Cache Storage, served instantly; otherwise fetched and cached.
2. **Network-First with Shell Fallback (Navigations):**
   - For page navigations (`request.mode === 'navigate'`).
   - Tries live network first; if offline, serves cached application shell (`/index.html`) which bootstraps the client router in offline mode.
3. **Network-Only (Strict Financial & Auth Protection):**
   - Applied to `/api/v1/auth/*`, `/api/v1/messes/*/financial/*`, `/api/v1/messes/*/documents/*`, `/socket.io/*`.
   - Never cached in Service Worker. Guarantees that sensitive financial statements, ledger entries, or session tokens are never saved in shared browser caches.

---

## 4. Application Update Lifecycle

1. **Registration:** Managed via [`frontend/src/serviceWorkerRegistration.ts`](file:///d:/Project/Digital%20Mess%20Operating%20&%20Financial%20Management%20System/frontend/src/serviceWorkerRegistration.ts).
2. **Detection:** When a new build is deployed, the browser detects changed byte content in `/sw.js` and downloads the new worker into a `waiting` state.
3. **Prompt:** [`UpdatePromptModal.tsx`](file:///d:/Project/Digital%20Mess%20Operating%20&%20Financial%20Management%20System/frontend/src/components/pwa/UpdatePromptModal.tsx) displays an unobtrusive "New version available" banner.
4. **Activation:** Clicking "Update" posts `{ type: 'SKIP_WAITING' }` to the waiting worker and calls `window.location.reload()`, preserving existing auth tokens.
