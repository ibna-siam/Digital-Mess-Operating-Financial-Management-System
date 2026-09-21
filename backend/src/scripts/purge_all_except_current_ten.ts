import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KEEP_MESS_ID = '4b0c678f-02ee-4df6-bdd8-87204d679cfe'; // Green View mess

const KEEP_EMAILS = new Set([
  'siamibna29@gmail.com',
  'admin@messmate.com',
  'tanvir.hossain@greenview.app',
  'rafiq.islam@greenview.app',
  'shahadat.h@greenview.app',
  'mahmud.hasan@greenview.app',
  'nazrul.kazi@greenview.app',
  'ashraful.alam@greenview.app',
  'zubair.ahmed@greenview.app',
  'kamrul.hasan@greenview.app',
]);

async function main() {
  console.log('🧹 [PURGE] Starting cleanup of all data except Green View mess and its 10 members...');

  // 1. Identify other messes
  const otherMesses = await prisma.mess.findMany({
    where: { id: { not: KEEP_MESS_ID } },
    select: { id: true, name: true, code: true },
  });

  const otherMessIds = otherMesses.map((m) => m.id);
  console.log(`Found ${otherMessIds.length} other messes to delete:`, otherMesses.map((m) => `${m.name} [${m.code}]`));

  if (otherMessIds.length > 0) {
    console.log('Deleting dependent records of other messes...');
    await prisma.settlementPayment.deleteMany({ where: { payer: { messId: { in: otherMessIds } } } });
    await prisma.settlementItem.deleteMany({ where: { plan: { messId: { in: otherMessIds } } } });
    await prisma.settlementPlan.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.settlement.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.expenseAllocation.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.expense.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.bill.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.recurringBill.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.bazarItem.deleteMany({ where: { bazarEntry: { messId: { in: otherMessIds } } } });
    await prisma.bazarEntry.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.meal.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.advanceDeposit.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.financialAdjustment.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.financialSnapshot.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.periodEvent.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.reopenRequest.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.financialPeriod.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.utilityAllocation.deleteMany({ where: { utilityBill: { messId: { in: otherMessIds } } } });
    await prisma.utilityBill.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.meterReading.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.recurringUtilityTemplate.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.leaveRequest.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.memberHistory.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.announcement.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.document.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.notification.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.invitation.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.auditLog.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.messMember.deleteMany({ where: { messId: { in: otherMessIds } } });
    await prisma.room.deleteMany({ where: { messId: { in: otherMessIds } } });

    // Now delete the messes themselves
    const delMesses = await prisma.mess.deleteMany({ where: { id: { in: otherMessIds } } });
    console.log(`✅ Deleted ${delMesses.count} other messes.`);
  }

  // 2. Identify users to delete (anyone not in KEEP_EMAILS)
  const usersToDelete = await prisma.user.findMany({
    where: { email: { notIn: Array.from(KEEP_EMAILS) } },
    select: { id: true, email: true, name: true },
  });

  const userIdsToDelete = usersToDelete.map((u) => u.id);
  console.log(`Found ${userIdsToDelete.length} other users to delete:`, usersToDelete.map((u) => u.email));

  if (userIdsToDelete.length > 0) {
    // Delete any remaining user-specific records
    await prisma.pushSubscription.deleteMany({ where: { userId: { in: userIdsToDelete } } });
    await prisma.notificationPreference.deleteMany({ where: { userId: { in: userIdsToDelete } } });
    await prisma.offlineSyncAction.deleteMany({ where: { userId: { in: userIdsToDelete } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIdsToDelete } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIdsToDelete } } });
    await prisma.messMember.deleteMany({ where: { userId: { in: userIdsToDelete } } });

    const delUsers = await prisma.user.deleteMany({ where: { id: { in: userIdsToDelete } } });
    console.log(`✅ Deleted ${delUsers.count} other users.`);
  }

  // 3. Verification
  const remainingMesses = await prisma.mess.findMany({ select: { id: true, name: true, code: true } });
  const remainingUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  const remainingMembers = await prisma.messMember.findMany({ where: { messId: KEEP_MESS_ID } });

  console.log('\n======================================================');
  console.log('🎉 CLEANUP COMPLETED!');
  console.log('======================================================');
  console.log(`Remaining Messes (${remainingMesses.length}):`);
  remainingMesses.forEach((m) => console.log(`   - ${m.name} [${m.code}] (ID: ${m.id})`));
  console.log(`\nRemaining Users (${remainingUsers.length}):`);
  remainingUsers.forEach((u, i) => console.log(`   ${i + 1}. ${u.name} (${u.email})`));
  console.log(`\nActive Members in Green View Mess: ${remainingMembers.length}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ [PURGE ERROR]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
