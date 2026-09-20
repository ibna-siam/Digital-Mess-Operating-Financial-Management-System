# Phase 11 — Offline Strategy, Action Queue & Financial Integrity Doctrine

**System:** MessMate (Digital Mess Operating & Financial Management System)  
**Document:** Offline Strategy & Financial Integrity Doctrine  
**Version:** 1.0.0  

---

## 1. The Core Doctrine: Financial Immutability

> [!CAUTION]
> **Financial Integrity Supercedes Offline Convenience:**
> In a shared living mess where money, expenses, and settlements affect real people's trust and balances, **an offline client must never fabricate financial success states**. Ledger entries, expense creations, settlement approvals, and utility bill postings require authoritative server validation, balance verification, and cross-party consistency.

### Strict Barrier Matrix

| Category | Offline Allowed? | Action When Offline |
| :--- | :--- | :--- |
| **Expenses (Create/Edit/Delete)** | ❌ **BLOCKED** | Immediately informs user: *"You are offline. Financial transactions require an active internet connection."* |
| **Settlement Payments & Approvals** | ❌ **BLOCKED** | Prevented; no local mutation or fake approval. |
| **Utility Bill Postings & Approvals** | ❌ **BLOCKED** | Posting to ledger requires live database transaction. |
| **Financial Period Finalization/Close**| ❌ **BLOCKED** | Period calculations require live double-entry reconciliation. |
| **Mark Notification as Read** | ✅ **PERMITTED** | Queued in IndexedDB; synchronized upon reconnection. |
| **Mark All Notifications as Read** | ✅ **PERMITTED** | Queued in IndexedDB; executed on reconnect. |
| **Meal Attendance Intent** | ✅ **PERMITTED** | Queued in IndexedDB; server verifies member active status. |
| **Notification Preferences** | ✅ **PERMITTED** | Saved locally and synced on reconnect. |

---

## 2. Controlled Offline Action Queue

Located at: [`frontend/src/lib/indexedDb.ts`](file:///d:/Project/Digital%20Mess%20Operating%20&%20Financial%20Management%20System/frontend/src/lib/indexedDb.ts)

Every permitted action queued offline is encapsulated in a strict schema:

```typescript
interface QueuedAction {
  idempotencyKey: string;      // Cryptographic UUIDv4 generated at enqueue time
  actionType: string;          // Strictly whitelisted safe action identifier
  messId?: string;             // Tenant isolation scope
  payload: Record<string, any>;// Action parameters
  clientTimestamp: string;     // ISO timestamp when user tapped
  retryCount: number;          // Counter for exponential backoff
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'CONFLICT' | 'BLOCKED';
  lastError?: string;          // Human-readable diagnostics
}
```

---

## 3. Idempotency & Replay Protection

Located at: [`backend/src/services/syncService.ts`](file:///d:/Project/Digital%20Mess%20Operating%20&%20Financial%20Management%20System/backend/src/services/syncService.ts)

1. Every action contains an immutable client-generated `idempotencyKey`.
2. When received by `POST /api/v1/sync/actions`, the server checks `prisma.offlineSyncAction.findUnique({ where: { idempotencyKey } })`.
3. If previously processed, the backend returns the stored result immediately without re-executing any side effects.
4. If a network disruption occurs mid-flight and the client resends the queue, zero duplicate notifications, records, or actions can be created.

---

## 4. Conflict Handling & Resolution

- **Deleted / Missing Entities:** If an action attempts to mark a notification or update a member record that was deleted or archived on the server, the server responds with `status: 'CONFLICT'` and message: *"Entity no longer exists on server"*.
- **Ownership Conflicts:** Actions belonging to another user are rejected with `status: 'CONFLICT'`.
- **UI Feedback:** The client records the conflict in IndexedDB and notifies the user without crashing or halting the remaining synchronization batch.
