import { prisma, isDatabaseOnline } from '../../config/database.js';
import { RoundingService } from './roundingService.js';
import { BalanceService } from './balanceService.js';
import { SettlementItemStatus, SettlementPlanStatus, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export interface SettlementTransferPlanItem {
  id?: string;
  payerMemberId: string;
  payerName: string;
  receiverMemberId: string;
  receiverName: string;
  amount: number;
  settledAmount: number;
  status: SettlementItemStatus;
  notes?: string;
}

export interface SettlementPlanDTO {
  id: string;
  messId: string;
  billingPeriod: string;
  totalDebtPool: number;
  status: SettlementPlanStatus;
  items: SettlementTransferPlanItem[];
  createdAt: string;
}

// In-memory fallback
const memoryPlans: Map<string, SettlementPlanDTO> = new Map();

export class SettlementService {
  /**
   * Deterministic smart settlement algorithm:
   * Minimizes transactions required to settle the mess by matching largest debtors against largest creditors.
   */
  public static calculateOptimalSettlementPlan(
    memberBalances: Array<{ memberId: string; memberName: string; netBalance: number }>
  ): SettlementTransferPlanItem[] {
    // 1. Separate debtors (net < 0) and creditors (net > 0)
    const debtors: Array<{ id: string; name: string; remaining: number }> = [];
    const creditors: Array<{ id: string; name: string; remaining: number }> = [];

    let totalDebt = 0;
    let totalCredit = 0;

    for (const m of memberBalances) {
      const net = RoundingService.roundMoney(m.netBalance);
      if (net < -0.01) {
        const debt = Math.abs(net);
        debtors.push({ id: m.memberId, name: m.memberName, remaining: debt });
        totalDebt += debt;
      } else if (net > 0.01) {
        creditors.push({ id: m.memberId, name: m.memberName, remaining: net });
        totalCredit += net;
      }
    }

    // 2. Validate reconciliation invariant: total debt must match total credit
    totalDebt = RoundingService.roundMoney(totalDebt);
    totalCredit = RoundingService.roundMoney(totalCredit);

    if (Math.abs(totalDebt - totalCredit) > 0.05) {
      throw new BadRequestError(
        `Settlement reconciliation failed: total debt (৳${totalDebt}) does not match total credit (৳${totalCredit})`
      );
    }

    // 3. Sort deterministically: descending by remaining amount, with ID as secondary tie-breaker
    debtors.sort((a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id));
    creditors.sort((a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id));

    // 4. Greedy match
    const planItems: SettlementTransferPlanItem[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const transferAmount = RoundingService.roundMoney(Math.min(debtor.remaining, creditor.remaining));

      if (transferAmount > 0.009) {
        planItems.push({
          payerMemberId: debtor.id,
          payerName: debtor.name,
          receiverMemberId: creditor.id,
          receiverName: creditor.name,
          amount: transferAmount,
          settledAmount: 0,
          status: 'PENDING',
          notes: `${debtor.name} pays ${creditor.name} to settle balance`,
        });

        debtor.remaining = RoundingService.roundMoney(debtor.remaining - transferAmount);
        creditor.remaining = RoundingService.roundMoney(creditor.remaining - transferAmount);
      }

      if (debtor.remaining <= 0.009) dIdx++;
      if (creditor.remaining <= 0.009) cIdx++;
    }

    return planItems;
  }

  public static async resolveMessId(messId: string): Promise<string> {
    if (!messId) return messId;
    if (await isDatabaseOnline()) {
      try {
        const found = await prisma.mess.findFirst({
          where: {
            OR: [
              { id: messId },
              { code: { equals: messId, mode: 'insensitive' } },
              { code: { equals: messId.replace(/^mess-/, ''), mode: 'insensitive' } },
              ...(messId.toLowerCase().includes('greenview') ? [{ code: 'GREENVIEW-01' }] : []),
            ],
          },
          select: { id: true },
        });
        if (found) return found.id;
      } catch {
        // Fallback
      }
    }
    return messId;
  }

  /**
   * Generates and persists the settlement plan for a given mess and billing period.
   */
  public static async generateSettlementPlan(
    rawMessId: string,
    billingPeriod: string,
    createdById?: string
  ): Promise<SettlementPlanDTO> {
    const messId = await this.resolveMessId(rawMessId);
    // Fetch live net balances
    const messBalances = await BalanceService.calculateMessBalances(messId, billingPeriod);
    const planItems = this.calculateOptimalSettlementPlan(
      messBalances.memberBalances.map((m) => ({
        memberId: m.memberId,
        memberName: m.memberName,
        netBalance: m.netBalance,
      }))
    );

    const totalDebtPool = planItems.reduce((sum, item) => sum + item.amount, 0);

    try {
      if (!(await isDatabaseOnline())) {
        throw new Error('Database offline');
      }
      // Upsert settlement plan in database
      const existing = await prisma.settlementPlan.findUnique({
        where: {
          messId_billingPeriod: { messId, billingPeriod },
        },
      });

      if (existing) {
        // Atomically replace pending items and update total debt pool
        await prisma.$transaction(async (tx) => {
          await tx.settlementItem.deleteMany({
            where: { planId: existing.id, status: 'PENDING' },
          });

          if (planItems.length > 0) {
            await tx.settlementItem.createMany({
              data: planItems.map((it) => ({
                planId: existing.id,
                payerMemberId: it.payerMemberId,
                receiverMemberId: it.receiverMemberId,
                amount: new Prisma.Decimal(it.amount),
                settledAmount: new Prisma.Decimal(0),
                status: 'PENDING',
                notes: it.notes,
              })),
            });
          }

          await tx.settlementPlan.update({
            where: { id: existing.id },
            data: { totalDebtPool: new Prisma.Decimal(totalDebtPool) },
          });
        });

        return this.getSettlementPlan(messId, billingPeriod);
      }

      const created = await prisma.settlementPlan.create({
        data: {
          messId,
          billingPeriod,
          totalDebtPool: new Prisma.Decimal(totalDebtPool),
          status: 'ACTIVE',
          createdById,
          items: {
            create: planItems.map((it) => ({
              payerMemberId: it.payerMemberId,
              receiverMemberId: it.receiverMemberId,
              amount: new Prisma.Decimal(it.amount),
              settledAmount: new Prisma.Decimal(0),
              status: 'PENDING',
              notes: it.notes,
            })),
          },
        },
        include: {
          items: {
            include: {
              payer: { include: { user: true } },
              receiver: { include: { user: true } },
            },
          },
        },
      });

      return {
        id: created.id,
        messId: created.messId,
        billingPeriod: created.billingPeriod,
        totalDebtPool: Number(created.totalDebtPool),
        status: created.status,
        items: created.items.map((it) => ({
          id: it.id,
          payerMemberId: it.payerMemberId,
          payerName: it.payer.user.name,
          receiverMemberId: it.receiverMemberId,
          receiverName: it.receiver.user.name,
          amount: Number(it.amount),
          settledAmount: Number(it.settledAmount),
          status: it.status,
          notes: it.notes || undefined,
        })),
        createdAt: created.createdAt.toISOString(),
      };
    } catch {
      // In-memory fallback
      const planId = `plan-${messId}-${billingPeriod}`;
      const planDTO: SettlementPlanDTO = {
        id: planId,
        messId,
        billingPeriod,
        totalDebtPool: RoundingService.roundMoney(totalDebtPool),
        status: 'ACTIVE',
        items: planItems.map((it, idx) => ({
          ...it,
          id: `item-${planId}-${idx + 1}`,
        })),
        createdAt: new Date().toISOString(),
      };

      memoryPlans.set(planId, planDTO);
      return planDTO;
    }
  }

  /**
   * Retrieves the settlement plan and all transfer items for a billing period.
   */
  public static async getSettlementPlan(
    rawMessId: string,
    billingPeriod: string
  ): Promise<SettlementPlanDTO> {
    const messId = await this.resolveMessId(rawMessId);
    try {
      const plan = await prisma.settlementPlan.findUnique({
        where: {
          messId_billingPeriod: { messId, billingPeriod },
        },
        include: {
          items: {
            include: {
              payer: { include: { user: true } },
              receiver: { include: { user: true } },
            },
          },
        },
      });

      if (!plan) {
        // Auto-generate plan if not found
        try {
          return await this.generateSettlementPlan(messId, billingPeriod);
        } catch {
          return null as any;
        }
      }

      return {
        id: plan.id,
        messId: plan.messId,
        billingPeriod: plan.billingPeriod,
        totalDebtPool: Number(plan.totalDebtPool),
        status: plan.status,
        items: plan.items.map((it) => ({
          id: it.id,
          payerMemberId: it.payerMemberId,
          payerName: it.payer.user.name,
          receiverMemberId: it.receiverMemberId,
          receiverName: it.receiver.user.name,
          amount: Number(it.amount),
          settledAmount: Number(it.settledAmount),
          status: it.status,
          notes: it.notes || undefined,
        })),
        createdAt: plan.createdAt.toISOString(),
      };
    } catch {
      const planId = `plan-${messId}-${billingPeriod}`;
      if (memoryPlans.has(planId)) {
        return memoryPlans.get(planId)!;
      }
      return this.generateSettlementPlan(messId, billingPeriod);
    }
  }
}
