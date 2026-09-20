import { prisma } from '../config/database.js';

const GREEN_VIEW_MESS_ID = 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';
const OFFICIAL_EMAILS = [
  'admin@messmate.com',
  'rahim@messmate.com',
  'karim@messmate.com',
  'farhan@messmate.com',
  'shafiq@messmate.com',
  'tareq@messmate.com',
  'naimur@messmate.com',
  'arif@messmate.com',
  'mahmud@messmate.com',
  'zubair@messmate.com',
];

async function purgeOldTestData() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_PURGE !== 'true') {
    console.error('❌ FATAL: Destructive test purge is BLOCKED in PRODUCTION unless ALLOW_PRODUCTION_PURGE=true is explicitly set.');
    process.exit(1);
  }

  console.log('🚀 Starting permanent purge of old test and non-production data...');

  // 1. Identify non-GreenView messes
  const otherMesses = await prisma.mess.findMany({
    where: { id: { not: GREEN_VIEW_MESS_ID } },
    select: { id: true, name: true, code: true }
  });
  console.log(`Found ${otherMesses.length} test messes to purge:`, otherMesses.map(m => `${m.name} (${m.code})`));

  for (const mess of otherMesses) {
    const mId = mess.id;
    console.log(`Cleaning mess: ${mess.name} (${mId})...`);

    // Cascade delete dependent records
    await prisma.settlementPayment.deleteMany({ where: { settlementItem: { plan: { messId: mId } } } });
    await prisma.settlementItem.deleteMany({ where: { plan: { messId: mId } } });
    await prisma.settlementPlan.deleteMany({ where: { messId: mId } });
    await prisma.settlement.deleteMany({ where: { messId: mId } });
    await prisma.financialAdjustment.deleteMany({ where: { messId: mId } });
    await prisma.ledgerEntry.deleteMany({ where: { messId: mId } });
    await prisma.advanceDeposit.deleteMany({ where: { messId: mId } });
    await prisma.expenseAllocation.deleteMany({ where: { messId: mId } });
    await prisma.utilityAllocation.deleteMany({ where: { utilityBill: { messId: mId } } });
    await prisma.utilityBill.deleteMany({ where: { messId: mId } });
    await prisma.meterReading.deleteMany({ where: { messId: mId } });
    await prisma.recurringUtilityTemplate.deleteMany({ where: { messId: mId } });
    await prisma.bill.deleteMany({ where: { messId: mId } });
    await prisma.recurringBill.deleteMany({ where: { messId: mId } });
    await prisma.expense.deleteMany({ where: { messId: mId } });
    await prisma.bazarItem.deleteMany({ where: { bazarEntry: { messId: mId } } });
    await prisma.bazarEntry.deleteMany({ where: { messId: mId } });
    await prisma.meal.deleteMany({ where: { messId: mId } });
    await prisma.periodEvent.deleteMany({ where: { period: { messId: mId } } });
    await prisma.reopenRequest.deleteMany({ where: { messId: mId } });
    await prisma.financialSnapshot.deleteMany({ where: { messId: mId } });
    await prisma.financialPeriod.deleteMany({ where: { messId: mId } });
    await prisma.leaveRequest.deleteMany({ where: { messId: mId } });
    await prisma.memberHistory.deleteMany({ where: { messId: mId } });
    await prisma.announcement.deleteMany({ where: { messId: mId } });
    await prisma.document.deleteMany({ where: { messId: mId } });
    await prisma.invitation.deleteMany({ where: { messId: mId } });
    await prisma.messMember.deleteMany({ where: { messId: mId } });
    await prisma.room.deleteMany({ where: { messId: mId } });
    await prisma.auditLog.deleteMany({ where: { messId: mId } });
    await prisma.notification.deleteMany({ where: { messId: mId } });

    // Delete mess
    await prisma.mess.delete({ where: { id: mId } });
    console.log(`✅ Deleted mess: ${mess.name}`);
  }

  // 2. Identify test users to purge
  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        notIn: OFFICIAL_EMAILS
      }
    },
    select: { id: true, email: true, name: true }
  });
  console.log(`Found ${testUsers.length} test users to purge.`);

  for (const user of testUsers) {
    const uId = user.id;
    // Clean user-specific relations
    await prisma.notificationPreference.deleteMany({ where: { userId: uId } });
    await prisma.pushSubscription.deleteMany({ where: { userId: uId } });
    await prisma.offlineSyncAction.deleteMany({ where: { userId: uId } });
    await prisma.invitation.deleteMany({ where: { invitedById: uId } });
    await prisma.document.deleteMany({ where: { uploadedById: uId } });
    await prisma.auditLog.deleteMany({ where: { userId: uId } });
    await prisma.notification.deleteMany({ where: { userId: uId } });
    await prisma.messMember.deleteMany({ where: { userId: uId } });
    await prisma.mess.deleteMany({ where: { createdById: uId } });

    await prisma.user.delete({ where: { id: uId } });
    console.log(`   Deleted user: ${user.email}`);
  }

  // 3. Verify Database Integrity
  const remainingMesses = await prisma.mess.findMany({
    select: { id: true, name: true, code: true, status: true }
  });
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  const remainingPeriods = await prisma.financialPeriod.findMany({
    where: { messId: GREEN_VIEW_MESS_ID },
    select: { id: true, month: true, year: true, status: true }
  });
  const memberCount = await prisma.messMember.count({
    where: { messId: GREEN_VIEW_MESS_ID }
  });
  const mealCount = await prisma.meal.count({
    where: { messId: GREEN_VIEW_MESS_ID }
  });
  const bazarCount = await prisma.bazarEntry.count({
    where: { messId: GREEN_VIEW_MESS_ID }
  });
  const billCount = await prisma.bill.count({
    where: { messId: GREEN_VIEW_MESS_ID }
  });
  const ledgerCount = await prisma.ledgerEntry.count({
    where: { messId: GREEN_VIEW_MESS_ID }
  });

  console.log('\n================ DATABASE VERIFICATION SUMMARY ================');
  console.log(`Messes remaining (${remainingMesses.length}):`, remainingMesses);
  console.log(`Users remaining (${remainingUsers.length}):`, remainingUsers.map(u => u.email));
  console.log(`Green View Members: ${memberCount}`);
  console.log(`Green View Periods (${remainingPeriods.length}):`, remainingPeriods);
  console.log(`Green View Meals: ${mealCount}`);
  console.log(`Green View Bazar Entries: ${bazarCount}`);
  console.log(`Green View Bills: ${billCount}`);
  console.log(`Green View Ledger Entries: ${ledgerCount}`);
  console.log('=================================================================\n');

  await prisma.$disconnect();
}

purgeOldTestData().catch((err) => {
  console.error('❌ Error purging old test data:', err);
  process.exit(1);
});
