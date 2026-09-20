**Digital Mess Operating & Financial Management System**

_Product Requirements Document (PRD) • Web-first, PWA-ready_

Document Version: 1.0

Product Working Name: MessMate

Target Market: University students, bachelor messes, shared flats and small co-living groups, with Bangladesh-first usability.

Primary Goal: Replace manual mess notebooks, spreadsheets and Messenger calculations with one reliable system for meals, shared expenses, bills, member balances and settlement.

# 1\. Product Vision

Build a professional, fast and mobile-friendly shared-living finance platform where a mess can manage daily meals, bazar purchases, rent, WiFi, electricity, gas, maid salary and other shared costs, while every member can clearly see how much they paid, how much they owe, and what they should receive.

The product must feel like a modern SaaS finance application rather than a simple calculator. Financial records must be traceable, calculations deterministic, permissions explicit, and the architecture ready for a future PWA/mobile experience without rewriting the backend.

# 2\. Problem Statement

- Monthly mess calculations are usually manual and error-prone.
- Meal counts are recorded inconsistently.
- Members forget who paid for bazar or bills.
- Fixed and variable costs are difficult to split fairly.
- Final settlement often requires many Messenger messages and manual calculations.
- When a historical amount is edited or deleted, members may no longer know why a balance changed.
- New members joining mid-month and members leaving mid-month create partial billing problems.
- There is rarely a clear audit trail or monthly financial statement.

# 3\. Target Users

## 3.1 Mess Owner / Admin

- Creates and configures a mess.
- Invites/removes members.
- Controls billing rules, permissions and monthly closing.
- Can correct records using controlled adjustment/reversal flows.

## 3.2 Treasurer / Finance Manager

- Manages bazar, expenses, bills, member payments and settlement.
- Reviews balances and generates reports.

## 3.3 Mess Manager

- Manages meals, member activity and routine mess operations.

## 3.4 Member

- Records own meals, views ledger, sees bills, pays dues and confirms settlements.

## 3.5 Viewer / Read-only User

- Can view permitted information without changing financial records.

# 4\. Product Principles

- Financial correctness before visual complexity.
- Simple daily actions with minimal typing.
- Mobile-first interaction patterns even though the first release is a website.
- Every financial mutation should be traceable.
- Never silently alter historical financial records.
- Role-based access at both UI and API levels.
- Admin-configurable rules instead of hard-coded business rules.
- Fast initial load, efficient queries and pagination.
- Progressive enhancement: web first, PWA later.
- No fake demo data in production.

# 5\. Scope and Release Strategy

## MVP / Phase Group A: Foundation

- Authentication and session management.
- Mess/workspace creation and configuration.
- Member management and invitations.
- Role and permission model.
- Professional dashboard shell and navigation.
- Database schema and API foundation.
- Global error handling, validation and security baseline.
- Audit-ready architecture.

## Phase Group B: Mess Operations

- Daily meals and meal calendar.
- Bazar entries and receipts.
- Expense categories.
- Fixed bills: rent, WiFi, electricity, gas, maid and other recurring costs.
- Variable expenses.

## Phase Group C: Financial Engine

- Automatic meal-rate calculation.
- Flexible split engine.
- Member ledger.
- Advance/deposit.
- Who-owes-whom settlement optimization.
- Payment tracking and confirmation.
- Month-end closing and reopening with permission.

## Phase Group D: Reporting and Communication

- Monthly statements.
- PDF/Excel/CSV export.
- Real-time notifications.
- Shareable settlement messages.
- Analytics and trends.

## Phase Group E: PWA / Pro Features

- Installable PWA.
- Offline-capable meal entry with safe synchronization.
- Push notifications.
- Receipt compression.
- Optional OCR and AI-assisted entry.
- Smart alerts and anomaly insights.

# 6\. Core Functional Requirements

## 6.1 Authentication

- Email/password authentication.
- Secure session/token handling.
- Password reset.
- Email verification where applicable.
- Logout from current/all sessions.
- Protected routes and API endpoints.
- Rate limiting and brute-force protection.

## 6.2 Mess / Workspace

- Create a mess.
- Mess name, address/area, currency and timezone.
- Invite members by link/code/email.
- Mess status: active, archived.
- Billing cycle configuration.
- Default meal types.
- Default settlement and approval settings.
- Mess-level notification preferences.

## 6.3 Member Management

- Name, profile photo, contact/email and optional emergency/contact metadata.
- Role assignment.
- Room assignment.
- Join date and leave date.
- Active/inactive status.
- Temporary absence support.
- Member ledger history.
- Final settlement on leaving.
- Historical financial records must not be destroyed simply because a member is removed.

## 6.4 Meal Management

- Breakfast, lunch and dinner by default.
- Optional custom meal types.
- Member self-entry.
- Manager/admin entry and correction.
- Guest meals linked to the responsible member.
- Meal calendar.
- Daily/monthly meal totals.
- Meal correction workflow.
- Configurable meal-rate calculation.

Default formula: Meal Rate = Total Variable Food Cost ÷ Total Counted Meals. The system must define which expense categories are included and prevent division by zero.

## 6.5 Bazar Management

- Date, buyer, category, description, items, amount and payment method.
- Receipt/photo attachment.
- Optional itemized bazar list.
- Paid/unpaid status where applicable.
- Edit via permission-controlled adjustment.
- Search, filters and pagination.
- Monthly and member-level summaries.

## 6.6 Expense Management

- Variable and fixed expense classification.
- Categories: Food, Rent, Utilities, Maid, Cleaning, Gas, Transport, Other and configurable categories.
- Who paid.
- Amount, date, description, billing period.
- Split method.
- Receipt attachment.
- Approval status.
- Payment status.
- Recurring expense support for fixed bills.

## 6.7 Split Engine

- Equal split.
- Percentage split.
- Custom amount split.
- Usage-based split.
- Meal-based split.
- Room-based split where appropriate.
- Partial-month/date-prorated split.
- Validation: split totals must equal the source amount, subject to controlled rounding rules.
- Rounding policy must be deterministic and visible.

## 6.8 Rent and Utilities

- House rent with equal, room-based or custom allocation.
- WiFi, electricity, gas, water and maid salary.
- Billing period and due date.
- Recurring bill templates.
- Member-specific exemptions/adjustments with reason.
- Partial-month handling for move-in/move-out.

## 6.9 Mess Wallet / Shared Fund

- Shared opening balance.
- Member contributions.
- Expenses paid from the shared fund.
- Current balance.
- Transaction history.
- Controlled adjustment/reversal.

## 6.10 Ledger

- Per-member running balance.
- Credits, debits and settlement entries.
- Opening balance.
- Advance/deposit.
- Expense share.
- Payments made.
- Refunds.
- Adjustments/reversals.
- Immutable transaction identity and timestamps.
- Human-readable transaction descriptions.

## 6.11 Settlement

- Calculate net balance for every member.
- Separate members who owe from members who should receive.
- Generate a settlement plan minimizing unnecessary transfers.
- Show payer, receiver, amount and status.
- Support partial payment.
- Payment method: cash, bKash, Nagad, bank and other configurable methods.
- Receiver/admin confirmation.
- Settlement history.

## 6.12 Monthly Closing

1. Review meals.
2. Review expenses and bills.
3. Calculate final meal rate.
4. Calculate member shares.
5. Apply payments, advances and adjustments.
6. Generate final balances.
7. Generate settlement plan.
8. Create monthly snapshot/report.
9. Lock the month.
10. Allow authorized reopening with an audit log.

A closed month should not be casually edited. Corrections should use controlled adjustment/reversal flows.

## 6.13 Notifications

- In-app notifications.
- Real-time updates using Socket.io.
- Payment due.
- Settlement created.
- Payment received/confirmed.
- Expense added/approved.
- Meal correction.
- Monthly closing.
- Member invitation/join.
- Read/unread state must be persistent so read notifications do not repeatedly reappear.
- Future push notification support.

## 6.14 Reports

- Monthly summary.
- Expense breakdown.
- Meal analysis.
- Member statement.
- Settlement report.
- Mess wallet report.
- Bazar report.
- Export to PDF/CSV/Excel.
- Date/category/member filters.

## 6.15 Audit Log

- Create/update/delete-like actions should be recorded where appropriate.
- Record actor, action, entity, entity ID, timestamp and relevant before/after values or change summary.
- Financial deletion should normally be implemented as reversal/void rather than physical destruction.
- Audit logs must be permission controlled.

# 7\. Dashboard UX Requirements

- Modern SaaS dashboard with a clean sidebar on desktop and bottom navigation/drawer patterns on small screens.
- Top bar: search, notifications and profile.
- KPI cards: total members, current month expense, meal rate, pending settlement.
- Monthly overview chart.
- Expense-by-category chart.
- Recent activity.
- Quick actions: Add Meal, Add Bazar, Add Expense, View Ledger, Settle Up.
- Top spenders/contributors.
- Current month status and closing state.
- Empty states must be useful, not blank.
- Loading states should use skeletons rather than layout jumps.
- Forms should support keyboard navigation and clear validation.
- Use confirmation dialogs for destructive or financially significant actions.

# 8\. Suggested Navigation

- Dashboard
- Members
- Meals
- Bazar
- Finance
- Ledger
- Settlement
- Reports
- Notifications
- Settings
- Audit Logs, visible only to authorized roles.

# 9\. Roles and Permissions

The permission model must be capability-based, not merely hidden buttons. Frontend route guards and backend middleware must both enforce permissions.

- OWNER/ADMIN: full mess administration.
- TREASURER: financial operations, ledger, payments, settlement and reports.
- MANAGER: meals, bazar and routine operations.
- MEMBER: own meals, own ledger, permitted shared information and payments.
- VIEWER: read-only access to permitted data.

The exact role names and permissions should be configurable in a centralized authorization layer. Never rely on frontend-only restrictions.

# 10\. Recommended Technical Architecture

- Frontend: React + TypeScript + Vite or an equivalent production-ready React setup.
- Backend: Node.js + Express + TypeScript.
- Database: PostgreSQL recommended for relational financial integrity.
- ORM: Prisma or another mature PostgreSQL ORM/query layer.
- Real-time: Socket.io.
- Authentication: secure HTTP-only cookie session or a robust token/session architecture.
- Object storage: S3-compatible storage or a managed storage provider for receipts.
- Validation: Zod or equivalent shared validation strategy.
- API: REST-first, versioned and documented.
- Testing: unit, integration and critical end-to-end tests.
- Deployment: frontend CDN/Vercel-compatible, backend managed Node hosting, managed PostgreSQL.
- PWA: service worker, manifest and offline strategy introduced after the web foundation is stable.

# 11\. Data Model Overview

- User
- Mess
- MessMember
- Role
- Permission
- Invitation
- Room
- Meal
- MealType
- Expense
- ExpenseCategory
- ExpenseSplit
- Bill
- RecurringBill
- BazarEntry
- BazarItem
- Receipt
- Wallet
- WalletTransaction
- LedgerEntry
- AdvanceDeposit
- Settlement
- SettlementItem
- Payment
- MonthlyClosing
- Notification
- AuditLog
- Attachment

The final schema must use foreign keys, indexes, unique constraints and transactions where financial consistency requires atomic updates.

# 12\. Financial Rules and Invariants

- No financial calculation may depend on client-side-only logic.
- Server is the source of truth for balances, meal rates, splits and settlement.
- All monetary values should use exact decimal/numeric storage, never floating-point money fields.
- Every split must reconcile to its source amount within a documented rounding policy.
- A member's net balance must be reproducible from ledger entries.
- Closed-month totals must remain reproducible.
- Financial mutation endpoints must be idempotent where duplicate requests are possible.
- Concurrent updates must not produce double charges or lost payments.
- Deletion of a financial record should not silently erase accounting history.

# 13\. Performance Requirements

- Paginate large tables.
- Use indexed queries for mess_id, member_id, date, billing period and status.
- Avoid N+1 database queries.
- Lazy-load heavy reports/charts.
- Compress/resize receipt images before upload.
- Use caching selectively for non-financial reference data.
- Debounce global search.
- Optimize Socket.io events so clients receive only relevant mess updates.
- Keep bundle size controlled.
- Use skeleton loading and optimistic UI only where rollback is safe.

# 14\. Security Requirements

- Input validation on every API boundary.
- Authentication and authorization middleware.
- Password hashing with a modern password hashing algorithm.
- HTTP security headers.
- CORS restricted to trusted origins.
- Rate limiting on authentication and sensitive endpoints.
- Secure cookie/token handling.
- No secrets in frontend source.
- Parameterized/ORM database access.
- File type, size and content validation for uploads.
- Audit logs for privileged and financial actions.
- Protection against IDOR by checking mess membership and permission on every resource access.
- Do not expose sensitive member data to unauthorized users.

# 15\. Non-Functional UX Requirements

- Responsive from mobile width through desktop.
- Accessible labels, focus states and sufficient contrast.
- Consistent typography, spacing, icons, buttons and form controls.
- Professional empty, loading, error and success states.
- No placeholder text such as 'Phase 1', 'Coming Soon' or development labels in the production UI.
- No fake charts or fake financial totals in production.
- All dates and currency formatting should respect mess settings.
- Bangla-friendly content support should be possible even if the first UI is English.

# 16\. Future PWA Requirements

- Installable on Android/iOS-supported browsers.
- Responsive touch-first controls.
- Offline meal entry queue.
- Safe background synchronization.
- Conflict resolution for offline edits.
- Push notifications.
- Cached app shell.
- Network-aware error states.
- No offline feature may silently overwrite server financial data.

# 17\. Future Pro Features

- Receipt OCR.
- AI-assisted expense/meal entry with user confirmation.
- Smart spending insights.
- Anomaly detection.
- Multiple messes per user.
- Family/flat mode.
- Payment gateway integrations where legally and technically appropriate.
- Advanced recurring billing.
- Multi-currency support.
- Public/shareable settlement link with controlled access.
- Admin analytics.

# 18\. API Design Expectations

- Version API routes, e.g. /api/v1/...
- Use consistent success/error response shapes.
- Return validation errors in field-aware format.
- Use HTTP status codes correctly.
- Protect every resource by mess/workspace authorization.
- Use transactions for multi-record financial operations.
- Support pagination, filtering, sorting and search.
- Document API contracts before frontend implementation where practical.

# 19\. Testing Strategy

- Unit tests for meal rate, split, prorating, ledger and settlement algorithms.
- Integration tests for authentication, permissions and financial transactions.
- End-to-end tests for key flows.
- Regression tests for month closing/reopening.
- Permission matrix tests.
- Concurrency/idempotency tests for payment and settlement endpoints.
- UI smoke tests for dashboard, meals, expenses, ledger and settlement.

# 20\. Definition of Done

- Feature works on desktop and mobile-responsive web.
- Frontend and backend validation both exist.
- Permission checks exist at API level.
- Database constraints and indexes are implemented.
- Loading, empty, error and success states exist.
- Critical financial calculations have automated tests.
- Audit behavior is implemented where required.
- No console errors or broken routes in the affected feature.
- No fake production data or placeholder development labels.
- Changes do not unnecessarily rewrite unrelated project files.
- Documentation is updated for important architecture/API/database changes.

# 21\. AI Agent Development Rules

- Work phase-by-phase. Do not generate the entire application in one pass.
- Before modifying an existing project, inspect the repository, package files, routes, database schema, environment configuration and current implementation.
- Do not delete or regenerate working files merely to simplify implementation.
- Show a concise implementation plan before major changes.
- Implement only the requested phase and required dependencies.
- Keep business logic in reusable services/modules rather than giant route handlers or components.
- Never hard-code financial rules that should be configurable.
- Never use floating point for money.
- Do not fabricate API credentials, payment integrations or external service behavior.
- After implementation, run lint/typecheck/tests/build as available and report failures honestly.
- Provide changed file paths and a short verification summary.
- Do not mark a phase complete if critical tests/builds are failing.

# 22\. Initial Success Metrics

- A new mess can be created and members invited without technical assistance.
- A member can record a meal in a few seconds.
- A bazar/expense can be recorded with a receipt.
- At month end, the system can reproduce the total expense, meal rate and member balances.
- Settlement can be generated without manual calculation.
- Every member can understand why their balance is positive or negative.
- Critical financial calculations pass automated tests.
- The system remains usable on a typical Android phone browser.

# 23\. Phase 1 Expected Outcome

Phase 1 is not the complete product. It establishes the production-quality foundation: repository audit, architecture, database design, authentication strategy, authorization model, design system, responsive application shell, API conventions, environment setup, error handling and testing baseline. The agent must not prematurely build all business modules in Phase 1.