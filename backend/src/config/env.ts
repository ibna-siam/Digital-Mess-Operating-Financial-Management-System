import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(5000),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters')
      .default('default-super-secret-jwt-key-min-16-chars'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/messmate_db?schema=public'),
    DIRECT_URL: z.string().optional(),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return (
          data.JWT_SECRET !== 'default-super-secret-jwt-key-min-16-chars' &&
          data.JWT_SECRET.length >= 32
        );
      }
      return true;
    },
    {
      message:
        'In production, JWT_SECRET must not use the default placeholder and must be at least 32 characters long.',
      path: ['JWT_SECRET'],
    }
  );

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
