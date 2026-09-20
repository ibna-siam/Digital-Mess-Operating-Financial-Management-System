# Phase 11 System Audit & Architecture Assessment

**Project:** MessMate (Digital Mess Operating & Financial Management System)  
**Phase:** Phase 11 — Production PWA, Mobile Experience, Offline Support, Installability, Web Push Notifications & Data Synchronization  
**Date:** September 19, 2026  
**Status:** Complete Initial Audit  

---

## 1. Executive Summary

This comprehensive audit inspects the current architecture across the frontend (React + Vite + TanStack Query), backend (Node.js + Express + Prisma ORM + Socket.io), and database (Supabase PostgreSQL + Supabase Storage). 

All Phases 1 through 10 have been validated and 140/140 unit and integration tests are passing. Phase 11 introduces installable Progressive Web App (PWA) capabilities, mobile-optimized UX, Web Push notifications, controlled offline synchronization, and resilient service-worker caching while preserving the absolute authority and consistency of financial ledger records.

---

## 2. Existing System Architecture

### Frontend Architecture
- **Framework & Build:** React 18.3.1 with Vite 5.4.11 and TypeScript 5.6.3.
- **Routing:** React Router DOM v6.28.0 with role-guarded routes (`ProtectedRoute`).
- **Data Fetching & Cache:** `@tanstack/react-query` v5.60.5 with query client configured (`refetchOnWindowFocus: false, retry: 1`).
- **Real-Time Client:** `socket.io-client` v4.8.3 encapsulated in `SocketContext.tsx` with custom hook `useSocketEvent`.
- **UI & Layout:** Handcrafted modular CSS design system (`styles/index.css`) featuring modern fintech tokens, responsive grids, and desktop sidebar + mobile bottom navigation (`MobileBottomNav.tsx`).

### Backend Architecture
- **Server:** Node.js Express 4.21.1 with ESM modules (`"type": "module"`), TSX runtime, Helmet security headers, CORS, and Express Rate Limit.
- **Database & ORM:** Supabase PostgreSQL 15 connected via Prisma ORM 5.22.0. Strict UUID primary keys, relational foreign keys with Cascade/Restrict constraints, and exact Decimal(12, 2) financial precision.
- **Authentication & RBAC:** JWT Bearer authentication with bcrypt password hashing. Multi-tier roles (`OWNER`, `MANAGER`, `TREASURER`, `MEMBER`, `VIEWER`) enforced via `authMiddleware` and `requireRole`.
- **Real-Time Gateway:** Socket.io 4.8.1 with room-based multi-tenant isolation (`mess:{messId}`) and private user channels (`user:{userId}`).
- **Storage:** Supabase Storage (`mess-documents` bucket) with Sharp image optimization and metadata indexing.

---

## 3. Current PWA Status

### Audit Findings:
1. **Manifest File:** Missing. There was no `manifest.json` linked in `index.html` nor present in `public/`.
2. **Service Worker:** Missing. No service worker was registered in `main.tsx` or `index.html`.
3. **App Icons & Splash:** No PWA icon assets (`192x192`, `512x512`, maskable icons, apple-touch-icon) were present.
4. **Installability:** Unmet. Browsers could not trigger `beforeinstallprompt` due to missing manifest and service worker.
5. **Display Mode:** Defaulted to standard browser tab (`browser`). Needs configuration to `standalone`.

---

## 4. Current Mobile Responsiveness Status

### Strengths:
- Responsive CSS media queries at `1200px`, `900px`, and `768px`.
- Mobile bottom navigation (`MobileBottomNav.tsx`) is already implemented for viewports below 768px (`Home`, `Meals`, `Ledger`, and `More` drawer toggle).
- Fluid flex/grid layouts on dashboard and member lists.

### Areas for Enhancement:
- **Small Screens (<360px):** Metric cards and financial data tables can overflow horizontally if not using priority column stacking or responsive card views.
- **Touch Target Sizing:** Certain action buttons and table menu triggers are below the recommended 44x44px touch target.
- **Form Keyboard Handling:** Inputs for amounts, dates, and phone numbers need mobile-specific `inputMode="decimal"`, `type="date"`, and `type="tel"` to evoke optimized virtual keyboards.
- **Connection Banner:** No persistent or unobtrusive indicator exists to inform mobile users when their cellular or Wi-Fi connectivity drops.

---

## 5. Current Caching Strategy

### Existing Mechanism:
- **TanStack Query (Memory Cache):** Caches API query responses in-memory per session. `refetchOnWindowFocus: false`, `retry: 1`. Query keys organized hierarchically (e.g. `['meals', messId, date]`, `['dashboard', messId]`).
- **Browser HTTP Cache:** Static bundle files hashed by Vite (`assets/index-*.js`, `assets/index-*.css`).
- **Storage Cache:** None currently persisted across browser sessions or offline restarts.

### Identified Gap:
- In the event of network disruption, navigating to a new tab or refreshing the page clears memory cache and shows an empty white screen or unhandled network failure.
- A controlled two-tier caching strategy is required:
  - **Service Worker Cache Storage:** For app shell and immutable static assets (Cache-First), and fallback HTML.
  - **IndexedDB Client Storage:** For non-sensitive read snapshots (e.g., last known meal summary, member list, offline pending queue).
  - **Absolute Isolation:** Private credentials, authentication tokens, and sensitive unverified financial statements must NEVER be written to unrestricted global caches.

---

## 6. Current Notification & Real-Time Architecture

### Existing Notification System (Phase 8):
- Model `Notification` in PostgreSQL with fields `userId`, `messId`, `category`, `priority`, `title`, `message`, `isRead`, `readAt`, and `idempotencyKey`.
- Real-time notification dispatching via `emitToUser(userId, 'notification:created', payload)`.
- In-app notification bell in `Header.tsx` with unread badge counter and polling/socket updates.

### Web Push Identified Gaps:
- Web Push protocol (VAPID / RFC 8291/8292) is not yet active.
- Need a `PushSubscription` model in PostgreSQL to store client push endpoints and authentication keys (`p256dh`, `auth`).
- Need user notification category preferences (`financial`, `meals`, `expenses`, `announcements`).
- Browser push event listener needed in the service worker to display background OS notifications even when the app tab is closed.

---

## 7. Current Socket.io Architecture

### Existing Behavior:
- Centralized `SocketContext.tsx` initiates connection on valid JWT token.
- Listens to rooms: `user:{userId}` and `mess:{messId}`.
- Emits events: `meal:updated`, `expense:created`, `notification:created`, etc.

### Offline Behavior Gap:
- When network drops, Socket.io attempts infinite reconnection loops, causing console warning spam and potential battery drain on mobile devices.
- On reconnection, the client did not explicitly trigger TanStack Query cache invalidation across all active queries.

---

## 8. Offline Risks & Financial Safety Doctrine

### CRITICAL RULES:
1. **Financial Immutability Over Offline Convenience:**
   - Financial mutations (creating expenses, approving payouts, settling balances, editing ledger allocations, posting utility bills) MUST NOT be executed silently offline.
   - If a user attempts to record or settle an expense while offline, the system must immediately inform them:
     > *"You are offline. Financial transactions require an active internet connection to guarantee ledger accuracy."*
   - No fake success animations. No unverified local ledger changes.
2. **Safe Offline Actions Allowed in Controlled Queue:**
   - Safe actions include:
     - Marking existing notifications as read (`NOTIFICATION_READ`).
     - Saving local drafts / personal notes.
     - Offline meal self-attendance intent (with immediate server reconciliation & conflict detection upon reconnect).
3. **Strict Idempotency Protection:**
   - Every queued action must carry a unique `idempotencyKey` (UUIDv4).
   - Server-side deduplication table ensures that network replays, retry bursts, or browser double-taps never result in duplicate operations.
4. **Stale Data Transparency:**
   - Any cached data displayed while offline must be clearly badged: *"Offline — Showing data cached at [time]"*.

---

## 9. Recommended Phase 11 Implementation Strategy

1. **PWA Manifest & Icons:**
   - Create `frontend/public/manifest.json` with standalone display, theme colors (`#10b981`), scope `/`, and high-resolution icons.
   - Link manifest in `frontend/index.html`.
2. **Service Worker (`frontend/public/sw.js`):**
   - Cache-First for static assets (scripts, styles, fonts, icons).
   - Network-First with safe fallback for application pages.
   - Network-Only for sensitive financial routes (`/api/v1/messes/*/financial/*`, `/api/v1/auth/*`).
   - Web Push event listener (`self.addEventListener('push', ...)`).
   - Notification click handler focusing or opening the app window.
3. **Database Schema Enhancements:**
   - Add `PushSubscription` model (endpoint, p256dh, auth, userAgent, isActive, relations to User).
   - Add `NotificationPreference` model (financial, meals, expenses, announcements, etc.).
   - Add `OfflineSyncAction` model for backend idempotency audit tracking.
4. **Backend Web Push & Sync Service:**
   - Configure VAPID keys using `web-push`.
   - Implement `PushNotificationService` with multi-device delivery, 410 Gone subscription pruning, and preference filtering.
   - Implement `SyncService` & route `POST /api/v1/sync/actions` with atomic transaction processing and duplicate suppression.
5. **Frontend Offline & Sync Architecture:**
   - Create `useNetworkStatus` hook to detect `online`, `offline`, `reconnecting`.
   - Create `OfflineStatusBar` to display state gracefully.
   - Implement `OfflineStorage` using native browser `IndexedDB`.
   - Implement `SyncEngine` with automatic execution on reconnect, exponential backoff, and conflict reporting.
6. **Mobile UX Refinements:**
   - Ensure tables collapse cleanly into cards or maintain sticky headers on viewports under 400px.
   - Enhance `MobileBottomNav.tsx` with quick action trigger and active indicators.
   - Add install banner prompting users to install the PWA.
7. **Regression & Test Verification:**
   - Create comprehensive unit and integration tests (`pwaOfflinePush.test.ts`).
   - Re-verify existing test suite (all 140 tests) with 0 regressions.
   - Verify frontend production build and type checking.
