import { prisma } from '../config/database.js';

async function main() {
  const messId = 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';

  console.log('Audit logs total:', await prisma.auditLog.count());
  console.log('Notifications total:', await prisma.notification.count());
  console.log('Expenses in Green View:', await prisma.expense.count({ where: { messId } }));
  console.log('Recurring bills in Green View:', await prisma.recurringBill.count({ where: { messId } }));
  console.log('Advance deposits in Green View:', await prisma.advanceDeposit.count({ where: { messId } }));
  console.log('Settlements in Green View:', await prisma.settlement.count({ where: { messId } }));
  console.log('Settlement plans in Green View:', await prisma.settlementPlan.count({ where: { messId } }));
  console.log('Utility bills in Green View:', await prisma.utilityBill.count({ where: { messId } }));
  console.log('Documents in Green View:', await prisma.document.count({ where: { messId } }));

  // Check if any meal, bazar, or bill exists outside August and September 2026
  const earlyMeals = await prisma.meal.count({
    where: {
      messId,
      date: { lt: new Date('2026-08-01T00:00:00Z') }
    }
  });
  const lateMeals = await prisma.meal.count({
    where: {
      messId,
      date: { gte: new Date('2026-10-01T00:00:00Z') }
    }
  });
  console.log('Early meals (< Aug 2026):', earlyMeals);
  console.log('Late meals (>= Oct 2026):', lateMeals);

  const nonMessUsers = await prisma.user.findMany({
    where: {
      NOT: {
        email: { endsWith: '@messmate.com' }
      }
    },
    select: { id: true, email: true }
  });
  console.log('Non-MessMate users to delete:', nonMessUsers.length);

  await prisma.$disconnect();
}

main().catch(console.error);
