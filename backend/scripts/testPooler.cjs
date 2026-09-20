const { PrismaClient } = require('@prisma/client');

// Supabase connection pooler formats:
// 1. Transaction mode (port 6543, pgbouncer=true):
// postgresql://[user].[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?schema=messmate&pgbouncer=true
// 2. Session mode (port 5432):
// postgresql://[user].[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=messmate

async function testUrl(label, url) {
  console.log(`\nTesting ${label}...`);
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });
  try {
    const res = await prisma.$queryRaw`SELECT 1 as connected;`;
    console.log(`✅ ${label} succeeded!`, res);
    return true;
  } catch (err) {
    console.log(`❌ ${label} failed:`, err.message?.split('\n')[0]);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const poolerHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
  
  // Try messmate_app user on pooler
  await testUrl('Pooler Session (5432) messmate_app', `postgresql://messmate_app.bzwnukbyezmrzpcykyih:MessMateSecure_2026_ProdPass!@${poolerHost}:5432/postgres?schema=messmate&sslmode=require`);
  await testUrl('Pooler Transaction (6543) messmate_app', `postgresql://messmate_app.bzwnukbyezmrzpcykyih:MessMateSecure_2026_ProdPass!@${poolerHost}:6543/postgres?schema=messmate&sslmode=require&pgbouncer=true`);
}

main();
