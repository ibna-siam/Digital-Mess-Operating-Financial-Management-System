import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, isDatabaseOnline } from '../config/database.js';
import { BillsUtilitiesService } from '../services/billsUtilitiesService.js';
import { BillService } from '../services/billService.js';
import { UtilityService } from '../services/utilityService.js';

describe('Phase 19 — Unified Bills & Utilities Module Tests', () => {
  const TARGET_MESS_ID = '4b0c678f-02ee-4df6-bdd8-87204d679cfe'; // Green View mess

  describe('1. Category & Group Classification Logic', () => {
    it('correctly maps recurring facility costs to FIXED', () => {
      expect(BillsUtilitiesService.categorizeGroup('RENT')).toBe('FIXED');
      expect(BillsUtilitiesService.categorizeGroup('House Rent')).toBe('FIXED');
      expect(BillsUtilitiesService.categorizeGroup('WIFI')).toBe('FIXED');
      expect(BillsUtilitiesService.categorizeGroup('INTERNET')).toBe('FIXED');
      expect(BillsUtilitiesService.categorizeGroup('MAID')).toBe('FIXED');
      expect(BillsUtilitiesService.categorizeGroup('COOK_SALARY')).toBe('FIXED');
      expect(BillsUtilitiesService.categorizeGroup('CLEANING')).toBe('FIXED');
      expect(BillsUtilitiesService.categorizeGroup('Miscellaneous', 'ROOM_BASED')).toBe('FIXED');
    });

    it('correctly maps variable usage costs to UTILITY', () => {
      expect(BillsUtilitiesService.categorizeGroup('ELECTRICITY')).toBe('UTILITY');
      expect(BillsUtilitiesService.categorizeGroup('GAS')).toBe('UTILITY');
      expect(BillsUtilitiesService.categorizeGroup('WATER')).toBe('UTILITY');
      expect(BillsUtilitiesService.categorizeGroup('MAINTENANCE')).toBe('UTILITY');
      expect(BillsUtilitiesService.categorizeGroup('OTHER')).toBe('UTILITY');
    });
  });

  describe('2. Unified Overview Aggregation for Active Mess', () => {
    it('returns complete overview for current period (2026-09)', async () => {
      if (!(await isDatabaseOnline())) {
        console.warn('Database is offline; skipping database-dependent test');
        return;
      }

      const mess = await prisma.mess.findUnique({ where: { id: TARGET_MESS_ID } });
      if (!mess) {
        console.warn('Green View mess not found in this environment; skipping DB assertion');
        return;
      }

      const overview = await BillsUtilitiesService.getOverview(TARGET_MESS_ID, '2026-09');

      expect(overview).toBeDefined();
      expect(overview.summary).toBeDefined();
      expect(overview.summary.currentPeriod).toBe('2026-09');
      expect(overview.summary.totalMonthlyCost).toBe(
        Number((overview.summary.totalBills + overview.summary.totalUtilities).toFixed(2))
      );
      expect(overview.summary.totalPending).toBe(
        Number(Math.max(0, overview.summary.totalMonthlyCost - overview.summary.totalPaid).toFixed(2))
      );

      expect(Array.isArray(overview.fixedBills)).toBe(true);
      expect(Array.isArray(overview.utilities)).toBe(true);
      expect(Array.isArray(overview.paymentHistory)).toBe(true);
      expect(Array.isArray(overview.templates)).toBe(true);

      // Verify no item in utilities is marked as RENT
      const rentInUtilities = overview.utilities.filter((u) => u.category.toUpperCase().includes('RENT'));
      expect(rentInUtilities.length).toBe(0);
    });

    it('returns consistent overview across historical closed periods (2026-04 to 2026-08)', async () => {
      if (!(await isDatabaseOnline())) return;

      const periods = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
      for (const p of periods) {
        const overview = await BillsUtilitiesService.getOverview(TARGET_MESS_ID, p);
        expect(overview.summary.currentPeriod).toBe(p);
        expect(overview.summary.totalMonthlyCost).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
