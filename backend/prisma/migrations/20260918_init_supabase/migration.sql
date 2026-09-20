CREATE SCHEMA IF NOT EXISTS messmate;
SET search_path TO messmate, public;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'TREASURER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MessStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('VARIABLE', 'FIXED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SplitMethod" AS ENUM ('EQUAL', 'MEAL_BASED', 'PERCENTAGE', 'CUSTOM', 'ROOM_BASED', 'PRORATED');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UPCOMING', 'DUE', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('FOOD_SHARE', 'RENT_SHARE', 'UTILITY_SHARE', 'EXPENSE_SHARE', 'BAZAR_CONTRIBUTION', 'ADVANCE_DEPOSIT', 'SETTLEMENT_PAYMENT', 'REFUND', 'ADJUSTMENT', 'REVERSAL', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "SettlementPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementItemStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'ACTIVE', 'UNDER_REVIEW', 'FINALIZED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "ReopenStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mess" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "currencySymbol" TEXT NOT NULL DEFAULT '৳',
    "area" TEXT,
    "city" TEXT,
    "status" "MessStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessMember" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "roomNo" TEXT,
    "roomId" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "monthlyRent" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "breakfast" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "lunch" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "dinner" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "guestBreakfast" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "guestLunch" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "guestDinner" DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "payerMemberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "ExpenseType" NOT NULL DEFAULT 'VARIABLE',
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "billingPeriod" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'APPROVED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "splitMethod" "SplitMethod" NOT NULL DEFAULT 'EQUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BazarEntry" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "buyerMemberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "itemsSummary" TEXT,
    "receiptUrl" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BazarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BazarItem" (
    "id" TEXT NOT NULL,
    "bazarEntryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(8,2),
    "unit" TEXT,
    "unitPrice" DECIMAL(12,2),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BazarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UPCOMING',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "paidByMemberId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringBill" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "dueDay" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocation" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "expenseId" TEXT,
    "billId" TEXT,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "splitMethod" "SplitMethod" NOT NULL DEFAULT 'EQUAL',
    "shareRatio" DECIMAL(8,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvanceDeposit" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "billingPeriod" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvanceDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementPlan" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "totalDebtPool" DECIMAL(12,2) NOT NULL,
    "status" "SettlementPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "payerMemberId" TEXT NOT NULL,
    "receiverMemberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "settledAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "SettlementItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementPayment" (
    "id" TEXT NOT NULL,
    "settlementItemId" TEXT NOT NULL,
    "payerMemberId" TEXT NOT NULL,
    "receiverMemberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "idempotencyKey" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAdjustment" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "reason" TEXT NOT NULL,
    "billingPeriod" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "payerMemberId" TEXT NOT NULL,
    "receiverMemberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "periodKey" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'ACTIVE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedById" TEXT,
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialSnapshot" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "totalMeals" DECIMAL(10,2) NOT NULL,
    "totalFoodCost" DECIMAL(12,2) NOT NULL,
    "mealRate" DECIMAL(10,4) NOT NULL,
    "totalFixedExpenses" DECIMAL(12,2) NOT NULL,
    "totalVariableExpenses" DECIMAL(12,2) NOT NULL,
    "totalExpenses" DECIMAL(12,2) NOT NULL,
    "totalContributions" DECIMAL(12,2) NOT NULL,
    "totalAdvances" DECIMAL(12,2) NOT NULL,
    "totalPayments" DECIMAL(12,2) NOT NULL,
    "outstandingBalance" DECIMAL(12,2) NOT NULL,
    "isReconciled" BOOLEAN NOT NULL DEFAULT true,
    "memberBalancesJson" JSONB NOT NULL,
    "settlementSummaryJson" JSONB NOT NULL,
    "expenseBreakdownJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodEvent" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReopenRequest" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReopenStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReopenRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Mess_code_key" ON "Mess"("code");

-- CreateIndex
CREATE INDEX "Mess_code_idx" ON "Mess"("code");

-- CreateIndex
CREATE INDEX "Mess_status_idx" ON "Mess"("status");

-- CreateIndex
CREATE INDEX "MessMember_messId_idx" ON "MessMember"("messId");

-- CreateIndex
CREATE INDEX "MessMember_userId_idx" ON "MessMember"("userId");

-- CreateIndex
CREATE INDEX "MessMember_role_idx" ON "MessMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "MessMember_messId_userId_key" ON "MessMember"("messId", "userId");

-- CreateIndex
CREATE INDEX "Room_messId_idx" ON "Room"("messId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_messId_roomNumber_key" ON "Room"("messId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_messId_idx" ON "Invitation"("messId");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Notification_messId_userId_idx" ON "Notification"("messId", "userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "AuditLog_messId_idx" ON "AuditLog"("messId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "Meal_messId_date_idx" ON "Meal"("messId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Meal_messId_memberId_date_key" ON "Meal"("messId", "memberId", "date");

-- CreateIndex
CREATE INDEX "Expense_messId_date_idx" ON "Expense"("messId", "date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "BazarEntry_messId_date_idx" ON "BazarEntry"("messId", "date");

-- CreateIndex
CREATE INDEX "BazarItem_bazarEntryId_idx" ON "BazarItem"("bazarEntryId");

-- CreateIndex
CREATE INDEX "Bill_messId_billingPeriod_idx" ON "Bill"("messId", "billingPeriod");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "RecurringBill_messId_idx" ON "RecurringBill"("messId");

-- CreateIndex
CREATE INDEX "LedgerEntry_messId_memberId_idx" ON "LedgerEntry"("messId", "memberId");

-- CreateIndex
CREATE INDEX "LedgerEntry_messId_effectiveDate_idx" ON "LedgerEntry"("messId", "effectiveDate");

-- CreateIndex
CREATE INDEX "LedgerEntry_entryType_idx" ON "LedgerEntry"("entryType");

-- CreateIndex
CREATE INDEX "ExpenseAllocation_messId_memberId_idx" ON "ExpenseAllocation"("messId", "memberId");

-- CreateIndex
CREATE INDEX "ExpenseAllocation_expenseId_idx" ON "ExpenseAllocation"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseAllocation_billId_idx" ON "ExpenseAllocation"("billId");

-- CreateIndex
CREATE INDEX "AdvanceDeposit_messId_billingPeriod_idx" ON "AdvanceDeposit"("messId", "billingPeriod");

-- CreateIndex
CREATE INDEX "AdvanceDeposit_messId_memberId_idx" ON "AdvanceDeposit"("messId", "memberId");

-- CreateIndex
CREATE INDEX "SettlementPlan_messId_idx" ON "SettlementPlan"("messId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementPlan_messId_billingPeriod_key" ON "SettlementPlan"("messId", "billingPeriod");

-- CreateIndex
CREATE INDEX "SettlementItem_planId_idx" ON "SettlementItem"("planId");

-- CreateIndex
CREATE INDEX "SettlementItem_payerMemberId_idx" ON "SettlementItem"("payerMemberId");

-- CreateIndex
CREATE INDEX "SettlementItem_receiverMemberId_idx" ON "SettlementItem"("receiverMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementPayment_idempotencyKey_key" ON "SettlementPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SettlementPayment_settlementItemId_idx" ON "SettlementPayment"("settlementItemId");

-- CreateIndex
CREATE INDEX "SettlementPayment_payerMemberId_idx" ON "SettlementPayment"("payerMemberId");

-- CreateIndex
CREATE INDEX "SettlementPayment_receiverMemberId_idx" ON "SettlementPayment"("receiverMemberId");

-- CreateIndex
CREATE INDEX "FinancialAdjustment_messId_memberId_idx" ON "FinancialAdjustment"("messId", "memberId");

-- CreateIndex
CREATE INDEX "Settlement_messId_idx" ON "Settlement"("messId");

-- CreateIndex
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- CreateIndex
CREATE INDEX "FinancialPeriod_messId_status_idx" ON "FinancialPeriod"("messId", "status");

-- CreateIndex
CREATE INDEX "FinancialPeriod_messId_periodKey_idx" ON "FinancialPeriod"("messId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriod_messId_year_month_key" ON "FinancialPeriod"("messId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriod_messId_periodKey_key" ON "FinancialPeriod"("messId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSnapshot_periodId_key" ON "FinancialSnapshot"("periodId");

-- CreateIndex
CREATE INDEX "FinancialSnapshot_messId_idx" ON "FinancialSnapshot"("messId");

-- CreateIndex
CREATE INDEX "PeriodEvent_periodId_idx" ON "PeriodEvent"("periodId");

-- CreateIndex
CREATE INDEX "PeriodEvent_messId_idx" ON "PeriodEvent"("messId");

-- CreateIndex
CREATE INDEX "ReopenRequest_periodId_idx" ON "ReopenRequest"("periodId");

-- CreateIndex
CREATE INDEX "ReopenRequest_messId_idx" ON "ReopenRequest"("messId");

-- AddForeignKey
ALTER TABLE "Mess" ADD CONSTRAINT "Mess_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessMember" ADD CONSTRAINT "MessMember_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessMember" ADD CONSTRAINT "MessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessMember" ADD CONSTRAINT "MessMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MessMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "MessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BazarEntry" ADD CONSTRAINT "BazarEntry_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BazarEntry" ADD CONSTRAINT "BazarEntry_buyerMemberId_fkey" FOREIGN KEY ("buyerMemberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BazarItem" ADD CONSTRAINT "BazarItem_bazarEntryId_fkey" FOREIGN KEY ("bazarEntryId") REFERENCES "BazarEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_paidByMemberId_fkey" FOREIGN KEY ("paidByMemberId") REFERENCES "MessMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MessMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceDeposit" ADD CONSTRAINT "AdvanceDeposit_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceDeposit" ADD CONSTRAINT "AdvanceDeposit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementPlan" ADD CONSTRAINT "SettlementPlan_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SettlementPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_receiverMemberId_fkey" FOREIGN KEY ("receiverMemberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementPayment" ADD CONSTRAINT "SettlementPayment_settlementItemId_fkey" FOREIGN KEY ("settlementItemId") REFERENCES "SettlementItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementPayment" ADD CONSTRAINT "SettlementPayment_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementPayment" ADD CONSTRAINT "SettlementPayment_receiverMemberId_fkey" FOREIGN KEY ("receiverMemberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_receiverMemberId_fkey" FOREIGN KEY ("receiverMemberId") REFERENCES "MessMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "FinancialPeriod_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodEvent" ADD CONSTRAINT "PeriodEvent_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodEvent" ADD CONSTRAINT "PeriodEvent_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReopenRequest" ADD CONSTRAINT "ReopenRequest_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "FinancialPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReopenRequest" ADD CONSTRAINT "ReopenRequest_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

