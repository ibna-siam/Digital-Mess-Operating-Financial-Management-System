import { prisma } from '../../config/database.js';
import { RoundingService } from './roundingService.js';
import { SplitMethod, Prisma } from '@prisma/client';
import { BadRequestError } from '../../utils/errors.js';

export interface AllocationItem {
  memberId: string;
  amount: number;
  shareRatio?: number;
  notes?: string;
}

export interface SplitOptions {
  messId: string;
  totalAmount: number;
  method: SplitMethod;
  memberIds: string[];
  billingPeriod?: string; // "YYYY-MM"
  customAllocations?: Array<{ memberId: string; amount: number }>;
  percentageShares?: Array<{ memberId: string; percentage: number }>;
  memberWeights?: Array<{ memberId: string; weight: number }>;
  roomRentConfigs?: Array<{ memberId: string; roomRent: number; roommateCount?: number }>;
  proratedDays?: Array<{ memberId: string; activeDays: number; totalDays?: number }>;
  usageUnits?: Array<{ memberId: string; units: number }>;
}

export class AllocationService {
  /**
   * Splits an amount among specified members based on the chosen SplitMethod.
   * Guarantees that the sum of allocated amounts equals totalAmount.
   */
  public static splitAmount(options: SplitOptions): AllocationItem[] {
    const { totalAmount, method, memberIds, customAllocations, percentageShares, memberWeights, roomRentConfigs, proratedDays, usageUnits } = options;

    if (memberIds.length === 0) {
      throw new BadRequestError('Cannot split expenses across zero members');
    }

    if (totalAmount <= 0) {
      throw new BadRequestError('Split amount must be greater than zero');
    }

    let allocations: AllocationItem[] = [];

    switch (method) {
      case 'EQUAL': {
        const splitAmounts = RoundingService.splitEvenly(totalAmount, memberIds.length);
        allocations = memberIds.map((memberId, idx) => ({
          memberId,
          amount: splitAmounts[idx],
          shareRatio: 1 / memberIds.length,
        }));
        break;
      }

      case 'PERCENTAGE': {
        if (!percentageShares || percentageShares.length === 0) {
          throw new BadRequestError('Percentage shares must be provided for PERCENTAGE split');
        }

        const totalPct = percentageShares.reduce((sum, p) => sum + p.percentage, 0);
        if (Math.abs(totalPct - 100) > 0.01) {
          throw new BadRequestError(`Total percentages must equal 100%. Got ${totalPct}%`);
        }

        let runningSum = 0;
        allocations = percentageShares.map((p, idx) => {
          if (idx === percentageShares.length - 1) {
            // Last entry absorbs rounding delta
            const lastAmount = RoundingService.roundMoney(totalAmount - runningSum);
            return {
              memberId: p.memberId,
              amount: lastAmount,
              shareRatio: p.percentage / 100,
            };
          }
          const amt = RoundingService.roundMoney((totalAmount * p.percentage) / 100);
          runningSum += amt;
          return {
            memberId: p.memberId,
            amount: amt,
            shareRatio: p.percentage / 100,
          };
        });
        break;
      }

      case 'CUSTOM': {
        if (!customAllocations || customAllocations.length === 0) {
          throw new BadRequestError('Custom allocation values must be provided');
        }

        const customSum = customAllocations.reduce((sum, a) => sum + a.amount, 0);
        if (!RoundingService.validateAllocationsSum(customAllocations.map((a) => a.amount), totalAmount)) {
          throw new BadRequestError(
            `Sum of custom allocations (৳${customSum.toFixed(2)}) does not match source amount (৳${totalAmount.toFixed(2)})`
          );
        }

        allocations = customAllocations.map((a) => ({
          memberId: a.memberId,
          amount: RoundingService.roundMoney(a.amount),
          shareRatio: a.amount / totalAmount,
        }));
        break;
      }

      case 'ROOM_BASED': {
        if (roomRentConfigs && roomRentConfigs.length > 0) {
          const rawWeights = memberIds.map((mId) => {
            const cfg = roomRentConfigs.find((r) => r.memberId === mId);
            if (!cfg) return 1;
            const count = cfg.roommateCount && cfg.roommateCount > 0 ? cfg.roommateCount : 1;
            return cfg.roomRent / count;
          });
          const splitAmounts = RoundingService.splitByWeights(totalAmount, rawWeights);
          const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
          allocations = memberIds.map((memberId, idx) => ({
            memberId,
            amount: splitAmounts[idx],
            shareRatio: totalWeight > 0 ? rawWeights[idx] / totalWeight : 1 / memberIds.length,
          }));
        } else {
          const splitAmounts = RoundingService.splitEvenly(totalAmount, memberIds.length);
          allocations = memberIds.map((memberId, idx) => ({
            memberId,
            amount: splitAmounts[idx],
            shareRatio: 1 / memberIds.length,
          }));
        }
        break;
      }

      case 'PRORATED': {
        const weights = memberIds.map((mId) => {
          if (proratedDays) {
            const p = proratedDays.find((d) => d.memberId === mId);
            return p ? p.activeDays : 30;
          }
          if (memberWeights) {
            const w = memberWeights.find((mw) => mw.memberId === mId);
            return w ? w.weight : 1;
          }
          return 1;
        });

        const splitAmounts = RoundingService.splitByWeights(totalAmount, weights);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        allocations = memberIds.map((memberId, idx) => ({
          memberId,
          amount: splitAmounts[idx],
          shareRatio: totalWeight > 0 ? weights[idx] / totalWeight : 1 / memberIds.length,
        }));
        break;
      }

      case 'MEAL_BASED':
      default: {
        if (usageUnits && usageUnits.length > 0) {
          const weights = memberIds.map((mId) => {
            const u = usageUnits.find((uu) => uu.memberId === mId);
            return u ? u.units : 1;
          });
          const splitAmounts = RoundingService.splitByWeights(totalAmount, weights);
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          allocations = memberIds.map((memberId, idx) => ({
            memberId,
            amount: splitAmounts[idx],
            shareRatio: totalWeight > 0 ? weights[idx] / totalWeight : 1 / memberIds.length,
          }));
        } else {
          const splitAmounts = RoundingService.splitEvenly(totalAmount, memberIds.length);
          allocations = memberIds.map((memberId, idx) => ({
            memberId,
            amount: splitAmounts[idx],
            shareRatio: 1 / memberIds.length,
          }));
        }
        break;
      }
    }

    // Invariant validation check
    const allocationAmounts = allocations.map((a) => a.amount);
    if (!RoundingService.validateAllocationsSum(allocationAmounts, totalAmount)) {
      throw new BadRequestError('Allocation calculation failed invariant check: sum does not equal total');
    }

    return allocations;
  }

  /**
   * Calculates prorated days for a member in a specific billing month.
   */
  public static calculateProratedDays(
    joinDate: Date,
    leaveDate: Date | null,
    year: number,
    month: number
  ): { activeDays: number; totalDaysInMonth: number; fraction: number } {
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month - 1, totalDaysInMonth, 23, 59, 59));

    const startDay = joinDate > monthStart ? joinDate.getUTCDate() : 1;
    const endDay = leaveDate && leaveDate < monthEnd ? leaveDate.getUTCDate() : totalDaysInMonth;

    if (startDay > endDay) {
      return { activeDays: 0, totalDaysInMonth, fraction: 0 };
    }

    const activeDays = Math.min(totalDaysInMonth, Math.max(0, endDay - startDay + 1));
    const fraction = activeDays / totalDaysInMonth;

    return { activeDays, totalDaysInMonth, fraction };
  }
}
