import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { Express } from 'express';
import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';

describe('Phase 20 — Financial Entry Consolidation & Duplicate Prevention Suite', () => {
  let app: Express;
  let messAId: string;
  let messBId: string;
  let managerToken: string;
  let memberToken: string;
  let managerMemberId: string;
  let memberMemberId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Create Manager User
    const managerUser = await prisma.user.upsert({
      where: { email: 'phase20_manager@test.local' },
      update: { passwordHash },
      create: {
        email: 'phase20_manager@test.local',
        name: 'Phase20 Manager',
        passwordHash,
      },
    });

    // Create Member User
    const memberUser = await prisma.user.upsert({
      where: { email: 'phase20_member@test.local' },
      update: { passwordHash },
      create: {
        email: 'phase20_member@test.local',
        name: 'Phase20 Member',
        passwordHash,
      },
    });

    // Create Mess A
    const messA = await prisma.mess.create({
      data: {
        name: 'Phase 20 Test Mess A',
        code: `P20-A-${Date.now().toString().slice(-4)}`,
        currency: 'BDT',
        currencySymbol: '৳',
        createdById: managerUser.id,
        status: 'ACTIVE',
      },
    });
    messAId = messA.id;

    // Create Mess B (for tenant isolation test)
    const messB = await prisma.mess.create({
      data: {
        name: 'Phase 20 Test Mess B',
        code: `P20-B-${Date.now().toString().slice(-4)}`,
        currency: 'BDT',
        currencySymbol: '৳',
        createdById: managerUser.id,
        status: 'ACTIVE',
      },
    });
    messBId = messB.id;

    // Add Manager & Member to Mess A
    const mgrMember = await prisma.messMember.create({
      data: {
        messId: messAId,
        userId: managerUser.id,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });
    managerMemberId = mgrMember.id;

    const regMember = await prisma.messMember.create({
      data: {
        messId: messAId,
        userId: memberUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    memberMemberId = regMember.id;

    // Login Manager
    const mgrLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'phase20_manager@test.local',
      password: 'Password123!',
    });
    managerToken = mgrLogin.body.data.token;

    // Login Member
    const memLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'phase20_member@test.local',
      password: 'Password123!',
    });
    memberToken = memLogin.body.data.token;
  });

  afterAll(async () => {
    // Cleanup test messes
    for (const mId of [messAId, messBId]) {
      if (mId) {
        await prisma.expenseAllocation.deleteMany({ where: { messId: mId } });
        await prisma.expense.deleteMany({ where: { messId: mId } });
        await prisma.utilityAllocation.deleteMany({ where: { utilityBill: { messId: mId } } });
        await prisma.utilityBill.deleteMany({ where: { messId: mId } });
        await prisma.bill.deleteMany({ where: { messId: mId } });
        await prisma.messMember.deleteMany({ where: { messId: mId } });
        await prisma.mess.delete({ where: { id: mId } }).catch(() => {});
      }
    }
    await prisma.user.deleteMany({
      where: { email: { in: ['phase20_manager@test.local', 'phase20_member@test.local'] } },
    });
  });

  describe('1. Expense Category Boundaries & Duplicate Prevention', () => {
    it('should REJECT House Rent submitted as an Expense with 400 error', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          payerMemberId: managerMemberId,
          amount: 35000,
          category: 'House Rent',
          description: 'Monthly flat rent',
          date: '2026-09-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Bills & Utilities');
    });

    it('should REJECT Electricity submitted as an Expense with 400 error', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          payerMemberId: managerMemberId,
          amount: 4200,
          category: 'Electricity',
          description: 'Electric bill payment',
          date: '2026-09-05',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Bills & Utilities');
    });

    it('should REJECT Internet / WiFi submitted as an Expense with 400 error', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          payerMemberId: managerMemberId,
          amount: 1500,
          category: 'Internet / WiFi',
          description: 'Broadband optical fiber bill',
          date: '2026-09-05',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Bills & Utilities');
    });

    it('should REJECT Maid / Cook Salary submitted as an Expense with 400 error', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          payerMemberId: managerMemberId,
          amount: 5500,
          category: 'Maid / Cook Salary',
          description: 'Maid monthly salary',
          date: '2026-09-07',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Bills & Utilities');
    });

    it('should REJECT Food / Bazar submitted as an Expense with 400 error', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          payerMemberId: managerMemberId,
          amount: 2500,
          category: 'Food / Bazar',
          description: 'Grocery items',
          date: '2026-09-10',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Bazar');
    });

    it('should ACCEPT legitimate one-time miscellaneous Maintenance expense with 201', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          payerMemberId: managerMemberId,
          amount: 1400,
          category: 'Maintenance',
          description: 'Room 201 bathroom plumbing fix',
          date: '2026-09-12',
          billingPeriod: '2026-09',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Maintenance');
    });

    it('should ACCEPT legitimate one-time Cleaning Supplies expense with 201', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/expenses`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          payerMemberId: managerMemberId,
          amount: 850,
          category: 'Cleaning Supplies',
          description: 'Floor cleaner & toilet disinfectant',
          date: '2026-09-15',
          billingPeriod: '2026-09',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Cleaning Supplies');
    });
  });

  describe('2. Single Source-of-Truth in Bills & Utilities', () => {
    it('should create House Rent under Bills & Utilities successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/bills`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'September Apartment Rent',
          category: 'Rent',
          amount: 35000,
          billingPeriod: '2026-09',
          dueDate: '2026-09-10',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(35000);
    });

    it('should create Electricity with meter reading under Bills & Utilities', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messAId}/utilities`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'DESCO Electricity September',
          category: 'ELECTRICITY',
          amount: 3900,
          billingPeriod: '2026-09',
          dueDate: '2026-09-15',
          meterIdentifier: 'DESCO-MTR-8812',
          consumedUnits: 350,
          unitRate: 11.14,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('ELECTRICITY');
    });
  });

  describe('3. Multi-Mess Tenant Isolation', () => {
    it('should prevent Member of Mess A from accessing Mess B expenses', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messBId}/expenses`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });
});
