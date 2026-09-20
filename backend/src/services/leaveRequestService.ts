import { prisma, isDatabaseOnline } from '../config/database.js';
import { LeaveRequestStatus, MemberStatus, Role } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { RoundingService } from './financial/roundingService.js';

export interface CreateLeaveRequestInput {
  startDate: string;
  endDate?: string;
  type?: 'TEMPORARY' | 'PERMANENT_EXIT';
  reason?: string;
}

export class LeaveRequestService {
  /**
   * Generates a comprehensive exit clearance audit for a member.
   */
  public static async getExitClearanceAudit(messId: string, memberId: string) {
    try {
      if (await isDatabaseOnline()) {
        const member = await prisma.messMember.findFirst({
          where: { id: memberId, messId },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            room: true,
          },
        });

        if (!member) throw new NotFoundError('Member not found');

        // Calculate all-time ledger totals for accurate clearance
        const ledgerEntries = await prisma.ledgerEntry.findMany({
          where: { messId, memberId },
        });

        let totalCredits = 0;
        let totalDebits = 0;
        for (const entry of ledgerEntries) {
          const amt = Number(entry.amount);
          if (entry.direction === 'CREDIT') totalCredits += amt;
          else if (entry.direction === 'DEBIT') totalDebits += amt;
        }

        totalCredits = RoundingService.roundMoney(totalCredits);
        totalDebits = RoundingService.roundMoney(totalDebits);
        const netBalance = RoundingService.roundMoney(totalCredits - totalDebits);

        // Check unsettled settlements
        const pendingSettlementItems = await prisma.settlementItem.findMany({
          where: {
            payerMemberId: memberId,
            status: { in: ['PENDING', 'PARTIALLY_PAID'] },
          },
        });

        const unsettledDebtAmount = pendingSettlementItems.reduce(
          (sum, item) => sum + (Number(item.amount) - Number(item.settledAmount)),
          0
        );

        // Unposted utility allocations
        const unpostedAllocations = await prisma.utilityAllocation.findMany({
          where: {
            memberId,
            utilityBill: { status: { in: ['DRAFT', 'PENDING_REVIEW', 'APPROVED'] } },
          },
        });

        const pendingUtilityAmount = unpostedAllocations.reduce(
          (sum, alloc) => sum + Number(alloc.amount),
          0
        );

        const isCleared = netBalance >= 0 && unsettledDebtAmount === 0 && pendingUtilityAmount === 0;

        return {
          memberId: member.id,
          memberName: member.user.name,
          email: member.user.email,
          currentStatus: member.status,
          assignedRoom: member.room ? { id: member.room.id, roomNumber: member.room.roomNumber } : null,
          financialSummary: {
            totalCredits,
            totalDebits,
            netBalance,
            balanceStatus: netBalance < 0 ? 'DEFICIT' : netBalance > 0 ? 'SURPLUS' : 'SETTLED',
            unsettledDebtAmount: RoundingService.roundMoney(unsettledDebtAmount),
            pendingUtilityAmount: RoundingService.roundMoney(pendingUtilityAmount),
          },
          exitChecklist: {
            roomVacated: !member.roomId,
            allDebtsSettled: netBalance >= 0 && unsettledDebtAmount === 0,
            noPendingUtilityBills: pendingUtilityAmount === 0,
            eligibleForImmediateExit: isCleared,
          },
        };
      }
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
    }

    // In-memory fallback
    return {
      memberId,
      memberName: 'Member',
      email: 'member@example.com',
      currentStatus: 'ACTIVE',
      assignedRoom: { id: 'room-1', roomNumber: 'A-101' },
      financialSummary: {
        totalCredits: 5000,
        totalDebits: 5000,
        netBalance: 0,
        balanceStatus: 'SETTLED',
        unsettledDebtAmount: 0,
        pendingUtilityAmount: 0,
      },
      exitChecklist: {
        roomVacated: false,
        allDebtsSettled: true,
        noPendingUtilityBills: true,
        eligibleForImmediateExit: true,
      },
    };
  }

  /**
   * Creates a leave or permanent exit request.
   */
  public static async createLeaveRequest(
    messId: string,
    memberId: string,
    data: CreateLeaveRequestInput
  ) {
    const type = data.type || 'TEMPORARY';

    try {
      if (await isDatabaseOnline()) {
        const member = await prisma.messMember.findFirst({
          where: { id: memberId, messId },
        });
        if (!member) throw new NotFoundError('Member not found');

        const clearance = await this.getExitClearanceAudit(messId, memberId);

        const request = await prisma.$transaction(async (tx) => {
          const leaveReq = await tx.leaveRequest.create({
            data: {
              messId,
              memberId,
              startDate: new Date(data.startDate),
              endDate: data.endDate ? new Date(data.endDate) : null,
              type,
              reason: data.reason || null,
              status: LeaveRequestStatus.PENDING,
              clearanceDetails: clearance as any,
            },
            include: {
              member: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
            },
          });

          // If permanent exit requested, update member status to LEAVING_REQUESTED
          if (type === 'PERMANENT_EXIT') {
            await tx.messMember.update({
              where: { id: memberId },
              data: { status: MemberStatus.LEAVING_REQUESTED },
            });

            await tx.memberHistory.create({
              data: {
                messId,
                memberId,
                action: 'LEAVING_REQUESTED',
                details: {
                  leaveRequestId: leaveReq.id,
                  reason: data.reason,
                  balanceSnapshot: clearance.financialSummary,
                },
              },
            });
          }

          return leaveReq;
        });

        // Phase 8: Notify Mess Admins
        try {
          const { NotificationService } = await import('./notificationService.js');
          const admins = await prisma.messMember.findMany({
            where: {
              messId,
              role: { in: [Role.OWNER, Role.MANAGER] },
              status: MemberStatus.ACTIVE,
            },
            select: { userId: true, id: true },
          });

          await NotificationService.createBulkNotifications(
            admins.map((admin) => ({
              messId,
              userId: admin.userId,
              memberId: admin.id,
              type: 'MEMBER_EXIT_REQUESTED',
              category: 'MEMBERS' as const,
              priority: 'NORMAL' as const,
              title: 'Leave Request Submitted',
              message: `${request.member?.user?.name || 'A member'} has submitted a ${type.toLowerCase().replace('_', ' ')} request.`,
              entityType: 'LEAVE_REQUEST',
              entityId: request.id,
              actionUrl: '/members',
              idempotencyKey: `leave_req_${request.id}_${admin.userId}`,
            }))
          );
        } catch (notifErr: any) {
          console.warn(`Leave request notification warning: ${notifErr.message}`);
        }

        return request;
      }
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    }

    // In-memory fallback
    return {
      id: `leave-${Date.now()}`,
      messId,
      memberId,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      type,
      reason: data.reason || null,
      status: LeaveRequestStatus.PENDING,
      createdAt: new Date(),
    };
  }

  /**
   * Retrieves leave requests for a mess with optional filtering.
   */
  public static async getLeaveRequests(
    messId: string,
    filters?: { status?: LeaveRequestStatus; memberId?: string }
  ) {
    try {
      if (await isDatabaseOnline()) {
        const where: any = { messId };
        if (filters?.status) where.status = filters.status;
        if (filters?.memberId) where.memberId = filters.memberId;

        const requests = await prisma.leaveRequest.findMany({
          where,
          include: {
            member: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                room: true,
              },
            },
            approvedBy: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return requests;
      }
    } catch {
      // Fallback
    }

    return [];
  }

  /**
   * Approves a leave request:
   * - Permanent exit: releases room, transitions status to EXITING or SETTLED.
   * - Temporary: transitions status to ON_LEAVE.
   */
  public static async approveLeaveRequest(
    messId: string,
    requestId: string,
    approverMemberId: string
  ) {
    try {
      if (await isDatabaseOnline()) {
        const leaveReq = await prisma.leaveRequest.findFirst({
          where: { id: requestId, messId },
          include: { member: true },
        });

        if (!leaveReq) throw new NotFoundError('Leave request not found');
        if (leaveReq.status !== LeaveRequestStatus.PENDING) {
          throw new ValidationError(`Cannot approve leave request with status ${leaveReq.status}`);
        }

        const clearance = await this.getExitClearanceAudit(messId, leaveReq.memberId);

        const result = await prisma.$transaction(async (tx) => {
          let newMemberStatus: MemberStatus;

          if (leaveReq.type === 'PERMANENT_EXIT') {
            // Vacate assigned room to free capacity
            if (leaveReq.member.roomId) {
              await tx.memberHistory.create({
                data: {
                  messId,
                  memberId: leaveReq.memberId,
                  action: 'ROOM_VACATED',
                  details: {
                    previousRoomId: leaveReq.member.roomId,
                    previousRoomNo: leaveReq.member.roomNo,
                    reason: 'Permanent exit clearance room release',
                  },
                },
              });
            }

            // Determine exit or settled status based on net balance
            newMemberStatus = clearance.financialSummary.netBalance === 0 ? MemberStatus.SETTLED : MemberStatus.EXITING;

            await tx.messMember.update({
              where: { id: leaveReq.memberId },
              data: {
                status: newMemberStatus,
                roomId: null,
                roomNo: null,
                leaveDate: new Date(),
              },
            });
          } else {
            // Temporary leave
            newMemberStatus = MemberStatus.ON_LEAVE;
            await tx.messMember.update({
              where: { id: leaveReq.memberId },
              data: { status: newMemberStatus },
            });
          }

          // Approve leave request
          const updatedReq = await tx.leaveRequest.update({
            where: { id: requestId },
            data: {
              status: LeaveRequestStatus.APPROVED,
              approvedById: approverMemberId,
              approvedAt: new Date(),
            },
          });

          // Audit log history
          await tx.memberHistory.create({
            data: {
              messId,
              memberId: leaveReq.memberId,
              action: 'LEAVE_APPROVED',
              details: {
                leaveRequestId: requestId,
                type: leaveReq.type,
                newStatus: newMemberStatus,
                clearanceSnapshot: clearance,
              },
            },
          });

          return updatedReq;
        });

        // Phase 8: Notify Member of Approval
        try {
          const { NotificationService } = await import('./notificationService.js');
          await NotificationService.createNotification({
            messId,
            userId: leaveReq.member.userId,
            memberId: leaveReq.memberId,
            type: 'MEMBER_EXIT_APPROVED',
            category: 'MEMBERS',
            priority: 'NORMAL',
            title: 'Leave Request Approved',
            message: `Your ${leaveReq.type.toLowerCase().replace('_', ' ')} request has been approved.`,
            entityType: 'LEAVE_REQUEST',
            entityId: requestId,
            actionUrl: '/members',
            idempotencyKey: `leave_app_${requestId}`,
          });
        } catch (notifErr: any) {
          console.warn(`Leave approval notification warning: ${notifErr.message}`);
        }

        return result;
      }
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    }

    return { id: requestId, status: LeaveRequestStatus.APPROVED };
  }

  /**
   * Rejects a leave request and restores member to ACTIVE status if pending exit.
   */
  public static async rejectLeaveRequest(
    messId: string,
    requestId: string,
    approverMemberId: string,
    rejectionReason: string
  ) {
    try {
      if (await isDatabaseOnline()) {
        const leaveReq = await prisma.leaveRequest.findFirst({
          where: { id: requestId, messId },
          include: { member: true },
        });

        if (!leaveReq) throw new NotFoundError('Leave request not found');

        const result = await prisma.$transaction(async (tx) => {
          // If member was LEAVING_REQUESTED, restore back to ACTIVE
          if (leaveReq.member.status === MemberStatus.LEAVING_REQUESTED) {
            await tx.messMember.update({
              where: { id: leaveReq.memberId },
              data: { status: MemberStatus.ACTIVE },
            });

            await tx.memberHistory.create({
              data: {
                messId,
                memberId: leaveReq.memberId,
                action: 'STATUS_RESTORED',
                details: {
                  reason: `Leave request rejected: ${rejectionReason}`,
                  previousStatus: MemberStatus.LEAVING_REQUESTED,
                  newStatus: MemberStatus.ACTIVE,
                },
              },
            });
          }

          const updatedReq = await tx.leaveRequest.update({
            where: { id: requestId },
            data: {
              status: LeaveRequestStatus.REJECTED,
              approvedById: approverMemberId,
              rejectionReason,
            },
          });

          return updatedReq;
        });

        return result;
      }
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    }

    return { id: requestId, status: LeaveRequestStatus.REJECTED, rejectionReason };
  }
}
