import './env.js';
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/messmate?connect_timeout=1',
      },
    },
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

let isDbReachable: boolean | null = null;
let lastCheckTime = 0;

export async function isDatabaseOnline(): Promise<boolean> {
  if (process.env.DATABASE_OFFLINE === 'true') {
    return false;
  }
  const now = Date.now();
  // If already verified online, cache for 60 seconds to avoid repeating pings
  if (isDbReachable === true && now - lastCheckTime < 60000) {
    return true;
  }
  // If previously failed, retry after 5 seconds
  if (isDbReachable === false && now - lastCheckTime < 5000) {
    return false;
  }

  try {
    const checkPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB connection timeout')), 8000));
    await Promise.race([checkPromise, timeoutPromise]);
    isDbReachable = true;
  } catch (err) {
    // If it was already online, don't immediately drop to mock data on a single slow ping
    if (isDbReachable === true) {
      console.warn('Transient DB ping timeout, retaining connected state');
    } else {
      isDbReachable = false;
    }
  }

  lastCheckTime = now;
  return isDbReachable ?? false;
}

export async function checkDatabaseHealth(): Promise<{ isConnected: boolean; message: string }> {
  const online = await isDatabaseOnline();
  if (online) {
    return { isConnected: true, message: 'Supabase PostgreSQL connection healthy' };
  }
  return { isConnected: false, message: "Database connection unreachable. Running with in-memory store." };
}
