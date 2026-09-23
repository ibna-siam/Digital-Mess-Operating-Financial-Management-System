import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { Express } from 'express';
import { prisma } from '../config/database.js';

describe('Phase 15A: Multi-Mess / Multi-Tenant Security & Isolation Suite', () => {
  let app: Express;
  const timestamp = Date.now();

  // Test User & Mess Identifiers
  let managerAToken: string;
  let managerAId: string;
  let messAId: string;
  let messACode: string;

  let memberAToken: string;
  let memberAId: string;

  let managerBToken: string;
  let managerBId: string;
  let messBId: string;
  let messBCode: string;

  let memberBToken: string;
  let memberBId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();

    // 1. Register Manager A
    const regManA = await request(app).post('/api/v1/auth/register').send({
      email: `manager_a_${timestamp}@example.com`,
      password: 'SecurePassword123!',
      name: 'Manager Alice',
      phone: '+8801711111111',
    });
    managerAToken = regManA.body.data.token;
    managerAId = regManA.body.data.user.id;

    // 2. Register Member A
    const regMemA = await request(app).post('/api/v1/auth/register').send({
      email: `member_a_${timestamp}@example.com`,
      password: 'SecurePassword123!',
      name: 'Member Alex',
      phone: '+8801722222222',
    });
    memberAToken = regMemA.body.data.token;
    memberAId = regMemA.body.data.user.id;

    // 3. Register Manager B
    const regManB = await request(app).post('/api/v1/auth/register').send({
      email: `manager_b_${timestamp}@example.com`,
      password: 'SecurePassword123!',
      name: 'Manager Bob',
      phone: '+8801733333333',
    });
    managerBToken = regManB.body.data.token;
    managerBId = regManB.body.data.user.id;

    // 4. Register Member B
    const regMemB = await request(app).post('/api/v1/auth/register').send({
      email: `member_b_${timestamp}@example.com`,
      password: 'SecurePassword123!',
      name: 'Member Brenda',
      phone: '+8801744444444',
    });
    memberBToken = regMemB.body.data.token;
    memberBId = regMemB.body.data.user.id;
  });

  describe('1. Mess Creation & Unique Join Code System', () => {
    it('Manager A should create Mess A and receive unique Join Code and MANAGER role', async () => {
      const res = await request(app)
        .post('/api/v1/messes')
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          name: `Alpha Horizon ${timestamp}`,
          currency: 'BDT',
          currencySymbol: '৳',
          area: 'Dhanmondi',
          city: 'Dhaka',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toBeDefined();
      expect(res.body.data.myRole).toBe('MANAGER');

      messAId = res.body.data.id;
      messACode = res.body.data.code;
      expect(messACode).toMatch(/^MM-[A-Z0-9]{6}$/);
    });

    it('Manager B should create Mess B with distinct Join Code', async () => {
      const res = await request(app)
        .post('/api/v1/messes')
        .set('Authorization', `Bearer ${managerBToken}`)
        .send({
          name: `Beta Paradise ${timestamp}`,
          currency: 'BDT',
          currencySymbol: '৳',
          area: 'Gulshan',
          city: 'Dhaka',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      messBId = res.body.data.id;
      messBCode = res.body.data.code;

      expect(messBCode).toBeDefined();
      expect(messBCode).not.toBe(messACode);
    });
  });

  describe('2. Join Mess via Join Code & Boundary Checks', () => {
    it('should reject invalid or non-existent join code with 404', async () => {
      const res = await request(app)
        .post('/api/v1/messes/join')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ joinCode: 'INVALID-CODE-999' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Member A should join Mess A using valid join code and receive MEMBER role', async () => {
      const res = await request(app)
        .post('/api/v1/messes/join')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ joinCode: messACode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mess.id).toBe(messAId);
      expect(res.body.data.membership.role).toBe('MEMBER');
      expect(res.body.data.membership.status).toBe('ACTIVE');
    });

    it('should prevent duplicate active membership in the same mess', async () => {
      const res = await request(app)
        .post('/api/v1/messes/join')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ joinCode: messACode });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already an active member');
    });

    it('Member B should join Mess B using Mess B join code', async () => {
      const res = await request(app)
        .post('/api/v1/messes/join')
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({ joinCode: messBCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mess.id).toBe(messBId);
      expect(res.body.data.membership.role).toBe('MEMBER');
    });
  });

  describe('3. Join Code Regeneration & Invalidation', () => {
    it('Member A must NOT be allowed to regenerate join code (requires MANAGER)', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/regenerate-code`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Manager A should regenerate Join Code and invalidate previous code', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/regenerate-code`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const newCode = res.body.data.code;
      expect(newCode).toBeDefined();
      expect(newCode).not.toBe(messACode);

      // Verify that old code fails to join
      const regOldUser = await request(app).post('/api/v1/auth/register').send({
        email: `late_joiner_${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        name: 'Late Joiner',
      });
      const lateToken = regOldUser.body.data.token;

      const failRes = await request(app)
        .post('/api/v1/messes/join')
        .set('Authorization', `Bearer ${lateToken}`)
        .send({ joinCode: messACode });

      expect(failRes.status).toBe(404);

      // Verify new code succeeds
      const successRes = await request(app)
        .post('/api/v1/messes/join')
        .set('Authorization', `Bearer ${lateToken}`)
        .send({ joinCode: newCode });

      expect(successRes.status).toBe(200);
      expect(successRes.body.data.mess.id).toBe(messAId);

      // Update messACode reference
      messACode = newCode;
    });
  });

  describe('4. Strict Data Isolation: Seed & Cross-Tenant Queries', () => {
    let expenseAId: string;
    let expenseBId: string;

    beforeAll(async () => {
      const memA = await prisma.messMember.findUnique({
        where: { messId_userId: { messId: messAId, userId: managerAId } },
      });
      const memB = await prisma.messMember.findUnique({
        where: { messId_userId: { messId: messBId, userId: managerBId } },
      });

      // Create expense in Mess A by Manager A
      const expA = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          payerMemberId: memA!.id,
          amount: 2500,
          category: 'CLEANING',
          description: 'Mess A Secret Cleaning Supplies',
          date: new Date().toISOString().split('T')[0],
          type: 'VARIABLE',
        });
      expenseAId = expA.body.data.id;

      // Create expense in Mess B by Manager B
      const expB = await request(app)
        .post(`/api/v1/messes/${messBId}/expenses`)
        .set('Authorization', `Bearer ${managerBToken}`)
        .send({
          payerMemberId: memB!.id,
          amount: 4200,
          category: 'MAINTENANCE',
          description: 'Mess B Ultra Maintenance Repair',
          date: new Date().toISOString().split('T')[0],
          type: 'FIXED',
        });
      expenseBId = expB.body.data.id;
    });

    it('Mess A members should see only Mess A expenses', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const descriptions = res.body.data.map((e: any) => e.description);
      expect(descriptions).toContain('Mess A Secret Cleaning Supplies');
      expect(descriptions).not.toContain('Mess B Ultra Maintenance Repair');
    });

    it('Mess B members should see only Mess B expenses', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messBId}/expenses`)
        .set('Authorization', `Bearer ${memberBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const descriptions = res.body.data.map((e: any) => e.description);
      expect(descriptions).toContain('Mess B Ultra Maintenance Repair');
      expect(descriptions).not.toContain('Mess A Secret Cleaning Supplies');
    });

    it('CROSS-TENANT ATTACK: Member A accessing Mess B members MUST be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messBId}/members`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('active membership');
    });

    it('CROSS-TENANT ATTACK: Member A accessing Mess B expenses MUST be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messBId}/expenses`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('CROSS-TENANT ATTACK: Member A accessing Mess B specific expense ID MUST be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messBId}/expenses/${expenseBId}`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('CROSS-TENANT ATTACK: Member B creating an expense in Mess A MUST be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${memberBToken}`)
        .send({
          amount: 1000,
          category: 'ATTACK',
          description: 'Intrusion Attempt',
          date: new Date().toISOString().split('T')[0],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('CROSS-TENANT ATTACK: Member A requesting Mess B financial report MUST be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messBId}/reports/monthly`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('CROSS-TENANT ATTACK: Member A requesting Mess B ledger statement MUST be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messBId}/ledger`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Role Enforcement: MANAGER vs MEMBER Capabilities', () => {
    it('Member A cannot update Mess A settings (requires MANAGER/SETTINGS_MANAGE)', async () => {
      const res = await request(app)
        .patch(`/api/v1/messes/${messAId}/settings`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          settings: { allowNegativeBalance: true },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Manager A can update Mess A settings successfully', async () => {
      const res = await request(app)
        .patch(`/api/v1/messes/${messAId}/settings`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          settings: { allowNegativeBalance: false, baseMealRate: 65 },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Member A cannot update Mess A profile (requires MANAGER)', async () => {
      const res = await request(app)
        .patch(`/api/v1/messes/${messAId}/profile`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          name: 'Hacked Mess Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
