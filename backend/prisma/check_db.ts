import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function inspect() {
  // Purge test messes
  const testMesses = await prisma.mess.findMany({
    where: { code: { startsWith: 'PWATESTM' } },
  });
  for (const tm of testMesses) {
    await prisma.pushSubscription.deleteMany({ where: { user: { memberships: { some: { messId: tm.id } } } } });
    await prisma.notification.deleteMany({ where: { messId: tm.id } });
    await prisma.messMember.deleteMany({ where: { messId: tm.id } });
    await prisma.mess.delete({ where: { id: tm.id } });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: 'pwa_' } } });

  const messes = await prisma.mess.findMany();
  console.log('--- MESSES ---');
  for (const m of messes) {
    console.log(`ID: ${m.id} | Name: ${m.name} | Code: ${m.code}`);
  }

  const members = await prisma.messMember.findMany({
    include: { user: true, room: true },
  });
  console.log(`--- MEMBERS (${members.length}) ---`);
  for (const m of members) {
    console.log(`ID: ${m.id} | Name: ${m.user.name} | Email: ${m.user.email} | Role: ${m.role} | Room: ${m.roomNo || m.room?.roomNumber || 'None'}`);
  }

  const periods = await prisma.financialPeriod.findMany();
  console.log(`--- PERIODS (${periods.length}) ---`);
  for (const pr of periods) {
    console.log(`Key: ${pr.periodKey} | Status: ${pr.status} | Closed: ${pr.status === 'CLOSED'}`);
  }

  const meals = await prisma.meal.count();
  const bazars = await prisma.bazarEntry.count();
  const expenses = await prisma.expense.count();
  const bills = await prisma.bill.count();
  const utilityBills = await prisma.utilityBill.count();
  const ledgerEntries = await prisma.ledgerEntry.count();
  const settlements = await prisma.settlementPlan.count();
  const documents = await prisma.document.count();

  console.log('--- RECORD COUNTS ---');
  console.log(JSON.stringify({
    meals,
    bazars,
    expenses,
    bills,
    utilityBills,
    ledgerEntries,
    settlements,
    documents
  }, null, 2));
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
