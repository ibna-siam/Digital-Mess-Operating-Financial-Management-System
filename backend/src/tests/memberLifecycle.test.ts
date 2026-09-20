import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, isDatabaseOnline } from '../config/database.js';
import { MemberService } from '../services/memberService.js';
import { InvitationService } from '../services/invitationService.js';
import { LeaveRequestService } from '../services/leaveRequestService.js';
import { LedgerService } from '../services/financial/ledgerService.js';
import { Role, MemberStatus, LeaveRequestStatus, InvitationStatus } from '@prisma/client';

describe('Phase 7: Advanced Member & Mess Management System', () => {
  let messId: string = 'mess-greenview-01';
  let member1Id: string = 'mem-1';
  let member2Id: string = 'mem-2';
  let member3Id: string = 'mem-3';
  let testUser1Id: string | null = null;
  let testUser2Id: string | null = null;
  let testUser3Id: string | null = null;
  let createdRoomId: string;

  beforeAll(async () => {
    if (await isDatabaseOnline()) {
      try {
        const testUnique = `M7_${Date.now()}`;
        const u1 = await prisma.user.create({
          data: {
            email: `m7_admin_${testUnique}@test.com`,
            passwordHash: 'test_hash_123',
            name: 'Siam Lifecycle Admin',
            isActive: true,
          },
        });
        testUser1Id = u1.id;

        const u2 = await prisma.user.create({
          data: {
            email: `m7_mem2_${testUnique}@test.com`,
            passwordHash: 'test_hash_123',
            name: 'Rahim Roommate',
            isActive: true,
          },
        });
        testUser2Id = u2.id;

        const u3 = await prisma.user.create({
          data: {
            email: `m7_mem3_${testUnique}@test.com`,
            passwordHash: 'test_hash_123',
            name: 'Karim Financial Member',
            isActive: true,
          },
        });
        testUser3Id = u3.id;

        const m = await prisma.mess.create({
          data: {
            name: `Phase7 Mess ${testUnique}`,
            code: `P7-${testUnique}`,
            currency: 'BDT',
            currencySymbol: '৳',
            status: 'ACTIVE',
            createdById: testUser1Id,
          },
        });
        messId = m.id;

        const room = await prisma.room.create({
          data: {
            messId,
            roomNumber: 'A-101',
            floor: '1st',
            capacity: 2,
            monthlyRent: 8000,
          },
        });
        createdRoomId = room.id;

        const mem1 = await prisma.messMember.create({
          data: {
            messId,
            userId: testUser1Id,
            role: 'OWNER',
            status: 'ACTIVE',
            roomId: createdRoomId,
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
          },
        });
        member2Id = mem2.id;

        const mem3 = await prisma.messMember.create({
          data: {
            messId,
            userId: testUser3Id,
            role: 'MANAGER',
            status: 'ACTIVE',
          },
        });
        member3Id = mem3.id;

        // Post financial entries for member 3 to verify financial regression
        await LedgerService.createEntry({
          messId,
          memberId: member3Id,
          entryType: 'ADVANCE_DEPOSIT',
          direction: 'CREDIT',
          amount: 5000,
          description: 'Phase 7 Advance Deposit',
        });

        await LedgerService.createEntry({
          messId,
          memberId: member3Id,
          entryType: 'FOOD_SHARE',
          direction: 'DEBIT',
          amount: 2200,
          description: 'Phase 7 Food Share',
        });
      } catch (err) {
        console.warn('Phase 7 live test setup fallback:', err);
      }
    }
  });

  afterAll(async () => {
    if (testUser1Id && (await isDatabaseOnline())) {
      try {
        await prisma.memberHistory.deleteMany({ where: { messId } });
        await prisma.leaveRequest.deleteMany({ where: { messId } });
        await prisma.invitation.deleteMany({ where: { messId } });
        await prisma.ledgerEntry.deleteMany({ where: { messId } });
        await prisma.messMember.deleteMany({ where: { messId } });
        await prisma.room.deleteMany({ where: { messId } });
        await prisma.mess.deleteMany({ where: { id: messId } });
        await prisma.user.deleteMany({
          where: { id: { in: [testUser1Id, testUser2Id!, testUser3Id!] } },
        });
      } catch (err) {
        console.warn('Phase 7 test cleanup warning:', err);
      }
    }
  });

  describe('1. Controlled Member Lifecycle & Directory', () => {
    it('should list members with paginated structure and computed net balances', async () => {
      const result = await MemberService.getMembersPaginated(messId, { page: 1, limit: 10 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.members)).toBe(true);
      expect(result.members.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);

      const first = result.members[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('netBalance');
      expect(first).toHaveProperty('balanceStatus');
    });

    it('should filter members by status and search keywords', async () => {
      const activeOnly = await MemberService.getMembersPaginated(messId, {
        status: MemberStatus.ACTIVE,
      });
      for (const m of activeOnly.members) {
        expect(m.status).toBe(MemberStatus.ACTIVE);
      }

      const searchResult = await MemberService.getMembersPaginated(messId, {
        search: 'Siam',
      });
      expect(searchResult.members.some((m) => m.name.toLowerCase().includes('siam'))).toBe(true);
    });

    it('should retrieve single member details with full profile and financial summary', async () => {
      const member = await MemberService.getMemberById(messId, member1Id);
      expect(member).toBeDefined();
      expect(member.id).toBe(member1Id);
      expect(member).toHaveProperty('netBalance');
      expect(member).toHaveProperty('totalMealsCount');
      expect(member).toHaveProperty('totalExpensesPaid');
    });

    it('should update member personal profile and cost eligibility', async () => {
      const updated = await MemberService.updateMemberProfile(messId, member1Id, {
        emergencyContact: '+8801999999999',
        address: 'House 14, Road 5, Dhanmondi',
        notes: 'Vegetarian on Tuesdays',
      });

      expect(updated).toBeDefined();

      const eligibility = {
        MEALS: true,
        RENT: true,
        ELECTRICITY: true,
        GAS: false,
        WATER: true,
        WIFI: true,
        MAID: true,
        OTHER: true,
      };

      const updatedEligibility = await MemberService.updateCostEligibility(messId, member1Id, eligibility);
      expect(updatedEligibility).toBeDefined();
    });
  });

  describe('2. Cryptographic Single-Use Invitation Tokens & Onboarding', () => {
    let createdToken: string;

    it('should generate a 64-character hex cryptographic token with 7-day expiration', async () => {
      const testEmail = `invite-${Date.now()}@example.com`;
      const invitation = await InvitationService.createInvitation(messId, testUser1Id || 'usr-1', {
        email: testEmail,
        name: 'New Invited Member',
        role: Role.MEMBER,
        joinDate: '2026-10-01',
      });

      expect(invitation).toBeDefined();
      expect(invitation.token).toBeDefined();
      expect(invitation.token.length).toBe(64); // 32 bytes hex = 64 characters
      expect(invitation.status).toBe(InvitationStatus.PENDING);
      expect(invitation.inviteUrl).toContain(invitation.token);

      createdToken = invitation.token;

      const expires = new Date(invitation.expiresAt).getTime();
      const now = Date.now();
      const diffDays = (expires - now) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThan(7.1);
    });

    it('should retrieve and validate token for public onboarding view', async () => {
      const fetched = await InvitationService.getInvitationByToken(createdToken);
      expect(fetched).toBeDefined();
      expect(fetched.token).toBe(createdToken);
      expect(fetched.mess).toBeDefined();
      expect(fetched.status).toBe(InvitationStatus.PENDING);
    });

    it('should accept invitation and establish active membership', async () => {
      const acceptResult = await InvitationService.acceptInvitation(createdToken, testUser2Id || 'usr-accept-1', {
        name: 'Rahim Hasan Validated',
        phone: '+8801888888888',
      });

      expect(acceptResult).toBeDefined();
      expect(acceptResult.member).toBeDefined();
      expect(acceptResult.member.status).toBe(MemberStatus.ACTIVE);
    });
  });

  describe('3. Room Assignment & Capacity Validation', () => {
    it('should retrieve rooms with available beds and capacity metrics', async () => {
      const rooms = await MemberService.getRooms(messId);
      expect(Array.isArray(rooms)).toBe(true);
      expect(rooms.length).toBeGreaterThan(0);

      const firstRoom = rooms[0];
      expect(firstRoom).toHaveProperty('capacity');
      expect(firstRoom).toHaveProperty('currentOccupants');
      expect(firstRoom).toHaveProperty('availableBeds');
      expect(firstRoom.availableBeds).toBe(Math.max(0, firstRoom.capacity - firstRoom.currentOccupants));
    });

    it('should assign and vacate rooms while preserving audit history', async () => {
      // Assign member 2 to createdRoomId
      const assigned = await MemberService.assignRoomWithValidation(messId, member2Id, createdRoomId);
      expect(assigned).toBeDefined();
      expect(assigned.roomId).toBe(createdRoomId);

      // Room capacity is 2, now member1 and member2 occupy it (occupancy = 2).
      // Assigning member 3 should fail validation with capacity exceeded
      await expect(
        MemberService.assignRoomWithValidation(messId, member3Id, createdRoomId)
      ).rejects.toThrow(/full capacity/i);

      // Vacate member 2
      const vacated = await MemberService.assignRoomWithValidation(messId, member2Id, null);
      expect(vacated).toBeDefined();
      expect(vacated.roomId).toBeNull();
    });
  });

  describe('4. Leave Request & Exit Clearance Engine', () => {
    let leaveRequestId: string;

    it('should generate an exit clearance audit report with balance breakdown', async () => {
      const clearance = await LeaveRequestService.getExitClearanceAudit(messId, member3Id);
      expect(clearance).toBeDefined();
      expect(clearance.memberId).toBe(member3Id);
      expect(clearance.financialSummary).toBeDefined();
      expect(clearance.financialSummary).toHaveProperty('netBalance');
      expect(clearance.financialSummary).toHaveProperty('balanceStatus');
      expect(clearance.exitChecklist).toBeDefined();
      expect(clearance.exitChecklist).toHaveProperty('eligibleForImmediateExit');
    });

    it('should process leave requests with approval workflow and room release', async () => {
      // Submit leave request for member 1
      const leaveReq = await LeaveRequestService.createLeaveRequest(messId, member1Id, {
        startDate: '2026-10-01',
        endDate: '2026-10-15',
        type: 'TEMPORARY',
        reason: 'Family visit during vacation',
      });

      expect(leaveReq).toBeDefined();
      expect(leaveReq.status).toBe(LeaveRequestStatus.PENDING);
      leaveRequestId = leaveReq.id;

      // Approve leave request
      const approved = await LeaveRequestService.approveLeaveRequest(messId, leaveRequestId, member1Id);
      expect(approved).toBeDefined();
      expect(approved.status).toBe(LeaveRequestStatus.APPROVED);

      const mem1After = await MemberService.getMemberById(messId, member1Id);
      expect(mem1After.status).toBe(MemberStatus.ON_LEAVE);

      // Restore to active
      await MemberService.restoreMember(messId, member1Id);
    });
  });

  describe('5. Mandatory Financial Regression Test & Non-Destructive Archival', () => {
    it('CRITICAL: Archiving a member must NEVER delete ledger records or alter financial balance (0.00 variance)', async () => {
      // 1. Capture exact financial standing BEFORE archival
      const initialSummary = await MemberService.getMemberFinancialSummary(messId, member3Id);
      const preBalance = initialSummary.netBalance;
      const preCredits = initialSummary.totalCredits;
      const preDebits = initialSummary.totalDebits;

      expect(preCredits).toBe(5000);
      expect(preDebits).toBe(2200);
      expect(preBalance).toBe(2800); // 5000 - 2200 = 2800 surplus

      // 2. Perform archival
      const archivedMember = await MemberService.archiveMember(messId, member3Id);
      expect(archivedMember).toBeDefined();
      expect(archivedMember.status).toBe(MemberStatus.ARCHIVED);
      expect(archivedMember.roomId).toBeNull(); // Room vacated for future occupant

      // 3. Verify member record STILL EXISTS in database (no physical row deletion)
      const memberAfter = await MemberService.getMemberById(messId, member3Id);
      expect(memberAfter).toBeDefined();
      expect(memberAfter.id).toBe(member3Id);
      expect(memberAfter.status).toBe(MemberStatus.ARCHIVED);

      // 4. Verify all ledger entries, credits, and debits match EXACTLY to the cent (0.00 variance)
      const postSummary = await MemberService.getMemberFinancialSummary(messId, member3Id);
      expect(postSummary.netBalance).toBe(preBalance);
      expect(postSummary.totalCredits).toBe(preCredits);
      expect(postSummary.totalDebits).toBe(preDebits);

      const variance = Math.abs(postSummary.netBalance - preBalance);
      expect(variance).toBe(0.00);

      // 5. Restore member
      const restored = await MemberService.restoreMember(messId, member3Id);
      expect(restored.status).toBe(MemberStatus.ACTIVE);
    });
  });
});
