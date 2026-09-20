# MessMate — Digital Mess Operating & Financial Management System

**Phase 1: Foundation, Architecture & Professional UI Shell**

MessMate is a web-first SaaS platform designed for university students, bachelor messes, shared flats, and co-living groups. It replaces manual notebooks, messy spreadsheets, and informal messenger calculations with an automated, transparent operating system.

---

## 🏗️ Phase 1 Core Architecture

```text
MessMate Architecture
├── Frontend (React + TypeScript + Vite)
│   ├── Design System (Fintech Tokens: Emerald #10B981, Deep Slate #0B1320)
│   ├── Responsive Shell (Desktop Sidebar, Tablet Collapsible, Mobile Bottom Bar)
│   ├── TanStack Query + Auth Context
│   └── Typed API Client
│
├── Backend (Node.js + Express + TypeScript)
│   ├── Versioned REST API (/api/v1)
│   ├── Multi-tenant Workspace Isolation (Scoped by Mess ID)
│   ├── Capability-based RBAC (OWNER, TREASURER, MANAGER, MEMBER, VIEWER)
│   ├── Centralized Error & 404 Handlers
│   ├── Zod Schema Validation
│   ├── Rate Limiting & Security (Helmet, CORS)
│   └── Real-time Socket.io Foundation (Room-scoped events)
│
└── Database Layer (PostgreSQL via Prisma ORM)
    ├── Exact Decimal(12,2) for all financial currency amounts
    ├── Relational Integrity (Foreign Keys, Indexes, Unique Constraints)
    └── Models: User, Mess, MessMember, Room, Invitation, Notification, AuditLog
```

---

## 🚀 Quick Start & Development Guide

### Prerequisites
- Node.js >= 18.0.0 (Tested on Node.js v24.15)
- npm >= 9.0.0

### 1. Installation

Install dependencies for backend and frontend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `backend/.env`:

```bash
cp .env.example backend/.env
```

### 3. Database Generation & Setup

Generate Prisma Client:

```bash
cd backend
npx prisma generate
```

*(Optional)* If PostgreSQL is running:
```bash
npx prisma db push
npm run prisma:seed
```

### 4. Running the Development Servers

From the project root:

```bash
# Run Backend (Port 5000)
npm run dev:backend

# Run Frontend (Port 5173)
npm run dev:frontend
```

Open your browser at: `http://localhost:5173`

---

## 🔐 Authentication & Seed Credentials

For quick local preview and testing:
- **Email**: `admin@messmate.com`
- **Password**: `Password@123`
- *(Alternatively, use the "Fill Demo Credentials" button on the Login page)*

---

## 🧪 Testing & Verification

Run the automated backend test suite:

```bash
cd backend
npm run test
```

Run TypeScript compilation check:

```bash
# Backend typecheck
cd backend
npm run typecheck

# Frontend typecheck
cd ../frontend
npm run typecheck
```

Build production bundles:

```bash
# Frontend production build
cd frontend
npm run build

# Backend production build
cd ../backend
npm run build
```

---

## 📐 Financial Precision Guarantee

- **No Float Money**: Floating-point arithmetic is strictly forbidden for financial balances.
- **Server Authority**: All balances, meal rates, and splits are calculated and enforced server-side.
- **Decimal Fields**: PostgreSQL stores currency using `DECIMAL(12, 2)`.
