export type AppRole = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';

export type ExpenseType = 'VARIABLE' | 'FIXED';
export type ExpenseStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type BillStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'POSTED'
  | 'UPCOMING'
  | 'DUE'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID'
  | 'CANCELLED'
  | 'REVERSED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface Mess {
  id: string;
  name: string;
  code: string;
  currency: string;
  currencySymbol: string;
  area?: string | null;
  city?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
  settings?: Record<string, any> | null;
  status: string;
  myRole?: AppRole;
}

export interface MessMember {
  id: string;
  messId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: AppRole;
  roomNo?: string | null;
  roomId?: string | null;
  room?: {
    id: string;
    roomNumber: string;
    floor?: string | null;
    capacity: number;
    monthlyRent: number;
  } | null;
  joinDate: string;
  leaveDate?: string | null;
  status:
    | 'INVITED'
    | 'PENDING'
    | 'ACTIVE'
    | 'INACTIVE'
    | 'ON_LEAVE'
    | 'LEAVING_REQUESTED'
    | 'EXITING'
    | 'SETTLED'
    | 'ARCHIVED';
  balance?: number;
  netBalance?: number;
  balanceStatus?: 'SURPLUS' | 'DEFICIT' | 'SETTLED';
  emergencyContact?: string | null;
  address?: string | null;
  notes?: string | null;
  costEligibility?: Record<string, boolean> | null;
}

export * from './memberLifecycle.js';

export interface Room {
  id: string;
  messId: string;
  roomNumber: string;
  floor?: string | null;
  capacity: number;
  currentMembers?: number;
  monthlyRent: number;
  isActive: boolean;
  notes?: string | null;
}

export interface MealRecord {
  id: string;
  messId: string;
  memberId: string;
  memberName: string;
  roomNo?: string | null;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  guestBreakfast: number;
  guestLunch: number;
  guestDinner: number;
  total: number;
}

export interface MealSummary {
  date: string;
  totalMealsToday: number;
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
  totalGuest: number;
  activeMembers: number;
  avgPerMember: number;
}

export interface BazarItem {
  id?: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  totalAmount: number;
}

export interface BazarEntry {
  id: string;
  messId: string;
  buyerMemberId: string;
  buyerName: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  paymentMethod: string;
  receiptUrl?: string | null;
  notes?: string | null;
  items: BazarItem[];
}

export interface Expense {
  id: string;
  messId: string;
  payerMemberId: string;
  payerName: string;
  amount: number;
  type: ExpenseType;
  category: string;
  description: string;
  date: string;
  billingPeriod: string;
  status: ExpenseStatus;
  approvedById?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

export interface Bill {
  id: string;
  messId: string;
  name: string;
  category: string;
  amount: number;
  billingPeriod: string;
  dueDate: string;
  status: BillStatus;
  isRecurring: boolean;
  paidByMemberId?: string | null;
  paidByName?: string | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

export interface RecurringBill {
  id: string;
  messId: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  dueDay: number;
  isActive: boolean;
}

export interface DashboardStats {
  messId: string;
  messName: string;
  location: string;
  status: string;
  currencySymbol: string;
  kpis: {
    totalMembers: {
      value: number;
      change: string;
      trend: string;
    };
    totalExpenses: {
      value: string;
      change: string;
      trend: string;
    };
    mealRate: {
      value: string;
      label: string;
      isCalculated: boolean;
    };
    pendingSettlement: {
      value: string;
      subtext: string;
      trend: string;
    };
  };
  todayMeals?: {
    total: number;
    breakfast: number;
    lunch: number;
    dinner: number;
    avgPerMember: number;
  };
  operationalSummary?: {
    totalMembers: number;
    activeMembers: number;
    pendingApprovals: number;
    upcomingBills: number;
    totalBazarCount: number;
  };
  monthlyOverview: Array<{
    month: string;
    food: number;
    rent: number;
    utilities: number;
    other: number;
  }>;
  expenseByCategory: Array<{
    category: string;
    percentage: number;
    amount: number;
    color: string;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    time: string;
    user: string;
    avatar?: string | null;
    category: string;
  }>;
  topSpenders: Array<{
    rank: number;
    name: string;
    amount: string;
    role: string;
    avatar?: string | null;
  }>;
}

// -------------------------------------------------------------
// PHASE 3 — FINANCIAL, SHARED LEDGER & SMART SETTLEMENT TYPES
// -------------------------------------------------------------

export type LedgerEntryType =
  | 'FOOD_SHARE'
  | 'RENT_SHARE'
  | 'UTILITY_SHARE'
  | 'VARIABLE_EXPENSE_SHARE'
  | 'BAZAR_CONTRIBUTION'
  | 'ADVANCE_DEPOSIT'
  | 'SETTLEMENT_PAYMENT'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export interface LedgerEntryDTO {
  id: string;
  messId: string;
  memberId: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  effectiveDate: string;
  createdAt: string;
}

export interface MemberBalanceReport {
  memberId: string;
  memberName: string;
  roomNo?: string | null;
  role: string;
  billingPeriod: string;
  foodShare: number;
  rentShare: number;
  utilityShare: number;
  variableShare: number;
  totalCharges: number;
  bazarContributed: number;
  advancePaid: number;
  paymentsMade: number;
  totalContributions: number;
  netBalance: number;
  displayNetBalance: string;
  status: 'SURPLUS' | 'DEFICIT' | 'BALANCED';
}

export interface MessFinancialSummary {
  billingPeriod: string;
  totalFoodCost: number;
  totalMeals: number;
  currentMealRate: number;
  displayMealRate: string;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalMessExpenses: number;
  totalContributions: number;
  pendingSettlementPool: number;
  membersOwingCount: number;
  membersReceivingCount: number;
  isReconciled: boolean;
  memberBalances: MemberBalanceReport[];
}

export interface SettlementTransferPlanItem {
  id: string;
  payerMemberId: string;
  payerName: string;
  receiverMemberId: string;
  receiverName: string;
  amount: number;
  settledAmount: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'SETTLED' | 'CANCELLED';
  notes?: string;
}

export interface SettlementPlanDTO {
  id: string;
  messId: string;
  billingPeriod: string;
  totalDebtPool: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'FINALIZED';
  items: SettlementTransferPlanItem[];
  createdAt: string;
}

export interface AdvanceDepositDTO {
  id: string;
  messId: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  billingPeriod: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface SettlementPaymentDTO {
  id: string;
  messId: string;
  settlementItemId: string;
  payerMemberId: string;
  payerName?: string;
  receiverMemberId: string;
  receiverName?: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  confirmedByReceiver: boolean;
  confirmedAt?: string;
  createdAt: string;
}

// ----------------------------------------------------
// PHASE 4: MONTHLY CLOSING & FINANCIAL REPORTS
// ----------------------------------------------------

export type PeriodStatus = 'OPEN' | 'ACTIVE' | 'UNDER_REVIEW' | 'FINALIZED' | 'CLOSED' | 'REOPENED';

export interface FinancialPeriod {
  id: string;
  messId: string;
  year: number;
  month: number;
  periodKey: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  openedAt: string;
  openedById?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  finalizedAt?: string | null;
  finalizedById?: string | null;
  closedAt?: string | null;
  closedById?: string | null;
  reopenedAt?: string | null;
  reopenedById?: string | null;
  reopenReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthEndChecklistItem {
  id: string;
  title: string;
  status: 'PASSED' | 'WARNING' | 'BLOCKED';
  details: string;
  count?: number;
}

export interface FinancialValidationResult {
  canFinalize: boolean;
  canClose: boolean;
  periodKey: string;
  periodStatus: PeriodStatus;
  checklist: MonthEndChecklistItem[];
  warnings: Array<{ code: string; message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; entityId?: string }>;
  blockingIssues: Array<{ code: string; message: string; entityId?: string }>;
  summary: {
    totalMeals: number;
    totalFoodCost: number;
    mealRate: number;
    totalExpenses: number;
    totalContributions: number;
    totalPayments: number;
    outstandingBalance: number;
    isReconciled: boolean;
  };
}

export interface MonthlyFinancialReport {
  periodKey: string;
  periodStatus: string;
  isSnapshot: boolean;
  generatedAt: string;
  summary: {
    totalExpenses: number;
    foodCost: number;
    fixedCosts: number;
    variableCosts: number;
    mealRate: number;
    totalMeals: number;
    averageCostPerMember: number;
    totalContributions: number;
    totalAdvances: number;
    totalPayments: number;
    outstandingAmount: number;
    activeMembersCount: number;
    isReconciled: boolean;
  };
  expenseBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  comparison: {
    hasPrevious: boolean;
    prevPeriodKey: string | null;
    totalExpensesDelta: number;
    totalExpensesDeltaPercent: number;
    mealRateDelta: number;
    mealRateDeltaPercent: number;
    mealsDelta: number;
    foodCostDelta: number;
  };
}

export interface StatementTransactionRow {
  id: string;
  date: string;
  description: string;
  reference: string;
  entryType: string;
  debit: number | null;
  credit: number | null;
  runningBalance: number;
}

export interface MemberStatement {
  memberId: string;
  memberName: string;
  roomNo: string;
  role: string;
  periodKey: string;
  periodStatus: string;
  statusBadge: {
    status: 'OWES' | 'RECEIVES' | 'SETTLED';
    label: string;
    amount: number;
  };
  summary: {
    openingBalance: number;
    totalMeals: number;
    mealRate: number;
    foodShare: number;
    rentShare: number;
    utilityShare: number;
    otherSharedExpenses: number;
    totalObligations: number;
    bazarContributions: number;
    advanceDeposits: number;
    settlementPayments: number;
    adjustments: number;
    totalContributions: number;
    closingBalance: number;
  };
  transactions: StatementTransactionRow[];
  generatedAt: string;
}

export interface FoodCostReport {
  periodKey: string;
  periodStatus: string;
  totalFoodCost: number;
  totalMeals: number;
  mealRate: number;
  members: Array<{
    memberId: string;
    name: string;
    roomNo: string;
    meals: number;
    foodShare: number;
  }>;
  generatedAt: string;
}

export interface SettlementReport {
  periodKey: string;
  periodStatus: string;
  summary: {
    totalOwedAmount: number;
    totalReceivableAmount: number;
    totalSettledAmount: number;
    remainingAmount: number;
    isFullySettled: boolean;
  };
  memberSummaries: Array<{
    memberId: string;
    name: string;
    roomNo: string;
    totalOwed: number;
    totalReceivable: number;
    paid: number;
    remaining: number;
    status: 'SETTLED' | 'PARTIALLY_PAID' | 'PENDING';
  }>;
  transactions: Array<{
    id: string;
    payerName: string;
    receiverName: string;
    amount: number;
    settledAmount: number;
    status: string;
    paymentMethod?: string;
  }>;
  generatedAt: string;
}

export interface PeriodAuditEvent {
  id: string;
  periodId: string;
  messId: string;
  eventType: string;
  actorId?: string | null;
  actorName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface MessAuditLogItem {
  id: string;
  messId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface MessAuditLogsResponse {
  logs: MessAuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    financialCount: number;
    memberCount: number;
    utilityCount: number;
    securityCount: number;
  };
}

// -------------------------------------------------------------
// PHASE 10 — ADVANCED REPORTS, ANALYTICS & FINANCIAL INTELLIGENCE
// -------------------------------------------------------------

export interface FinancialAnomaly {
  id: string;
  type: 'LARGE_TRANSACTION' | 'BALANCE_DEFICIT' | 'UNUSUAL_MEAL_COUNT' | 'MISSING_RECURRING_BILL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  amount?: number;
  entityId?: string;
  entityType?: string;
}

export interface AnalyticalInsight {
  id: string;
  category: 'EXPENSE' | 'MEAL' | 'UTILITY' | 'CASH_FLOW' | 'MEMBER';
  text: string;
  trend?: 'UP' | 'DOWN' | 'NEUTRAL';
  deltaPercent?: number;
}

export interface ExecutiveDashboardData {
  periodKey: string;
  periodStatus: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalMarketCost: number;
    totalMeals: number;
    mealRate: number;
    fixedCosts: number;
    variableCosts: number;
    outstandingReceivables: number;
    outstandingPayables: number;
    totalMemberDue: number;
    totalMemberCredit: number;
    currentCashPosition: number;
    pendingSettlementAmount: number;
    activeMembersCount: number;
  };
  expenseBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  anomalies: FinancialAnomaly[];
  insights: AnalyticalInsight[];
}

export interface CashFlowReport {
  periodKey: string;
  periodStatus: string;
  openingBalance: number;
  inflows: {
    bazarContributions: number;
    advanceDeposits: number;
    settlementPayments: number;
    totalInflow: number;
  };
  outflows: {
    market: number;
    rent: number;
    utilities: number;
    salary: number;
    other: number;
    totalOutflow: number;
  };
  netCashFlow: number;
  closingBalance: number;
  isReconciled: boolean;
}

export interface CostStructureReport {
  periodKey: string;
  periodStatus: string;
  totalCost: number;
  fixedCost: {
    amount: number;
    percentage: number;
  };
  variableCost: {
    amount: number;
    percentage: number;
  };
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
}

export interface UtilityAnalyticsReport {
  periodKey: string;
  totalUtilityCost: number;
  categories: Array<{
    category: string;
    totalAmount: number;
    count: number;
    average: number;
    bills: Array<{ id: string; title: string; amount: number; billType: string; status: string }>;
  }>;
}

export interface DailyTrendItem {
  date: string;
  meals: number;
  marketExpense: number;
  otherExpense: number;
  totalExpense: number;
}

export interface DailyTrendsReport {
  periodKey: string;
  days: DailyTrendItem[];
  summary: {
    totalDaysWithActivity: number;
    peakMealDate: string | null;
    peakMealCount: number;
    peakMarketDate: string | null;
    peakMarketExpense: number;
  };
}

export interface MemberComparisonItem {
  memberId: string;
  memberName: string;
  roomNo: string | null;
  mealsCount: number;
  foodCost: number;
  fixedCostShare: number;
  totalCostShare: number;
  bazarPaid: number;
  advancePaid: number;
  paymentsMade: number;
  totalPaid: number;
  netBalance: number;
  status: 'SURPLUS' | 'DEFICIT' | 'BALANCED';
}

export interface MemberComparisonReport {
  periodKey: string;
  members: MemberComparisonItem[];
  totals: {
    totalMembers: number;
    totalMeals: number;
    totalCost: number;
    totalPaid: number;
    totalReceivable: number;
    totalPayable: number;
  };
}


