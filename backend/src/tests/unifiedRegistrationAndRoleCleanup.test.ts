import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { Express } from 'express';
import { prisma } from '../config/database.js';

describe('Phase 16: Unified Registration UX & Role Cleanup Suite', () => {
  let app: Express;
  const timestamp = Date.now();

  let createdMessId: string;
  let createdJoinCode: string;
  let managerToken: string;
  let managerUserId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();
  });

  describe('1. Flow A: Unified Registration with CREATE NEW MESS', () => {
    it('should atomically register user, create mess, assign MANAGER role, and return activeMess', async () => {
      const email = `manager_phase16_${timestamp}@example.com`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Phase 16 Manager',
          email,
          phone: '+8801700998877',
          password: 'Password123!',
          onboarding: {
            mode: 'CREATE',
            messName: `Phase 16 Unified Mess ${timestamp}`,
            city: 'Dhaka',
            area: 'Mirpur DOHS',
            address: 'Road 12, House 4',
            currency: 'BDT',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.activeMess).toBeDefined();
      expect(res.body.data.activeMess.name).toContain('Phase 16 Unified Mess');
      expect(res.body.data.activeMess.myRole).toBe('MANAGER');
      expect(res.body.data.activeMess.code).toMatch(/^MM-[A-Z0-9]{4,6}$/);

      managerToken = res.body.data.token;
      managerUserId = res.body.data.user.id;
      createdMessId = res.body.data.activeMess.id;
      createdJoinCode = res.body.data.activeMess.code;

      // Verify DB records
      const memberRecord = await prisma.messMember.findFirst({
        where: { messId: createdMessId, userId: managerUserId },
      });
      expect(memberRecord).toBeDefined();
      expect(memberRecord?.role).toBe('MANAGER');
      expect(memberRecord?.status).toBe('ACTIVE');
    });
  });

  describe('2. Flow B: Unified Registration with JOIN EXISTING MESS', () => {
    it('should atomically register user, validate join code, join mess as MEMBER, and return activeMess', async () => {
      const email = `member_phase16_${timestamp}@example.com`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Phase 16 Resident Member',
          email,
          phone: '+8801800998877',
          password: 'Password123!',
          onboarding: {
            mode: 'JOIN',
            joinCode: createdJoinCode,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.activeMess).toBeDefined();
      expect(res.body.data.activeMess.id).toBe(createdMessId);
      expect(res.body.data.activeMess.myRole).toBe('MEMBER');

      // Verify DB records
      const memberRecord = await prisma.messMember.findFirst({
        where: { messId: createdMessId, userId: res.body.data.user.id },
      });
      expect(memberRecord).toBeDefined();
      expect(memberRecord?.role).toBe('MEMBER');
      expect(memberRecord?.status).toBe('ACTIVE');
    });
  });

  describe('3. Flow C: Unified Registration with INVALID JOIN CODE (Atomicity Check)', () => {
    it('should reject invalid join code and NOT create an orphaned user', async () => {
      const email = `orphan_test_${timestamp}@example.com`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Orphan Attempt',
          email,
          phone: '+8801900998877',
          password: 'Password123!',
          onboarding: {
            mode: 'JOIN',
            joinCode: 'INVALID-CODE-9999',
          },
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify that the user was NOT saved to the database
      const orphanUser = await prisma.user.findUnique({
        where: { email },
      });
      expect(orphanUser).toBeNull();
    });
  });

  describe('4. Legacy Role Cleanup & Role Assignment RBAC', () => {
    it('should reject TREASURER as an invalid role in member invitation schema', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${createdMessId}/members/invite`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Legacy Role User',
          email: `legacy_role_${timestamp}@example.com`,
          role: 'TREASURER',
        });

      expect(res.status).toBe(400); // Validation error
      expect(res.body.success).toBe(false);
    });

    it('should accept MANAGER and MEMBER as valid roles in member invitation', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${createdMessId}/members/invite`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Second Manager',
          email: `second_manager_${timestamp}@example.com`,
          role: 'MANAGER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('MANAGER');
    });

    it('should prevent a MEMBER from promoting someone to MANAGER (403 Forbidden)', async () => {
      // 1. Register a member in the mess
      const memberReg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Regular Resident',
          email: `resident_${timestamp}@example.com`,
          password: 'Password123!',
          onboarding: { mode: 'JOIN', joinCode: createdJoinCode },
        });
      const residentToken = memberReg.body.data.token;
      const residentMemberId = memberReg.body.data.user.id;

      // 2. Member tries to invite or promote someone
      const res = await request(app)
        .post(`/api/v1/messes/${createdMessId}/members/invite`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          name: 'Illegal Promotion',
          email: `illegal_${timestamp}@example.com`,
          role: 'MANAGER',
        });

      // Member lacks MEMBERS_MANAGE permission
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('5. Optimized Dashboard Performance & Data Integrity', () => {
    it('should quickly return dashboard stats with correct KPIs and no bottlenecks', async () => {
      // 1. Initial query
      const coldStart = Date.now();
      const res = await request(app)
        .get(`/api/v1/dashboard/${createdMessId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      const coldElapsed = Date.now() - coldStart;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.kpis.totalMembers.value).toBeGreaterThanOrEqual(1);
      expect(res.body.data.operationalSummary).toBeDefined();
      expect(res.body.data.expenseByCategory).toBeDefined();
      console.log(`⚡ Cold Dashboard API response time: ${coldElapsed}ms`);

      // 2. Warm cached query (instant sub-100ms)
      const warmStart = Date.now();
      const cachedRes = await request(app)
        .get(`/api/v1/dashboard/${createdMessId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      const warmElapsed = Date.now() - warmStart;

      expect(cachedRes.status).toBe(200);
      expect(cachedRes.body.success).toBe(true);
      console.log(`⚡ Cached Dashboard API response time: ${warmElapsed}ms`);
      expect(warmElapsed).toBeLessThan(150);
    });
  });
});
