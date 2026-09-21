import { prisma, isDatabaseOnline } from '../config/database.js';
import { BillStatus } from '@prisma/client';
import { RoundingService } from './financial/roundingService.js';
import { UtilityService, UtilityBillDTO } from './utilityService.js';
import { BillService } from './billService.js';

export interface UnifiedBillItem {
  id: string;
  source: 'BILL' | 'UTILITY';
  title: string;
  category: string;
  group: 'FIXED' | 'UTILITY';
  amount: number;
  billingPeriod: string;
  dueDate: string;
  billingDate?: string;
  status: string;
  isRecurring?: boolean;
  splitMethod?: string;
  paidByMemberId?: string | null;
  paidByName?: string | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  // Meter specifics
  meterIdentifier?: string | null;
  previousReading?: number | null;
  currentReading?: number | null;
  consumedUnits?: number | null;
  unitRate?: number | null;
  fixedCharges?: number | null;
  additionalCharges?: number | null;
  // Gas specifics
  gasType?: string | null;
  cylinderCount?: number | null;
  // Maid specifics
  maidName?: string | null;
  baseSalary?: number | null;
  // Ledger posting
  isPosted?: boolean;
  postedAt?: string | null;
  createdAt: string;
}

export interface PaymentHistoryItem {
  id: string;
  billId: string;
  source: 'BILL' | 'UTILITY';
  title: string;
  category: string;
  group: 'FIXED' | 'UTILITY';
  amount: number;
  paidByMemberId: string | null;
  paidByName: string | null;
  paymentMethod: string;
  paidAt: string;
  receiptUrl?: string | null;
  notes?: string | null;
  status: string;
}

export interface BillsUtilitiesOverview {
  summary: {
    totalMonthlyCost: number;
    totalBills: number;
    totalUtilities: number;
    totalPaid: number;
    totalPending: number;
    billsCount: number;
    currentPeriod: string;
  };
  fixedBills: UnifiedBillItem[];
  utilities: UnifiedBillItem[];
  paymentHistory: PaymentHistoryItem[];
  meterReadings: any[];
  templates: any[];
}

export class BillsUtilitiesService {
  /**
   * Determine if a category belongs to FIXED / RECURRING or VARIABLE UTILITIES
   */
  public static categorizeGroup(category: string, billType?: string | null): 'FIXED' | 'UTILITY' {
    const norm = category.toUpperCase().trim();
    if (
      norm === 'RENT' ||
      norm === 'HOUSE RENT' ||
      norm === 'WIFI' ||
      norm === 'INTERNET' ||
      norm === 'MAID' ||
      norm === 'COOK' ||
      norm === 'COOK_SALARY' ||
      norm === 'MAID_SALARY' ||
      norm === 'CLEANING' ||
      billType === 'FIXED' ||
      billType === 'ROOM_BASED'
    ) {
      return 'FIXED';
    }
    return 'UTILITY';
  }

  /**
   * Get unified monthly overview for Bills & Utilities module
   */
  public static async getOverview(messId: string, periodKey: string): Promise<BillsUtilitiesOverview> {
    // 1. Fetch raw bills from Bill model
    const simpleBills = await BillService.getBills(messId, { billingPeriod: periodKey }).catch(() => []);

    // 2. Fetch utility bills from UtilityBill model
    const utilityBills = await UtilityService.listUtilityBills(messId, { periodKey }).catch(() => []);

    // 3. Fetch meter readings
    const meterReadings = await prisma.meterReading.findMany({
      where: { messId, billingPeriod: periodKey },
      orderBy: { readingDate: 'desc' },
    }).catch(() => []);

    // 4. Fetch templates from both models
    const [simpleTemplates, utilityTemplates] = await Promise.all([
      BillService.getRecurringTemplates(messId).catch(() => []),
      prisma.recurringUtilityTemplate.findMany({
        where: { messId, isActive: true },
        orderBy: { dueDay: 'asc' },
      }).catch(() => []),
    ]);

    const templates = [
      ...simpleTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        group: this.categorizeGroup(t.category),
        amount: Number(t.amount),
        frequency: t.frequency,
        dueDay: t.dueDay,
        isActive: t.isActive,
        notes: t.notes,
        source: 'BILL',
      })),
      ...utilityTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        group: this.categorizeGroup(t.category, t.utilityType),
        amount: Number(t.defaultAmount),
        frequency: t.frequency,
        dueDay: t.dueDay,
        isActive: t.isActive,
        splitMethod: t.splitMethod,
        autoGenerate: t.autoGenerate,
        source: 'UTILITY',
      })),
    ];

    // 5. Normalize items into UnifiedBillItem
    const normalizedItems: UnifiedBillItem[] = [];

    // From simple bills
    for (const b of simpleBills) {
      const group = this.categorizeGroup(b.category);
      normalizedItems.push({
        id: b.id,
        source: 'BILL',
        title: b.name,
        category: b.category,
        group,
        amount: b.amount,
        billingPeriod: b.billingPeriod,
        dueDate: b.dueDate,
        status: b.status,
        isRecurring: b.isRecurring,
        paidByMemberId: b.paidByMemberId,
        paidByName: b.paidByName,
        paidAt: b.paidAt,
        paymentMethod: b.paymentMethod,
        notes: b.notes,
        createdAt: b.dueDate,
      });
    }

    // From utility bills
    for (const u of utilityBills) {
      // Avoid voided bills in active calculation
      if ((u.status as string) === 'VOID') continue;

      const group = this.categorizeGroup(u.category, u.billType);
      normalizedItems.push({
        id: u.id,
        source: 'UTILITY',
        title: u.title,
        category: u.category,
        group,
        amount: u.amount,
        billingPeriod: u.billingPeriod,
        dueDate: u.dueDate,
        billingDate: u.billingDate,
        status: u.status,
        splitMethod: u.splitMethod,
        paidByMemberId: u.paidByMemberId,
        paidByName: u.paidByName,
        paidAt: u.paidAt,
        paymentMethod: u.paymentMethod,
        notes: u.notes,
        receiptUrl: u.receiptUrl,
        meterIdentifier: u.meterIdentifier,
        previousReading: u.previousReading,
        currentReading: u.currentReading,
        consumedUnits: u.consumedUnits,
        unitRate: u.unitRate,
        fixedCharges: u.fixedCharges,
        additionalCharges: u.additionalCharges,
        gasType: u.gasType,
        cylinderCount: u.cylinderCount,
        maidName: u.maidName,
        baseSalary: u.baseSalary,
        isPosted: u.isPosted,
        postedAt: u.postedAt,
        createdAt: u.createdAt,
      });
    }

    // 6. Partition into Fixed / Recurring and Utilities
    const fixedBills = normalizedItems.filter((item) => item.group === 'FIXED');
    const utilities = normalizedItems.filter((item) => item.group === 'UTILITY');

    // 7. Calculate Authoritative Financial Totals
    let totalBills = 0;
    let totalUtilities = 0;
    let totalPaid = 0;

    for (const item of normalizedItems) {
      if (item.group === 'FIXED') {
        totalBills = RoundingService.roundMoney(totalBills + item.amount);
      } else {
        totalUtilities = RoundingService.roundMoney(totalUtilities + item.amount);
      }

      const isPaid =
        item.status === 'PAID' ||
        item.status === 'POSTED' ||
        item.isPosted === true ||
        Boolean(item.paidAt);

      if (isPaid) {
        totalPaid = RoundingService.roundMoney(totalPaid + item.amount);
      }
    }

    const totalMonthlyCost = RoundingService.roundMoney(totalBills + totalUtilities);
    const totalPending = RoundingService.roundMoney(Math.max(0, totalMonthlyCost - totalPaid));

    // 8. Construct Payment History
    const paymentHistory: PaymentHistoryItem[] = [];

    for (const item of normalizedItems) {
      const isPaid =
        item.status === 'PAID' ||
        item.status === 'POSTED' ||
        item.isPosted === true ||
        Boolean(item.paidAt);

      if (isPaid && (item.paidAt || item.postedAt)) {
        paymentHistory.push({
          id: `pay_${item.id}`,
          billId: item.id,
          source: item.source,
          title: item.title,
          category: item.category,
          group: item.group,
          amount: item.amount,
          paidByMemberId: item.paidByMemberId || null,
          paidByName: item.paidByName || 'Manager / Cash Pool',
          paymentMethod: item.paymentMethod || (item.isPosted ? 'LEDGER_SETTLEMENT' : 'CASH'),
          paidAt: item.paidAt || item.postedAt || item.dueDate,
          receiptUrl: item.receiptUrl,
          notes: item.notes,
          status: item.status,
        });
      }
    }

    // Sort payment history most recent first
    paymentHistory.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    return {
      summary: {
        totalMonthlyCost,
        totalBills,
        totalUtilities,
        totalPaid,
        totalPending,
        billsCount: normalizedItems.length,
        currentPeriod: periodKey,
      },
      fixedBills,
      utilities,
      paymentHistory,
      meterReadings,
      templates,
    };
  }
}
