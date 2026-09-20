import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, isDatabaseOnline } from '../config/database.js';
import { UtilityService } from '../services/utilityService.js';
import { RoomService } from '../services/roomService.js';
import { MeterService } from '../services/meterService.js';
import { RecurringUtilityService } from '../services/recurringUtilityService.js';
import { RoundingService } from '../services/financial/roundingService.js';
import { LedgerService } from '../services/financial/ledgerService.js';

describe('MessMate Phase 6 — Advanced Mess Operations & Utility Management Suite', () => {
  let messId: string = 'mess-greenview-01';
  let member1Id: string = 'mem-1';
  let member2Id: string = 'mem-2';
  let testUser1Id: string | null = null;
  let testUser2Id: string | null = null;
  let createdRoomId: string;
  const periodKey = '2026-09';

  beforeAll(async () => {
    if (await isDatabaseOnline()) {
      try {
        const testUnique = `U_${Date.now()}`;
        const u1 = await prisma.user.create({
          data: {
            email: `util1_${testUnique}@test.com`,
            passwordHash: 'test_hash_123',
            name: 'Utility Test Admin',
            isActive: true,
          },
        });
        testUser1Id = u1.id;

        const u2 = await prisma.user.create({
          data: {
            email: `util2_${testUnique}@test.com`,
            passwordHash: 'test_hash_123',
            name: 'Utility Test Roommate',
            isActive: true,
          },
        });
        testUser2Id = u2.id;

        const m = await prisma.mess.create({
          data: {
            name: `Phase6 Test Mess ${testUnique}`,
            code: `UTIL-${testUnique}`,
            currency: 'BDT',
            currencySymbol: '৳',
            status: 'ACTIVE',
            createdById: testUser1Id,
          },
        });
        messId = m.id;

        const mem1 = await prisma.messMember.create({
          data: {
            messId,
            userId: testUser1Id,
            role: 'OWNER',
            status: 'ACTIVE',
            roomNo: 'A-101',
          },
        });
        member1Id = mem1.id;

        const mem2 = await prisma.messMember.create({
          data: {
            messId,
            userId: testUser2Id,
            role: 'MEMBER',
            status: 'ACTIVE',
            roomNo: 'A-102',
          },
        });
        member2Id = mem2.id;
      } catch (err) {
        console.warn('Live setup fallback:', err);
      }
    }
  });

  afterAll(async () => {
    if (testUser1Id && (await isDatabaseOnline())) {
      try {
        await (prisma as any).utilityAllocation.deleteMany({ where: { utilityBill: { messId } } });
        await (prisma as any).utilityBill.deleteMany({ where: { messId } });
        await (prisma as any).meterReading.deleteMany({ where: { messId } });
        await (prisma as any).recurringUtilityTemplate.deleteMany({ where: { messId } });
        await (prisma as any).room.deleteMany({ where: { messId } });
        await prisma.ledgerEntry.deleteMany({ where: { messId } });
        await prisma.messMember.deleteMany({ where: { messId } });
        await prisma.mess.delete({ where: { id: messId } });
        if (testUser1Id) await prisma.user.delete({ where: { id: testUser1Id } });
        if (testUser2Id) await prisma.user.delete({ where: { id: testUser2Id } });
      } catch {
        // Cleanup ignore
      }
    }
  });

  describe('1. Zero-Loss Allocation & Hamilton-Webster Rounding Engine', () => {
    it('should allocate amounts with zero penny loss across arbitrary weights', () => {
      const totalAmount = 10000;
      const weights = [
        { memberId: 'mem-1', weight: 1 },
        { memberId: 'mem-2', weight: 1 },
        { memberId: 'mem-3', weight: 1 },
      ];

      const splits = RoundingService.splitByWeights(totalAmount, weights);
      expect(splits).toHaveLength(3);

      const sum = splits.reduce((acc: number, s: any) => acc + s.amount, 0);
      expect(RoundingService.roundMoney(sum)).toBe(10000.0);

      // Check penny distribution: 3333.34 + 3333.33 + 3333.33 = 10000.00
      expect(splits[0].amount).toBe(3333.34);
      expect(splits[1].amount).toBe(3333.33);
      expect(splits[2].amount).toBe(3333.33);
    });

    it('should split prorated active days with exact penny distribution', () => {
      const totalAmount = 6000;
      const daysWeights = [
        { memberId: 'mem-1', weight: 30 },
        { memberId: 'mem-2', weight: 15 },
        { memberId: 'mem-3', weight: 10 },
      ];

      const splits = RoundingService.splitByWeights(totalAmount, daysWeights);
      const sum = splits.reduce((acc: number, s: any) => acc + s.amount, 0);
      expect(RoundingService.roundMoney(sum)).toBe(6000.0);
    });
  });

  describe('2. Room Management & Room-Based Rent Calculation', () => {
    it('should create and list rooms with occupant count and rent amounts', async () => {
      const uniqueRoomNo = `B-${Math.floor(Math.random() * 900) + 100}`;
      const room = await RoomService.createRoom(messId, {
        roomNumber: uniqueRoomNo,
        floor: '2nd',
        capacity: 2,
        monthlyRent: 7000,
        notes: 'Double room with attached bath',
      });

      expect(room.roomNumber).toBe(uniqueRoomNo);
      expect(room.monthlyRent).toBe(7000);
      expect(room.capacity).toBe(2);
      createdRoomId = room.id;

      const rooms = await RoomService.listRooms(messId);
      expect(rooms.length).toBeGreaterThan(0);
      expect(rooms.some((r) => r.roomNumber === uniqueRoomNo)).toBe(true);
    });

    it('should assign a member to a room', async () => {
      await expect(RoomService.assignMember(messId, createdRoomId, member1Id)).resolves.toBeUndefined();
    });
  });

  describe('3. Meter Reading & Electricity/Water Utilities', () => {
    it('should calculate electricity bill amount correctly from meter readings', () => {
      // (1350 - 1100) * 10.5 + 150 (fixed) + 75 (additional) = 2850
      const calc = UtilityService.calculateElectricityAmount(1350, 1100, 10.5, 150, 75);

      expect(calc.consumedUnits).toBe(250);
      expect(calc.energyCharge).toBe(2625);
      expect(calc.totalAmount).toBe(2850);
    });

    it('should reject negative consumption unless flagged as rollover', async () => {
      await expect(
        MeterService.recordReading(messId, {
          meterType: 'ELECTRICITY',
          meterName: 'Sub-meter 1',
          billingPeriod: '2026-09',
          readingDate: '2026-09-18',
          currentValue: 100,
          previousValue: 200,
          isRollover: false,
        })
      ).rejects.toThrow();
    });

    it('should accept meter rollover reset', async () => {
      const reading = await MeterService.recordReading(messId, {
        meterType: 'ELECTRICITY',
        meterName: 'Main Meter',
        meterIdentifier: `ELEC-ROLL-${Date.now()}`,
        billingPeriod: '2026-09',
        readingDate: '2026-09-18',
        currentValue: 50,
        previousValue: 9990,
        isRollover: true,
        notes: 'Meter dial reset after 9999',
      });

      expect(reading.isRollover).toBe(true);
      expect(reading.consumedUnits).toBe(50);
    });
  });

  describe('4. Maid Salary & Special Utility Calculations', () => {
    it('should calculate maid net payable salary with advances and deductions', () => {
      // base: 5000, bonus: 500, advance: 1000, deduction: 200 => 4300
      const result = UtilityService.calculateMaidSalary(5000, 500, 1000, 200);
      expect(result.netPayable).toBe(4300);
    });

    it('should reject negative net salary', () => {
      expect(() => UtilityService.calculateMaidSalary(5000, 0, 6000, 0)).toThrow();
    });
  });

  describe('5. Utility Bills Lifecycle & Ledger Integration', () => {
    let createdBillId: string;

    it('should create utility bill with zero-loss member allocations', async () => {
      const bill = await UtilityService.createUtilityBill({
        messId,
        title: 'Monthly High-Speed Fiber Internet',
        category: 'WIFI',
        billType: 'FIXED',
        amount: 1500,
        billingPeriod: periodKey,
        billingDate: '2026-09-01',
        dueDate: '2026-09-10',
        splitMethod: 'EQUAL',
        paidByMemberId: member1Id,
        provider: 'Carnival Internet',
      });

      expect(bill.id).toBeDefined();
      expect(bill.amount).toBe(1500);
      expect(bill.status).toBe('PENDING_REVIEW');
      expect(bill.allocations).toBeDefined();
      expect(bill.allocations!.length).toBeGreaterThan(0);

      // Allocations sum must equal exactly 1500
      const sum = bill.allocations!.reduce((acc, a) => acc + a.amount, 0);
      expect(RoundingService.roundMoney(sum)).toBe(1500);

      createdBillId = bill.id;
    });

    it('should approve utility bill', async () => {
      const approved = await UtilityService.approveUtilityBill(messId, createdBillId, member1Id);
      expect(approved.status).toBe('APPROVED');
    });

    it('should authoritatively post utility bill into the shared financial ledger', async () => {
      const initialLedger = await LedgerService.getMemberLedger(messId, member1Id);
      const initialCount = initialLedger.length;

      const result = await UtilityService.postUtilityBillToLedger(messId, createdBillId, member1Id);
      expect(result.bill.isPosted || (result.bill.status as string) === 'POSTED').toBe(true);
      expect(result.ledgerEntriesCount).toBeGreaterThan(0);

      // Member ledger should now have new entries
      const afterLedger = await LedgerService.getMemberLedger(messId, member1Id);
      expect(afterLedger.length).toBeGreaterThan(initialCount);

      // Check entry types include UTILITY_SHARE
      const hasUtilityEntry = afterLedger.some((e) => e.entryType === 'UTILITY_SHARE');
      expect(hasUtilityEntry).toBe(true);
    });

    it('should prevent posting an already posted utility bill', async () => {
      await expect(
        UtilityService.postUtilityBillToLedger(messId, createdBillId, member1Id)
      ).rejects.toThrow();
    });

    it('should calculate utility dashboard metrics accurately', async () => {
      const metrics = await UtilityService.getDashboardMetrics(messId, periodKey);
      expect(metrics).toBeDefined();
      expect(metrics.totalBilled).toBeGreaterThan(0);
      expect(metrics.totalPosted).toBeGreaterThan(0);
      expect(metrics.byCategory).toBeDefined();
    });
  });

  describe('6. Recurring Utility Templates & Duplicate Prevention', () => {
    it('should create recurring utility template', async () => {
      const template = await RecurringUtilityService.createTemplate(messId, {
        name: 'Quarterly Water Treatment & Filter',
        category: 'WATER',
        utilityType: 'FIXED',
        defaultAmount: 800,
        frequency: 'MONTHLY',
        dueDay: 5,
        splitMethod: 'EQUAL',
        autoGenerate: true,
        requiresReview: false,
      });

      expect(template.id).toBeDefined();
      expect(template.defaultAmount).toBe(800);
      expect(template.isActive).toBe(true);
    });

    it('should generate utility bills from templates with idempotent skipping on re-run', async () => {
      // First run
      const gen1 = await RecurringUtilityService.generateBillsForPeriod(messId, '2026-10', member1Id);
      expect(gen1.generatedCount).toBeGreaterThanOrEqual(1);

      // Second run for same period must skip to prevent duplicates
      const gen2 = await RecurringUtilityService.generateBillsForPeriod(messId, '2026-10', member1Id);
      expect(gen2.generatedCount).toBe(0);
      expect(gen2.skippedCount).toBeGreaterThanOrEqual(1);
    });
  });
});
