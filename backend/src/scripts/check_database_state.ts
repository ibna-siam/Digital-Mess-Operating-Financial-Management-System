import { prisma } from '../config/database.js';

async function main() {
  const messes = await prisma.mess.findMany({
    include: {
      _count: {
        select: {
          members: true,
          financialPeriods: true,
          bazarEntries: true,
          bills: true,
          meals: true,
          ledgerEntries: true,
        }
      }
    }
  });
  console.log('Messes in DB:');
  console.log(JSON.stringify(messes, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      memberships: {
        select: {
          mess: { select: { name: true, code: true } },
          status: true,
          role: true,
        }
      }
    }
  });
  console.log(`Users in DB (${users.length}):`);
  console.log(JSON.stringify(users.map(u => ({
    email: u.email,
    name: u.name,
    memberships: u.memberships.map(m => ({ mess: m.mess.name, role: m.role, status: m.status }))
  })), null, 2));

  const periods = await prisma.financialPeriod.findMany({
    select: {
      id: true,
      messId: true,
      month: true,
      year: true,
      status: true,
      startDate: true,
      endDate: true,
    }
  });
  console.log('Periods in DB:');
  console.log(JSON.stringify(periods, null, 2));

  // Check other tables
  const auditLogs = await prisma.auditLog.count();
  const notifications = await prisma.notification.count();
  const settlements = await prisma.settlement.count();
  const advanceDeposits = await prisma.advanceDeposit.count();
  console.log('Counts:', { auditLogs, notifications, settlements, advanceDeposits });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
