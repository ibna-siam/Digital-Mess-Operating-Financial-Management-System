import { prisma, isDatabaseOnline } from '../config/database.js';
import { BillStatus, SplitMethod, Prisma } from '@prisma/client';
import { RoundingService } from './financial/roundingService.js';
import { AllocationService } from './financial/allocationService.js';
import { LedgerService } from './financial/ledgerService.js';
import { MemberService } from './memberService.js';
import { PeriodService } from './period/periodService.js';
import { RoomService } from './roomService.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';

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

export interface CreateUtilityBillInput {
  messId: string;
  title: string;
  category: string; // RENT, ELECTRICITY, GAS, WATER, WIFI, MAID, etc.
  billType?: string; // FIXED, METER_BASED, USAGE_BASED, CUSTOM, ROOM_BASED, PRORATED
  amount: number;
  billingPeriod: string; // YYYY-MM
  billingDate?: Date | string;
  dueDate?: Date | string;
  splitMethod?: SplitMethod;
  // Meter specifics
  meterIdentifier?: string;
  previousReading?: number;
  currentReading?: number;
  consumedUnits?: number;
  unitRate?: number;
  fixedCharges?: number;
  additionalCharges?: number;
  // Maid specifics
  maidName?: string;
  baseSalary?: number;
  bonusAmount?: number;
  advanceDeduction?: number;
  deductions?: number;
  netPayable?: number;
  // WiFi specifics
  provider?: string;
  package?: string;
  accountNumber?: string;
  // Gas specifics
  gasType?: string;
  cylinderCount?: number;
  // Upfront payer
  paidByMemberId?: string;
  paidAt?: Date | string;
  paymentMethod?: string;
  receiptUrl?: string;
  notes?: string;
  allocations?: Array<{
    memberId: string;
    amount?: number;
    shareRatio?: number;
    unitsConsumed?: number;
    activeDays?: number;
    notes?: string;
  }>;
  createdById?: string;
}

export interface UtilityBillDTO {
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
  paidByName?: string | null;
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
  allocations?: Array<{
    id: string;
    memberId: string;
    memberName?: string;
    amount: number;
    shareRatio: number | null;
    unitsConsumed: number | null;
    activeDays: number | null;
    notes: string | null;
  }>;
}

// In-memory fallback
const memoryBills: Map<string, UtilityBillDTO[]> = new Map();

function initMemoryBills(messId: string): UtilityBillDTO[] {
  if (!memoryBills.has(messId)) {
    memoryBills.set(messId, [
      {
        id: 'ub-1',
        messId,
        title: 'Flat 4B September House Rent',
        category: 'RENT',
        billType: 'ROOM_BASED',
        amount: 20000,
        billingPeriod: '2026-09',
        billingDate: '2026-09-01',
        dueDate: '2026-09-10',
        status: 'POSTED',
        splitMethod: 'ROOM_BASED',
        meterIdentifier: null,
        previousReading: null,
        currentReading: null,
        consumedUnits: null,
        unitRate: null,
        fixedCharges: null,
        additionalCharges: null,
        maidName: null,
        baseSalary: null,
        bonusAmount: null,
        advanceDeduction: null,
        deductions: null,
        netPayable: null,
        provider: null,
        package: null,
        accountNumber: null,
        gasType: null,
        cylinderCount: null,
        paidByMemberId: 'mem-1',
        paidByName: 'Siam Ahmed',
        paidAt: '2026-09-05',
        paymentMethod: 'BANK_TRANSFER',
        receiptUrl: null,
        notes: 'September Flat Rent to Landlord',
        approvedById: 'mem-1',
        approvedAt: '2026-09-05',
        isPosted: true,
        postedById: 'mem-1',
        postedAt: '2026-09-05',
        createdAt: '2026-09-01T00:00:00.000Z',
        allocations: [
          { id: 'ua-1', memberId: 'mem-1', memberName: 'Siam Ahmed', amount: 8000, shareRatio: 0.4, unitsConsumed: null, activeDays: 30, notes: null },
          { id: 'ua-2', memberId: 'mem-2', memberName: 'Rahim Khan', amount: 6000, shareRatio: 0.3, unitsConsumed: null, activeDays: 30, notes: null },
          { id: 'ua-3', memberId: 'mem-3', memberName: 'Tanvir Hossain', amount: 6000, shareRatio: 0.3, unitsConsumed: null, activeDays: 30, notes: null },
        ],
      },
      {
        id: 'ub-2',
        messId,
        title: 'DESCO Electricity August-September',
        category: 'ELECTRICITY',
        billType: 'METER_BASED',
        amount: 2850,
        billingPeriod: '2026-09',
        billingDate: '2026-09-02',
        dueDate: '2026-09-15',
        status: 'APPROVED',
        splitMethod: 'EQUAL',
        meterIdentifier: 'ELEC-MAIN-01',
        previousReading: 1100,
        currentReading: 1350,
        consumedUnits: 250,
        unitRate: 10.5,
        fixedCharges: 150,
        additionalCharges: 75,
        maidName: null,
        baseSalary: null,
        bonusAmount: null,
        advanceDeduction: null,
        deductions: null,
        netPayable: null,
        provider: 'DESCO',
        package: null,
        accountNumber: '49281048',
        gasType: null,
        cylinderCount: null,
        paidByMemberId: 'mem-2',
        paidByName: 'Rahim Khan',
        paidAt: null,
        paymentMethod: 'BKASH',
        receiptUrl: null,
        notes: 'Calculated from meter readings',
        approvedById: 'mem-1',
        approvedAt: '2026-09-06',
        isPosted: false,
        postedById: null,
        postedAt: null,
        createdAt: '2026-09-02T10:00:00.000Z',
        allocations: [
          { id: 'ua-4', memberId: 'mem-1', memberName: 'Siam Ahmed', amount: 950, shareRatio: 0.3333, unitsConsumed: null, activeDays: 30, notes: null },
          { id: 'ua-5', memberId: 'mem-2', memberName: 'Rahim Khan', amount: 950, shareRatio: 0.3333, unitsConsumed: null, activeDays: 30, notes: null },
          { id: 'ua-6', memberId: 'mem-3', memberName: 'Tanvir Hossain', amount: 950, shareRatio: 0.3333, unitsConsumed: null, activeDays: 30, notes: null },
        ],
      },
    ]);
  }
  return memoryBills.get(messId)!;
}

export class UtilityService {
  private static async resolveUserId(id?: string | null): Promise<string | null> {
    if (!id) return null;
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) return user.id;
      const member = await prisma.messMember.findUnique({ where: { id } });
      if (member) return member.userId;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Electricity bill calculator:
   * (currentReading - previousReading) * unitRate + fixedCharges + additionalCharges
   */
  public static calculateElectricityAmount(
    currentReading: number,
    previousReading: number,
    unitRate: number,
    fixedCharges: number = 0,
    additionalCharges: number = 0
  ): { consumedUnits: number; energyCharge: number; totalAmount: number } {
    if (currentReading < previousReading) {
      throw new BadRequestError('Current meter reading cannot be less than previous meter reading');
    }
    const consumedUnits = RoundingService.roundMoney(currentReading - previousReading);
    const energyCharge = RoundingService.roundMoney(consumedUnits * unitRate);
    const totalAmount = RoundingService.roundMoney(energyCharge + fixedCharges + additionalCharges);
    return { consumedUnits, energyCharge, totalAmount };
  }

  /**
   * Maid salary calculator:
   * baseSalary + bonus - advance - deductions
   */
  public static calculateMaidSalary(
    baseSalary: number,
    bonus: number = 0,
    advance: number = 0,
    deductions: number = 0
  ): { netPayable: number } {
    const net = baseSalary + bonus - advance - deductions;
    if (net < 0) {
      throw new BadRequestError('Net payable salary cannot be negative');
    }
    return { netPayable: RoundingService.roundMoney(net) };
  }

  /**
   * Create a new utility bill and generate zero-loss member allocations
   */
  public static async createUtilityBill(input: CreateUtilityBillInput): Promise<UtilityBillDTO> {
    const { messId, billingPeriod, amount, category, splitMethod = 'EQUAL' } = input;

    if (!amount || amount <= 0) {
      throw new BadRequestError('Total bill amount must be greater than zero');
    }

    // 1. Period status verification: Block creation for CLOSED periods
    const period = await PeriodService.getPeriodByKey(messId, billingPeriod);
    if (period && period.status === 'CLOSED') {
      throw new ForbiddenError(`Cannot create utility bills for closed financial period ${billingPeriod}`);
    }

    // 2. Fetch mess members to allocate to
    const members = await MemberService.listMembers(messId);
    const activeMembers = members.filter((m: any) => m.status === 'ACTIVE');
    if (activeMembers.length === 0) {
      throw new BadRequestError('Mess has no active members to allocate utilities to');
    }

    // 3. Compute allocations using zero-loss allocation engine
    let computedAllocations: Array<{
      memberId: string;
      amount: number;
      shareRatio?: number;
      unitsConsumed?: number;
      activeDays?: number;
      notes?: string;
    }> = [];

    const memberIds = activeMembers.map((m: any) => m.id);

    if (splitMethod === 'ROOM_BASED') {
      const rooms = await RoomService.listRooms(messId);
      const memberRoomWeights = activeMembers.map((m: any) => {
        const room = rooms.find((r) => r.id === (m as any).roomId || r.roomNumber === m.roomNo);
        const occupantsInRoom = activeMembers.filter(
          (other: any) => ((other as any).roomId && (other as any).roomId === (m as any).roomId) || other.roomNo === m.roomNo
        ).length;
        const weight = room && occupantsInRoom > 0 ? (room.monthlyRent || 1000) / occupantsInRoom : 1;
        return { memberId: m.id, weight };
      });

      const splits = AllocationService.splitAmount({
        messId,
        totalAmount: amount,
        method: 'ROOM_BASED',
        memberIds,
        memberWeights: memberRoomWeights,
      });

      computedAllocations = splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        shareRatio: RoundingService.roundMoney(s.amount / amount),
        notes: 'Room-based allocated share',
      }));
    } else if (input.billType === 'PRORATED' && input.allocations && input.allocations.length > 0) {
      const daysInMonth = 30;
      const memberDays = input.allocations.map((a) => ({
        memberId: a.memberId,
        activeDays: a.activeDays || daysInMonth,
        totalDays: daysInMonth,
      }));

      const splits = AllocationService.splitAmount({
        messId,
        totalAmount: amount,
        method: 'PRORATED',
        memberIds: input.allocations.map((a) => a.memberId),
        proratedDays: memberDays,
      });

      computedAllocations = splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        shareRatio: RoundingService.roundMoney(s.amount / amount),
        activeDays: memberDays.find((d) => d.memberId === s.memberId)?.activeDays || daysInMonth,
        notes: `Prorated for ${memberDays.find((d) => d.memberId === s.memberId)?.activeDays || daysInMonth} days`,
      }));
    } else if (splitMethod === 'CUSTOM' && input.allocations && input.allocations.length > 0) {
      const splits = AllocationService.splitAmount({
        messId,
        totalAmount: amount,
        method: 'CUSTOM',
        memberIds: input.allocations.map((a) => a.memberId),
        customAllocations: input.allocations.map((a) => ({
          memberId: a.memberId,
          amount: a.amount || 0,
        })),
      });
      computedAllocations = splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        shareRatio: RoundingService.roundMoney(s.amount / amount),
      }));
    } else if (splitMethod === 'PERCENTAGE' && input.allocations && input.allocations.length > 0) {
      const splits = AllocationService.splitAmount({
        messId,
        totalAmount: amount,
        method: 'PERCENTAGE',
        memberIds: input.allocations.map((a) => a.memberId),
        percentageShares: input.allocations.map((a) => ({
          memberId: a.memberId,
          percentage: a.shareRatio ? a.shareRatio * 100 : 0,
        })),
      });
      computedAllocations = splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        shareRatio: RoundingService.roundMoney(s.amount / amount),
      }));
    } else {
      // Default: EQUAL split across all active members (or selected members)
      const targetIds = input.allocations && input.allocations.length > 0
        ? input.allocations.map((a) => a.memberId)
        : memberIds;

      const splits = AllocationService.splitAmount({
        messId,
        totalAmount: amount,
        method: 'EQUAL',
        memberIds: targetIds,
      });
      computedAllocations = splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        shareRatio: RoundingService.roundMoney(s.amount / amount),
      }));
    }

    // Verify zero residual: sum of amounts must match amount exactly
    const allocationSum = computedAllocations.reduce((sum, a) => sum + a.amount, 0);
    const residual = RoundingService.roundMoney(amount - allocationSum);
    if (Math.abs(residual) > 0.001) {
      computedAllocations[0].amount = RoundingService.roundMoney(computedAllocations[0].amount + residual);
    }

    const billingDate = input.billingDate ? new Date(input.billingDate) : new Date();
    const dueDate = input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database is offline');
      }

      const bill = await prisma.utilityBill.create({
        data: {
          messId,
          title: input.title,
          category,
          billType: input.billType || 'FIXED',
          amount: new Prisma.Decimal(amount),
          billingPeriod,
          billingDate,
          dueDate,
          status: 'PENDING_REVIEW',
          splitMethod,
          meterIdentifier: input.meterIdentifier || null,
          previousReading: input.previousReading !== undefined ? new Prisma.Decimal(input.previousReading) : null,
          currentReading: input.currentReading !== undefined ? new Prisma.Decimal(input.currentReading) : null,
          consumedUnits: input.consumedUnits !== undefined ? new Prisma.Decimal(input.consumedUnits) : null,
          unitRate: input.unitRate !== undefined ? new Prisma.Decimal(input.unitRate) : null,
          fixedCharges: input.fixedCharges !== undefined ? new Prisma.Decimal(input.fixedCharges) : null,
          additionalCharges: input.additionalCharges !== undefined ? new Prisma.Decimal(input.additionalCharges) : null,
          maidName: input.maidName || null,
          baseSalary: input.baseSalary !== undefined ? new Prisma.Decimal(input.baseSalary) : null,
          bonusAmount: input.bonusAmount !== undefined ? new Prisma.Decimal(input.bonusAmount) : null,
          advanceDeduction: input.advanceDeduction !== undefined ? new Prisma.Decimal(input.advanceDeduction) : null,
          deductions: input.deductions !== undefined ? new Prisma.Decimal(input.deductions) : null,
          netPayable: input.netPayable !== undefined ? new Prisma.Decimal(input.netPayable) : null,
          provider: input.provider || null,
          package: input.package || null,
          accountNumber: input.accountNumber || null,
          gasType: input.gasType || null,
          cylinderCount: input.cylinderCount || null,
          paidByMemberId: input.paidByMemberId || null,
          paidAt: input.paidAt ? new Date(input.paidAt) : null,
          paymentMethod: input.paymentMethod || null,
          receiptUrl: input.receiptUrl || null,
          notes: input.notes || null,
          allocations: {
            create: computedAllocations.map((a) => ({
              memberId: a.memberId,
              amount: new Prisma.Decimal(a.amount),
              shareRatio: a.shareRatio !== undefined ? new Prisma.Decimal(a.shareRatio) : null,
              unitsConsumed: a.unitsConsumed !== undefined ? new Prisma.Decimal(a.unitsConsumed) : null,
              activeDays: a.activeDays || null,
              notes: a.notes || null,
            })),
          },
        },
        include: {
          paidBy: { include: { user: true } },
          allocations: {
            include: {
              member: { include: { user: true } },
            },
          },
        },
      });

      // Audit log
      const auditUserId = await this.resolveUserId(input.createdById);
      await prisma.auditLog.create({
        data: {
          messId,
          userId: auditUserId,
          action: 'CREATE_UTILITY_BILL',
          entity: 'UTILITY_BILL',
          entityId: bill.id,
          details: JSON.stringify({ title: bill.title, category, amount, billingPeriod }),
        },
      }).catch(() => null);

      return {
        id: bill.id,
        messId: bill.messId,
        title: bill.title,
        category: bill.category,
        billType: bill.billType,
        amount: Number(bill.amount),
        billingPeriod: bill.billingPeriod,
        billingDate: bill.billingDate.toISOString().split('T')[0],
        dueDate: bill.dueDate.toISOString().split('T')[0],
        status: bill.status,
        splitMethod: bill.splitMethod,
        meterIdentifier: bill.meterIdentifier,
        previousReading: bill.previousReading ? Number(bill.previousReading) : null,
        currentReading: bill.currentReading ? Number(bill.currentReading) : null,
        consumedUnits: bill.consumedUnits ? Number(bill.consumedUnits) : null,
        unitRate: bill.unitRate ? Number(bill.unitRate) : null,
        fixedCharges: bill.fixedCharges ? Number(bill.fixedCharges) : null,
        additionalCharges: bill.additionalCharges ? Number(bill.additionalCharges) : null,
        maidName: bill.maidName,
        baseSalary: bill.baseSalary ? Number(bill.baseSalary) : null,
        bonusAmount: bill.bonusAmount ? Number(bill.bonusAmount) : null,
        advanceDeduction: bill.advanceDeduction ? Number(bill.advanceDeduction) : null,
        deductions: bill.deductions ? Number(bill.deductions) : null,
        netPayable: bill.netPayable ? Number(bill.netPayable) : null,
        provider: bill.provider,
        package: bill.package,
        accountNumber: bill.accountNumber,
        gasType: bill.gasType,
        cylinderCount: bill.cylinderCount,
        paidByMemberId: bill.paidByMemberId,
        paidByName: bill.paidBy?.user?.name || null,
        paidAt: bill.paidAt ? bill.paidAt.toISOString().split('T')[0] : null,
        paymentMethod: bill.paymentMethod,
        receiptUrl: bill.receiptUrl,
        notes: bill.notes,
        approvedById: bill.approvedById,
        approvedAt: bill.approvedAt ? bill.approvedAt.toISOString() : null,
        isPosted: bill.isPosted,
        postedById: bill.postedById,
        postedAt: bill.postedAt ? bill.postedAt.toISOString() : null,
        createdAt: bill.createdAt.toISOString(),
        allocations: bill.allocations.map((a) => ({
          id: a.id,
          memberId: a.memberId,
          memberName: a.member?.user?.name || 'Member',
          amount: Number(a.amount),
          shareRatio: a.shareRatio ? Number(a.shareRatio) : null,
          unitsConsumed: a.unitsConsumed ? Number(a.unitsConsumed) : null,
          activeDays: a.activeDays,
          notes: a.notes,
        })),
      };
    } catch {
      // In-memory fallback
      const list = initMemoryBills(messId);
      const billId = `ub-${Date.now()}`;
      const memberMap = new Map(activeMembers.map((m: any) => [m.id, m.name as string]));
      const payer = activeMembers.find((m: any) => m.id === input.paidByMemberId);

      const billDto: UtilityBillDTO = {
        id: billId,
        messId,
        title: input.title,
        category,
        billType: input.billType || 'FIXED',
        amount,
        billingPeriod,
        billingDate: billingDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'PENDING_REVIEW',
        splitMethod,
        meterIdentifier: input.meterIdentifier || null,
        previousReading: input.previousReading || null,
        currentReading: input.currentReading || null,
        consumedUnits: input.consumedUnits || null,
        unitRate: input.unitRate || null,
        fixedCharges: input.fixedCharges || null,
        additionalCharges: input.additionalCharges || null,
        maidName: input.maidName || null,
        baseSalary: input.baseSalary || null,
        bonusAmount: input.bonusAmount || null,
        advanceDeduction: input.advanceDeduction || null,
        deductions: input.deductions || null,
        netPayable: input.netPayable || null,
        provider: input.provider || null,
        package: input.package || null,
        accountNumber: input.accountNumber || null,
        gasType: input.gasType || null,
        cylinderCount: input.cylinderCount || null,
        paidByMemberId: input.paidByMemberId || null,
        paidByName: payer?.name || null,
        paidAt: input.paidAt ? new Date(input.paidAt).toISOString().split('T')[0] : null,
        paymentMethod: input.paymentMethod || null,
        receiptUrl: input.receiptUrl || null,
        notes: input.notes || null,
        approvedById: null,
        approvedAt: null,
        isPosted: false,
        postedById: null,
        postedAt: null,
        createdAt: new Date().toISOString(),
        allocations: computedAllocations.map((a, idx) => ({
          id: `ua-${billId}-${idx}`,
          memberId: a.memberId,
          memberName: String(memberMap.get(a.memberId) || 'Member'),
          amount: a.amount,
          shareRatio: a.shareRatio || null,
          unitsConsumed: a.unitsConsumed || null,
          activeDays: a.activeDays || null,
          notes: a.notes || null,
        })),
      };

      list.push(billDto);
      return billDto;
    }
  }

  /**
   * List utility bills with filters
   */
  public static async listUtilityBills(
    messId: string,
    filters?: {
      periodKey?: string;
      category?: string;
      status?: BillStatus;
    }
  ): Promise<UtilityBillDTO[]> {
    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const where: Prisma.UtilityBillWhereInput = { messId };
      if (filters?.periodKey) where.billingPeriod = filters.periodKey;
      if (filters?.category) where.category = filters.category;
      if (filters?.status) where.status = filters.status;

      const bills = await prisma.utilityBill.findMany({
        where,
        include: {
          paidBy: { include: { user: true } },
          allocations: {
            include: {
              member: { include: { user: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return bills.map((b) => ({
        id: b.id,
        messId: b.messId,
        title: b.title,
        category: b.category,
        billType: b.billType,
        amount: Number(b.amount),
        billingPeriod: b.billingPeriod,
        billingDate: b.billingDate.toISOString().split('T')[0],
        dueDate: b.dueDate.toISOString().split('T')[0],
        status: b.status,
        splitMethod: b.splitMethod,
        meterIdentifier: b.meterIdentifier,
        previousReading: b.previousReading ? Number(b.previousReading) : null,
        currentReading: b.currentReading ? Number(b.currentReading) : null,
        consumedUnits: b.consumedUnits ? Number(b.consumedUnits) : null,
        unitRate: b.unitRate ? Number(b.unitRate) : null,
        fixedCharges: b.fixedCharges ? Number(b.fixedCharges) : null,
        additionalCharges: b.additionalCharges ? Number(b.additionalCharges) : null,
        maidName: b.maidName,
        baseSalary: b.baseSalary ? Number(b.baseSalary) : null,
        bonusAmount: b.bonusAmount ? Number(b.bonusAmount) : null,
        advanceDeduction: b.advanceDeduction ? Number(b.advanceDeduction) : null,
        deductions: b.deductions ? Number(b.deductions) : null,
        netPayable: b.netPayable ? Number(b.netPayable) : null,
        provider: b.provider,
        package: b.package,
        accountNumber: b.accountNumber,
        gasType: b.gasType,
        cylinderCount: b.cylinderCount,
        paidByMemberId: b.paidByMemberId,
        paidByName: b.paidBy?.user?.name || null,
        paidAt: b.paidAt ? b.paidAt.toISOString().split('T')[0] : null,
        paymentMethod: b.paymentMethod,
        receiptUrl: b.receiptUrl,
        notes: b.notes,
        approvedById: b.approvedById,
        approvedAt: b.approvedAt ? b.approvedAt.toISOString() : null,
        isPosted: b.isPosted,
        postedById: b.postedById,
        postedAt: b.postedAt ? b.postedAt.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
        allocations: b.allocations.map((a) => ({
          id: a.id,
          memberId: a.memberId,
          memberName: a.member?.user?.name || 'Member',
          amount: Number(a.amount),
          shareRatio: a.shareRatio ? Number(a.shareRatio) : null,
          unitsConsumed: a.unitsConsumed ? Number(a.unitsConsumed) : null,
          activeDays: a.activeDays,
          notes: a.notes,
        })),
      }));
    } catch {
      const list = initMemoryBills(messId);
      let res = list;
      if (filters?.periodKey) res = res.filter((b) => b.billingPeriod === filters.periodKey);
      if (filters?.category) res = res.filter((b) => b.category === filters.category);
      if (filters?.status) res = res.filter((b) => b.status === filters.status);
      return res;
    }
  }

  /**
   * Get single utility bill by ID
   */
  public static async getUtilityBillById(messId: string, id: string): Promise<UtilityBillDTO> {
    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      const b = await prisma.utilityBill.findFirst({
        where: { id, messId },
        include: {
          paidBy: { include: { user: true } },
          allocations: {
            include: {
              member: { include: { user: true } },
            },
          },
        },
      });

      if (!b) throw new NotFoundError('Utility bill not found');

      return {
        id: b.id,
        messId: b.messId,
        title: b.title,
        category: b.category,
        billType: b.billType,
        amount: Number(b.amount),
        billingPeriod: b.billingPeriod,
        billingDate: b.billingDate.toISOString().split('T')[0],
        dueDate: b.dueDate.toISOString().split('T')[0],
        status: b.status,
        splitMethod: b.splitMethod,
        meterIdentifier: b.meterIdentifier,
        previousReading: b.previousReading ? Number(b.previousReading) : null,
        currentReading: b.currentReading ? Number(b.currentReading) : null,
        consumedUnits: b.consumedUnits ? Number(b.consumedUnits) : null,
        unitRate: b.unitRate ? Number(b.unitRate) : null,
        fixedCharges: b.fixedCharges ? Number(b.fixedCharges) : null,
        additionalCharges: b.additionalCharges ? Number(b.additionalCharges) : null,
        maidName: b.maidName,
        baseSalary: b.baseSalary ? Number(b.baseSalary) : null,
        bonusAmount: b.bonusAmount ? Number(b.bonusAmount) : null,
        advanceDeduction: b.advanceDeduction ? Number(b.advanceDeduction) : null,
        deductions: b.deductions ? Number(b.deductions) : null,
        netPayable: b.netPayable ? Number(b.netPayable) : null,
        provider: b.provider,
        package: b.package,
        accountNumber: b.accountNumber,
        gasType: b.gasType,
        cylinderCount: b.cylinderCount,
        paidByMemberId: b.paidByMemberId,
        paidByName: b.paidBy?.user?.name || null,
        paidAt: b.paidAt ? b.paidAt.toISOString().split('T')[0] : null,
        paymentMethod: b.paymentMethod,
        receiptUrl: b.receiptUrl,
        notes: b.notes,
        approvedById: b.approvedById,
        approvedAt: b.approvedAt ? b.approvedAt.toISOString() : null,
        isPosted: b.isPosted,
        postedById: b.postedById,
        postedAt: b.postedAt ? b.postedAt.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
        allocations: b.allocations.map((a) => ({
          id: a.id,
          memberId: a.memberId,
          memberName: a.member?.user?.name || 'Member',
          amount: Number(a.amount),
          shareRatio: a.shareRatio ? Number(a.shareRatio) : null,
          unitsConsumed: a.unitsConsumed ? Number(a.unitsConsumed) : null,
          activeDays: a.activeDays,
          notes: a.notes,
        })),
      };
    } catch {
      const list = initMemoryBills(messId);
      const b = list.find((bill) => bill.id === id);
      if (!b) throw new NotFoundError('Utility bill not found');
      return b;
    }
  }

  /**
   * Approve utility bill (MANAGER / ADMIN)
   */
  public static async approveUtilityBill(messId: string, id: string, approvedById: string): Promise<UtilityBillDTO> {
    const bill = await this.getUtilityBillById(messId, id);
    if ((bill.status as string) === 'POSTED') {
      throw new BadRequestError('Cannot approve an already posted utility bill');
    }
    if ((bill.status as string) === 'VOID') {
      throw new BadRequestError('Cannot approve a voided utility bill');
    }

    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }

      await prisma.utilityBill.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById,
          approvedAt: new Date(),
        },
      });

      const auditUserId = await this.resolveUserId(approvedById);
      await prisma.auditLog.create({
        data: {
          messId,
          userId: auditUserId,
          action: 'APPROVE_UTILITY_BILL',
          entity: 'UTILITY_BILL',
          entityId: id,
        },
      }).catch(() => null);

      return this.getUtilityBillById(messId, id);
    } catch {
      bill.status = 'APPROVED' as BillStatus;
      bill.approvedById = approvedById;
      bill.approvedAt = new Date().toISOString();
      return bill;
    }
  }

  /**
   * Authoritatively post utility bill into the shared financial ledger
   */
  public static async postUtilityBillToLedger(
    messId: string,
    id: string,
    postedById: string
  ): Promise<{ bill: UtilityBillDTO; ledgerEntriesCount: number }> {
    const bill = await this.getUtilityBillById(messId, id);

    if (bill.isPosted || (bill.status as string) === 'POSTED') {
      throw new BadRequestError('Utility bill is already posted to ledger');
    }
    if ((bill.status as string) === 'VOID') {
      throw new BadRequestError('Cannot post a voided utility bill');
    }

    // 1. Period verification: Cannot post to a CLOSED period
    const period = await PeriodService.getPeriodByKey(messId, bill.billingPeriod);
    if (period && period.status === 'CLOSED') {
      throw new ForbiddenError(`Financial period ${bill.billingPeriod} is CLOSED. Posting to ledger is blocked.`);
    }

    const entryType = bill.category === 'RENT' ? 'RENT_SHARE' : 'UTILITY_SHARE';
    let count = 0;

    // 2. Post DEBIT for each allocated member
    if (bill.allocations && bill.allocations.length > 0) {
      for (const alloc of bill.allocations) {
        if (alloc.amount > 0) {
          await LedgerService.createEntry({
            messId,
            memberId: alloc.memberId,
            entryType,
            direction: 'DEBIT',
            amount: alloc.amount,
            description: `${bill.title} - ${bill.category} share (${bill.billingPeriod})`,
            referenceType: 'UTILITY_BILL',
            referenceId: bill.id,
            createdById: postedById,
          });
          count++;
        }
      }
    }

    // 3. Post CREDIT for upfront payer if present
    if (bill.paidByMemberId) {
      await LedgerService.createEntry({
        messId,
        memberId: bill.paidByMemberId,
        entryType,
        direction: 'CREDIT',
        amount: bill.amount,
        description: `${bill.title} - Upfront payment for mess utility (${bill.billingPeriod})`,
        referenceType: 'UTILITY_BILL',
        referenceId: bill.id,
        createdById: postedById,
      });
      count++;
    }

    // 4. Update status in DB
    try {
      if (await isDatabaseOnline()) {
        await prisma.utilityBill.update({
          where: { id },
          data: {
            status: 'POSTED',
            isPosted: true,
            postedById,
            postedAt: new Date(),
          },
        });

        const auditUserId = await this.resolveUserId(postedById);
        await prisma.auditLog.create({
          data: {
            messId,
            userId: auditUserId,
            action: 'POST_UTILITY_BILL',
            entity: 'UTILITY_BILL',
            entityId: id,
            details: JSON.stringify({ entriesCreated: count }),
          },
        }).catch(() => null);
      } else {
        bill.status = 'POSTED';
        bill.isPosted = true;
        bill.postedById = postedById;
        bill.postedAt = new Date().toISOString();
      }
    } catch {
      bill.status = 'POSTED';
      bill.isPosted = true;
      bill.postedById = postedById;
      bill.postedAt = new Date().toISOString();
    }

    const updated = await this.getUtilityBillById(messId, id);
    return { bill: updated, ledgerEntriesCount: count };
  }

  /**
   * Void a utility bill. If already posted to ledger, appends reversing ledger entries.
   */
  public static async voidUtilityBill(
    messId: string,
    id: string,
    reason: string,
    voidedById: string
  ): Promise<UtilityBillDTO> {
    const bill = await this.getUtilityBillById(messId, id);

    if ((bill.status as string) === 'VOID') {
      throw new BadRequestError('Utility bill is already voided');
    }

    // Period check: Cannot void if period is closed
    const period = await PeriodService.getPeriodByKey(messId, bill.billingPeriod);
    if (period && period.status === 'CLOSED') {
      throw new ForbiddenError(`Financial period ${bill.billingPeriod} is CLOSED. Voiding is blocked.`);
    }

    // If posted, reverse all entries
    if (bill.isPosted || (bill.status as string) === 'POSTED') {
      const entryType = bill.category === 'RENT' ? 'RENT_SHARE' : 'UTILITY_SHARE';

      // Reverse member debits by posting CREDIT reversals
      if (bill.allocations) {
        for (const alloc of bill.allocations) {
          if (alloc.amount > 0) {
            await LedgerService.createEntry({
              messId,
              memberId: alloc.memberId,
              entryType: 'REVERSAL',
              direction: 'CREDIT',
              amount: alloc.amount,
              description: `REVERSAL: [VOID] ${bill.title} (${reason})`,
              referenceType: 'UTILITY_BILL',
              referenceId: bill.id,
              createdById: voidedById,
            });
          }
        }
      }

      // Reverse payer credit by posting DEBIT reversal
      if (bill.paidByMemberId) {
        await LedgerService.createEntry({
          messId,
          memberId: bill.paidByMemberId,
          entryType: 'REVERSAL',
          direction: 'DEBIT',
          amount: bill.amount,
          description: `REVERSAL: [VOID] Upfront payment for ${bill.title} (${reason})`,
          referenceType: 'UTILITY_BILL',
          referenceId: bill.id,
          createdById: voidedById,
        });
      }
    }

    try {
      if (await isDatabaseOnline()) {
        await prisma.utilityBill.update({
          where: { id },
          data: { status: 'VOID' },
        });

        const auditUserId = await this.resolveUserId(voidedById);
        await prisma.auditLog.create({
          data: {
            messId,
            userId: auditUserId,
            action: 'VOID_UTILITY_BILL',
            entity: 'UTILITY_BILL',
            entityId: id,
            details: JSON.stringify({ reason }),
          },
        }).catch(() => null);
      } else {
        bill.status = 'VOID';
      }
    } catch {
      bill.status = 'VOID';
    }

    return this.getUtilityBillById(messId, id);
  }

  /**
   * Aggregated utility metrics for dashboard
   */
  public static async getDashboardMetrics(
    messId: string,
    periodKey: string
  ): Promise<{
    totalBilled: number;
    totalPosted: number;
    totalPending: number;
    byCategory: Record<string, number>;
    billsCount: number;
  }> {
    const bills = await this.listUtilityBills(messId, { periodKey });

    let totalBilled = 0;
    let totalPosted = 0;
    let totalPending = 0;
    const byCategory: Record<string, number> = {};

    for (const b of bills) {
      if ((b.status as string) === 'VOID') continue;

      totalBilled = RoundingService.roundMoney(totalBilled + b.amount);
      if (b.isPosted || (b.status as string) === 'POSTED') {
        totalPosted = RoundingService.roundMoney(totalPosted + b.amount);
      } else {
        totalPending = RoundingService.roundMoney(totalPending + b.amount);
      }

      byCategory[b.category] = RoundingService.roundMoney(
        (byCategory[b.category] || 0) + b.amount
      );
    }

    return {
      totalBilled,
      totalPosted,
      totalPending,
      byCategory,
      billsCount: bills.filter((b) => (b.status as string) !== 'VOID').length,
    };
  }
}
