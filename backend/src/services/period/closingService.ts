import { prisma, isDatabaseOnline } from '../../config/database.js';
import { PeriodService, FinancialPeriodDTO } from './periodService.js';
import { ValidationService } from './validationService.js';
import { SnapshotService, FinancialSnapshotDTO } from './snapshotService.js';
import { LedgerService } from '../financial/ledgerService.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export interface AuditPeriodEventDTO {
  id: string;
  periodId: string;
  messId: string;
  eventType: string;
  actorId?: string | null;
  actorName?: string | null;
  notes?: string | null;
  createdAt: string;
}

const memoryEvents: AuditPeriodEventDTO[] = [];

export class ClosingService {
  /**
   * Move period to UNDER_REVIEW
   */
  static async startReview(rawMessId: string, periodKey: string, actorId?: string, actorName?: string): Promise<FinancialPeriodDTO> {
    const messId = await PeriodService.resolveMessId(rawMessId);
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      throw new NotFoundError(`Financial period ${periodKey} not found.`);
    }

    const updated = await PeriodService.transitionStatus(messId, periodKey, 'UNDER_REVIEW', actorId);
    await this.logEvent(updated.id, messId, 'REVIEW_STARTED', actorId, actorName, `Started month-end review for ${periodKey}`);
    return updated;
  }

  /**
   * Finalize month: validates zero blocking issues, generates snapshot, sets status to FINALIZED
   */
  static async finalizePeriod(
    rawMessId: string,
    periodKey: string,
    actorId?: string,
    actorName?: string
  ): Promise<{ period: FinancialPeriodDTO; snapshot: FinancialSnapshotDTO }> {
    const messId = await PeriodService.resolveMessId(rawMessId);
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      throw new NotFoundError(`Financial period ${periodKey} not found.`);
    }

    // Run authoritative validation check
    const validation = await ValidationService.validateFinancialPeriod(messId, periodKey);
    if (!validation.canFinalize) {
      const issues = validation.blockingIssues.map((b) => b.message).join('; ');
      throw new BadRequestError(`Cannot finalize financial period ${periodKey}. Blocking issues detected: ${issues}`);
    }

    // Generate immutable financial snapshot
    const snapshot = await SnapshotService.createFinancialSnapshot(messId, period.id, periodKey);

    // Transition status to FINALIZED
    const updated = await PeriodService.transitionStatus(messId, periodKey, 'FINALIZED', actorId);

    await this.logEvent(
      period.id,
      messId,
      'FINALIZED',
      actorId,
      actorName,
      `Finalized ${periodKey} with Meal Rate ৳${snapshot.mealRate.toFixed(2)} and Total Expenses ৳${snapshot.totalExpenses.toFixed(2)}`
    );

    // Phase 8: Real-time Communication & Month-End Notification
    try {
      const { NotificationService } = await import('../notificationService.js');
      const { emitToMess, SOCKET_EVENTS } = await import('../../socket/socketEmitter.js');
      const { prisma } = await import('../../config/database.js');

      const members = await prisma.messMember.findMany({
        where: { messId, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
        select: { userId: true, id: true },
      });

      await NotificationService.createBulkNotifications(
        members.map((m) => ({
          messId,
          userId: m.userId,
          memberId: m.id,
          type: 'MONTH_FINALIZED',
          category: 'MONTH_END' as const,
          priority: 'NORMAL' as const,
          title: `Month ${periodKey} Finalized`,
          message: `Financial calculations for ${periodKey} are complete. Meal Rate: ৳${snapshot.mealRate.toFixed(2)}. Statements are now ready.`,
          entityType: 'FINANCIAL_PERIOD',
          entityId: period.id,
          actionUrl: '/month-end',
          idempotencyKey: `month_fin_${period.id}_${m.userId}`,
        }))
      );

      emitToMess(messId, SOCKET_EVENTS.PERIOD_FINALIZED, {
        messId,
        periodKey,
        mealRate: snapshot.mealRate,
      });
      emitToMess(messId, SOCKET_EVENTS.DASHBOARD_UPDATED, { messId });
    } catch (notifErr: any) {
      console.warn(`Month finalized notification error: ${notifErr.message}`);
    }

    return { period: updated, snapshot };
  }

  /**
   * Close month: verifies finalization, updates status to CLOSED, carries forward balances to next month
   */
  static async closePeriod(
    rawMessId: string,
    periodKey: string,
    actorId?: string,
    actorName?: string
  ): Promise<{ period: FinancialPeriodDTO; carriedForwardCount: number }> {
    const messId = await PeriodService.resolveMessId(rawMessId);
    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      throw new NotFoundError(`Financial period ${periodKey} not found.`);
    }

    if (period.status !== 'FINALIZED' && period.status !== 'UNDER_REVIEW') {
      throw new BadRequestError(
        `Financial period must be in FINALIZED or UNDER_REVIEW state before closing. Current status: ${period.status}`
      );
    }

    // If not yet finalized, run finalization first
    let snapshot = await SnapshotService.getSnapshot(period.id);
    if (!snapshot) {
      const finalResult = await this.finalizePeriod(messId, periodKey, actorId, actorName);
      snapshot = finalResult.snapshot;
    }

    // Transition status to CLOSED
    const updated = await PeriodService.transitionStatus(messId, periodKey, 'CLOSED', actorId);

    // Carry forward opening balances into next month
    const carriedForwardCount = await this.carryForwardBalances(messId, periodKey, snapshot);

    await this.logEvent(
      period.id,
      messId,
      'CLOSED',
      actorId,
      actorName,
      `Closed financial period ${periodKey}. Carried forward ${carriedForwardCount} opening balance(s) to next period.`
    );

    return { period: updated, carriedForwardCount };
  }

  /**
   * Reopen a closed month with mandatory audit reason
   */
  static async reopenPeriod(
    rawMessId: string,
    periodKey: string,
    actorId: string,
    reason: string,
    actorName?: string
  ): Promise<FinancialPeriodDTO> {
    const messId = await PeriodService.resolveMessId(rawMessId);
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestError('A valid explanatory reason of at least 5 characters is required to reopen a closed financial period.');
    }

    const period = await PeriodService.getPeriodByKey(messId, periodKey);
    if (!period) {
      throw new NotFoundError(`Financial period ${periodKey} not found.`);
    }

    if (period.status !== 'CLOSED') {
      throw new BadRequestError(`Only a CLOSED period can be reopened. Current status: ${period.status}`);
    }

    const updated = await PeriodService.transitionStatus(messId, periodKey, 'REOPENED', actorId, { reason });

    await this.logEvent(
      period.id,
      messId,
      'REOPENED',
      actorId,
      actorName,
      `Reopened period ${periodKey}. Reason: ${reason}`
    );

    return updated;
  }

  /**
   * Carry forward ending balances into next month as OPENING_BALANCE ledger entries
   */
  static async carryForwardBalances(rawMessId: string, currentPeriodKey: string, snapshot: FinancialSnapshotDTO): Promise<number> {
    const messId = await PeriodService.resolveMessId(rawMessId);
    const { year, month } = PeriodService.parsePeriodKey(currentPeriodKey);
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextPeriodKey = PeriodService.getPeriodKey(nextYear, nextMonth);

    // Ensure next period exists
    await PeriodService.getOrCreateCurrentPeriod(
      messId,
      new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0))
    );

    let carriedCount = 0;
    const balances = snapshot.memberBalances || [];

    for (const b of balances) {
      const net = Number(b.netBalance || 0);
      if (Math.abs(net) < 0.01) continue;

      if (net < 0) {
        // Member owes money (e.g. -1200) -> Post DEBIT in next month
        await LedgerService.postLedgerEntry({
          messId,
          memberId: b.memberId,
          entryType: 'OPENING_BALANCE',
          direction: 'DEBIT',
          amount: Math.abs(net),
          description: `Opening balance debt carried forward from closed period ${currentPeriodKey}`,
          referenceType: 'PERIOD_CLOSING',
          referenceId: snapshot.periodId,
          effectiveDate: new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0)),
        });
        carriedCount++;
      } else if (net > 0) {
        // Member has surplus credit (e.g. +800) -> Post CREDIT in next month
        await LedgerService.postLedgerEntry({
          messId,
          memberId: b.memberId,
          entryType: 'OPENING_BALANCE',
          direction: 'CREDIT',
          amount: net,
          description: `Opening credit balance carried forward from closed period ${currentPeriodKey}`,
          referenceType: 'PERIOD_CLOSING',
          referenceId: snapshot.periodId,
          effectiveDate: new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0)),
        });
        carriedCount++;
      }
    }

    return carriedCount;
  }

  /**
   * Log period lifecycle audit event
   */
  static async logEvent(
    periodId: string,
    messId: string,
    eventType: string,
    actorId?: string | null,
    actorName?: string | null,
    notes?: string | null
  ): Promise<AuditPeriodEventDTO> {
    const eventDTO: AuditPeriodEventDTO = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      periodId,
      messId,
      eventType,
      actorId: actorId || null,
      actorName: actorName || null,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    if (await isDatabaseOnline()) {
      try {
        const created = await prisma.periodEvent.create({
          data: {
            periodId,
            messId,
            eventType,
            actorId: actorId || null,
            actorName: actorName || null,
            notes: notes || null,
          },
        });
        return {
          id: created.id,
          periodId: created.periodId,
          messId: created.messId,
          eventType: created.eventType,
          actorId: created.actorId,
          actorName: created.actorName,
          notes: created.notes,
          createdAt: created.createdAt.toISOString(),
        };
      } catch (err) {
        // Fallback to memory
      }
    }

    memoryEvents.push(eventDTO);
    return eventDTO;
  }

  /**
   * List audit events for a period
   */
  static async listEvents(periodId: string): Promise<AuditPeriodEventDTO[]> {
    if (await isDatabaseOnline()) {
      const records = await prisma.periodEvent.findMany({
        where: { periodId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r) => ({
        id: r.id,
        periodId: r.periodId,
        messId: r.messId,
        eventType: r.eventType,
        actorId: r.actorId,
        actorName: r.actorName,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
      }));
    }

    return memoryEvents.filter((e) => e.periodId === periodId);
  }

  // Test helper
  static _resetMemoryEvents() {
    memoryEvents.length = 0;
  }
}
