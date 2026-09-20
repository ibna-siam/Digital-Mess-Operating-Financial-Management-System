import { Router } from 'express';
import { z } from 'zod';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { validateRequest } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  onboarding: z
    .object({
      mode: z.enum(['CREATE', 'JOIN']),
      messName: z.string().optional(),
      city: z.string().optional(),
      area: z.string().optional(),
      address: z.string().optional(),
      currency: z.string().optional(),
      joinCode: z.string().optional(),
    })
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post('/register', authRateLimiter, validateRequest({ body: registerSchema }), register);
authRouter.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), login);
authRouter.post('/logout', logout);
authRouter.get('/me', authMiddleware, getMe);
