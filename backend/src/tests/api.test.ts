import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { RbacService } from '../services/rbacService.js';
import { Express } from 'express';

describe('MessMate API v1 — Phase 1 Test Suite', () => {
  let app: Express;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = createApp();
  });

  describe('Health Check Endpoint', () => {
    it('GET /api/v1/health should return 200 with service details and db status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service).toBe('messmate-api');
      expect(res.body.data.version).toBe('1.0.0');
      expect(res.body.data.database).toBeDefined();
    });
  });

  describe('Authentication & Validation', () => {
    it('POST /api/v1/auth/register should fail on missing fields with 400', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toBeDefined();
    });

    it('POST /api/v1/auth/register should succeed with valid credentials', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const res = await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'SecurePassword123!',
        name: 'Test Member',
        phone: '+8801700000001',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Verify hash is not exposed
    });

    it('POST /api/v1/auth/login should authenticate valid user and return JWT', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@messmate.com',
        password: 'Password@123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@messmate.com');
    });

    it('POST /api/v1/auth/login should reject incorrect password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@messmate.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/auth/me should reject request without Bearer token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/auth/me should return current user profile with valid Bearer token', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@messmate.com',
        password: 'Password@123',
      });
      const token = loginRes.body.data.token;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe('admin@messmate.com');
    });
  });

  describe('RBAC Logic & Capabilities', () => {
    it('OWNER role should have all permissions including SETTINGS_MANAGE and AUDIT_VIEW', () => {
      const perms = RbacService.getPermissionsForRole('OWNER');
      expect(RbacService.hasPermission(perms, 'MESS_MANAGE')).toBe(true);
      expect(RbacService.hasPermission(perms, 'AUDIT_VIEW')).toBe(true);
      expect(RbacService.hasPermission(perms, 'EXPENSES_APPROVE')).toBe(true);
    });

    it('MEMBER role should NOT have MESS_MANAGE or AUDIT_VIEW', () => {
      const perms = RbacService.getPermissionsForRole('MEMBER');
      expect(RbacService.hasPermission(perms, 'MESS_MANAGE')).toBe(false);
      expect(RbacService.hasPermission(perms, 'AUDIT_VIEW')).toBe(false);
      expect(RbacService.hasPermission(perms, 'MEALS_VIEW')).toBe(true);
    });

    it('TREASURER role should have EXPENSES_APPROVE and SETTLEMENT_MANAGE', () => {
      const perms = RbacService.getPermissionsForRole('TREASURER');
      expect(RbacService.hasPermission(perms, 'EXPENSES_APPROVE')).toBe(true);
      expect(RbacService.hasPermission(perms, 'SETTLEMENT_MANAGE')).toBe(true);
      expect(RbacService.hasPermission(perms, 'AUDIT_VIEW')).toBe(false);
    });
  });

  describe('404 Not Found Handling', () => {
    it('GET /api/v1/nonexistent should return 404 formatted error', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
