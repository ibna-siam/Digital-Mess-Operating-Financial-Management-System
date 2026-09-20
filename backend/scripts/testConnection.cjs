const { PrismaClient } = require('@prisma/client');

const connectionUrl = 'postgresql://messmate_app.bzwnukbyezmrzpcykyih:MessMateSecure_2026_ProdPass!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=messmate&sslmode=require';

const prisma = new PrismaClient({
  datasources: { db: { url: connectionUrl } },
});

async function main() {
  console.log('Testing Prisma queries against Supabase messmate schema...');
  const users = await prisma.user.findMany();
  console.log('✅ Current users in Supabase messmate schema:', users.length);

  const messes = await prisma.mess.findMany();
  console.log('✅ Current messes in Supabase messmate schema:', messes.length);

  const periods = await prisma.financialPeriod.findMany();
  console.log('✅ Current periods in Supabase messmate schema:', periods.length);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Query error:', err);
  process.exit(1);
});
