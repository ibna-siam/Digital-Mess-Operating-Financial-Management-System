export type UtilityCategory =
  | 'RENT'
  | 'ELECTRICITY'
  | 'GAS'
  | 'WATER'
  | 'WIFI'
  | 'MAID'
  | 'CLEANING'
  | 'MAINTENANCE'
  | 'OTHER';

export type SplitMethod =
  | 'EQUAL'
  | 'PERCENTAGE'
  | 'CUSTOM'
  | 'ROOM_BASED'
  | 'PRORATED'
  | 'MEAL_BASED';

export type BillStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'POSTED'
  | 'VOID';

export interface UtilityAllocation {
  id: string;
  memberId: string;
  memberName?: string;
  amount: number;
  shareRatio: number | null;
  unitsConsumed: number | null;
  activeDays: number | null;
  notes: string | null;
}

export interface UtilityBill {
  id: string;
  messId: string;
  title: string;
  category: string;
  billType: string;
  amount: number;
  billingPeriod: string;
  billingDate: string;
  dueDate: string;
  status: BillStatus;
  splitMethod: SplitMethod;
  meterIdentifier: string | null;
  previousReading: number | null;
  currentReading: number | null;
  consumedUnits: number | null;
  unitRate: number | null;
  fixedCharges: number | null;
  additionalCharges: number | null;
  maidName: string | null;
  baseSalary: number | null;
  bonusAmount: number | null;
  advanceDeduction: number | null;
  deductions: number | null;
  netPayable: number | null;
  provider: string | null;
  package: string | null;
  accountNumber: string | null;
  gasType: string | null;
  cylinderCount: number | null;
  paidByMemberId: string | null;
  paidByName: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  receiptUrl: string | null;
  notes: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  isPosted: boolean;
  postedById: string | null;
  postedAt: string | null;
  createdAt: string;
  allocations?: UtilityAllocation[];
}

export interface MeterReading {
  id: string;
  messId: string;
  meterType: string;
  meterName: string;
  meterIdentifier: string | null;
  roomNumber: string | null;
  billingPeriod: string;
  readingDate: string;
  currentValue: number;
  previousValue: number;
  consumedUnits: number;
  isRollover: boolean;
  recordedById: string | null;
  recordedByName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringUtilityTemplate {
  id: string;
  messId: string;
  name: string;
  category: string;
  utilityType: string;
  defaultAmount: number;
  frequency: string;
  dueDay: number;
  splitMethod: SplitMethod;
  autoGenerate: boolean;
  requiresReview: boolean;
  isActive: boolean;
  lastGeneratedPeriod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  messId: string;
  roomNumber: string;
  floor: string | null;
  capacity: number;
  monthlyRent: number;
  isActive: boolean;
  occupantCount: number;
  notes: string | null;
  occupants: Array<{
    memberId: string;
    name: string;
    role: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UtilityMetrics {
  totalBilled: number;
  totalPosted: number;
  totalPending: number;
  byCategory: Record<string, number>;
  billsCount: number;
}
