import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { Express } from 'express';
import { BillService } from '../services/billService.js';
import { BillStatus, Role } from '@prisma/client';

describe('MessMate Phase 2 — Core Operations Test Suite', () => {
  let app: Express;
  let authToken: string;
  let messId: string;
  let activeMemberId: string;
  let invitedMemberId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();

    // Authenticate as demo admin/owner
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@messmate.com',
      password: 'Password@123',
    });
    authToken = loginRes.body.data.token;
    
    const messesRes = await request(app)
      .get('/api/v1/messes')
      .set('Authorization', `Bearer ${authToken}`);

    if (messesRes.body.data && messesRes.body.data.length > 0) {
      messId = messesRes.body.data[0].id;
    } else {
      const createMessRes = await request(app)
        .post('/api/v1/messes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Operations Test Mess',
          currency: 'BDT',
          currencySymbol: '৳',
        });
      messId = createMessRes.body.data.id;
    }
  });

  describe('1. Member Management Module', () => {
    it('GET /api/v1/messes/:messId/members should return member list', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messId}/members`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      activeMemberId = res.body.data[0].id;
    });

    it('POST /api/v1/messes/:messId/members/invite should add/invite a new member', async () => {
      const newEmail = `member_${Date.now()}@example.com`;
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/members/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Shakil Khan',
          email: newEmail,
          role: Role.MEMBER,
          roomNo: 'B-201',
          joinDate: '2026-09-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user?.name || res.body.data.name).toBe('Shakil Khan');
      expect(res.body.data.status).toBe('ACTIVE');
      invitedMemberId = res.body.data.id;
    });

    it('POST /api/v1/messes/:messId/members/:memberId/deactivate should mark member INACTIVE with leaveDate', async () => {
      const targetId = invitedMemberId || activeMemberId;
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/members/${targetId}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INACTIVE');
      expect(res.body.data.leaveDate).toBeDefined();
    });
  });

  describe('2. Meal Management Module', () => {
    it('GET /api/v1/messes/:messId/meals should list daily meals for date', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messId}/meals?date=2026-09-17`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/messes/:messId/meals should record/update meal counts', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/meals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: activeMemberId,
          date: '2026-09-17',
          breakfast: 1,
          lunch: 2,
          dinner: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lunch).toBe(2);
      expect(res.body.data.total).toBe(4);
    });

    it('POST /api/v1/messes/:messId/meals should reject negative meal count', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/meals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: activeMemberId,
          date: '2026-09-17',
          breakfast: -1,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/messes/:messId/meals/quick-self should support 1-tap self-entry', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/meals/quick-self`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2026-09-17',
          mealType: 'breakfast',
          count: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.breakfast).toBe(1);
    });

    it('GET /api/v1/messes/:messId/meals/summary should return daily breakdown and average', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messId}/meals/summary?date=2026-09-17`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalMealsToday).toBeDefined();
      expect(res.body.data.avgPerMember).toBeDefined();
    });
  });

  describe('3. Bazar Management Module', () => {
    it('GET /api/v1/messes/:messId/bazar should list bazar records', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messId}/bazar`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/messes/:messId/bazar should create entry with itemized list', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/bazar`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          buyerMemberId: activeMemberId,
          amount: 1500,
          date: '2026-09-17',
          description: 'Chicken and Rice',
          category: 'Food',
          paymentMethod: 'CASH',
          items: [
            { name: 'Chicken', quantity: 2, unit: 'kg', unitPrice: 250, totalAmount: 500 },
            { name: 'Rice', quantity: 10, unit: 'kg', unitPrice: 100, totalAmount: 1000 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(1500);
      expect(res.body.data.items.length).toBe(2);
    });

    it('POST /api/v1/messes/:messId/bazar should reject if item totals do not equal total amount', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/bazar`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          buyerMemberId: activeMemberId,
          amount: 2000,
          date: '2026-09-17',
          items: [{ name: 'Rice', totalAmount: 1500 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('must equal the total bazar amount');
    });
  });

  describe('4. Expense Management Module', () => {
    it('GET /api/v1/messes/:messId/expenses should return filtered list', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/messes/:messId/expenses should record expense with auto-approve for admin', async () => {
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payerMemberId: activeMemberId,
          amount: 1800,
          type: 'VARIABLE',
          category: 'Maintenance',
          description: 'Emergency plumbing repair',
          date: '2026-09-17',
          billingPeriod: '2026-09',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('POST /api/v1/messes/:messId/expenses/:id/approve should approve pending expense', async () => {
      const expRes = await request(app)
        .post(`/api/v1/messes/${messId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payerMemberId: activeMemberId,
          amount: 2500,
          type: 'VARIABLE',
          category: 'Maintenance',
          description: 'High Value Maintenance Purchase',
          date: '2026-09-17',
          billingPeriod: '2026-09',
        });

      const expenseId = expRes.body.data.id;
      const res = await request(app)
        .post(`/api/v1/messes/${messId}/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  describe('5. Fixed Bills Module', () => {
    it('GET /api/v1/messes/:messId/bills should return bill records', async () => {
      const res = await request(app)
        .get(`/api/v1/messes/${messId}/bills`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('BillService should derive status correctly based on due date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      expect(BillService.deriveStatus(futureDate, false)).toBe(BillStatus.UPCOMING);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      expect(BillService.deriveStatus(pastDate, false)).toBe(BillStatus.OVERDUE);

      expect(BillService.deriveStatus(pastDate, true)).toBe(BillStatus.PAID);
    });

    it('POST /api/v1/messes/:messId/bills/:id/pay should record bill payment', async () => {
      const billRes = await request(app)
        .post(`/api/v1/messes/${messId}/bills`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Internet Bill',
          category: 'Internet',
          amount: 800,
          billingPeriod: '2026-09',
          dueDate: '2026-09-25',
        });
      const billId = billRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/messes/${messId}/bills/${billId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paidByMemberId: activeMemberId,
          paymentMethod: 'BKASH',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(BillStatus.PAID);
      expect(res.body.data.paymentMethod).toBe('BKASH');
    });
  });

  describe('6. Operational Dashboard Integration', () => {
    it('GET /api/v1/dashboard/:messId should return operational summary and live counters', async () => {
      const res = await request(app)
        .get(`/api/v1/dashboard/${messId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.todayMeals).toBeDefined();
      expect(res.body.data.operationalSummary).toBeDefined();
      expect(res.body.data.kpis.totalMembers.value).toBeGreaterThan(0);
    });
  });
});

