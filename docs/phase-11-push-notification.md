# Phase 11 — Web Push Notification Architecture & Multi-Device Delivery

**System:** MessMate (Digital Mess Operating & Financial Management System)  
**Document:** Web Push Notification Architecture  
**Version:** 1.0.0  

---

## 1. Overview & Protocol Compliance

MessMate implements industry-standard Web Push according to **RFC 8291** (Message Encryption for Web Push) and **RFC 8292** (VAPID — Voluntary Application Server Identification).

This allows members to receive critical mess announcements, meal notifications, and bill reminders even when their browser tab is completely closed or the device is locked.

---

## 2. Push Architecture Workflow

```
                                  Application Event
                       (Announcement, Meal Update, System Alert)
                                          │
                                          ▼
                              NotificationService.create()
                                          │
                       ┌──────────────────┴──────────────────┐
                       ▼                                     ▼
            Persist to Supabase DB                  Emit Socket.io Event
            (Authoritative Source)                 (Instant In-App Update)
                       │
                       ▼
          PushNotificationService.sendPushToUser()
                       │
                       ├─ Check User Category Preferences
                       ├─ Fetch Active PushSubscriptions
                       │
                       ▼
          RFC 8291 Web Push Encrypted Dispatch
                       │
                       ▼
                Browser Push Service
            (Google FCM, Apple APNs, Mozilla)
                       │
                       ▼
              Client Service Worker
          (self.addEventListener('push', ...))
                       │
                       ▼
         Native OS System Notification Banner
```

---

## 3. Database Schema

Located in: `backend/prisma/schema.prisma`

### PushSubscription Model:
- `id`: UUID primary key
- `userId`: Relation to `User`
- `endpoint`: Unique Web Push delivery endpoint
- `p256dh`: Client public cryptographic key
- `auth`: Client authentication secret
- `userAgent`: Client operating system & browser
- `isActive`: Boolean flag for active subscription
- `lastUsedAt`: Timestamp of last successful dispatch

### NotificationPreference Model:
- `userId`: Foreign key unique to User
- `financial`: Boolean
- `expenses`: Boolean
- `meals`: Boolean
- `settlements`: Boolean
- `announcements`: Boolean
- `system`: Boolean (`true` mandatory, cannot be disabled for critical security)

---

## 4. Multi-Device Management & Subscription Pruning

- **Multi-Device Support:** A single user can be logged in on their desktop workstation, mobile Android phone, and personal tablet. Each device maintains an isolated `PushSubscription` record.
- **Automated Pruning (410 Gone / 404):** If a user uninstalls the PWA or revokes permission in browser settings, push services return HTTP 410 or 404. The backend automatically catches this and marks the subscription `isActive: false`, preventing unnecessary delivery attempts and optimizing network performance.
