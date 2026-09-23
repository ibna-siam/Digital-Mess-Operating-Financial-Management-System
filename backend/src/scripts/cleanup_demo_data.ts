import { prisma } from '../config/database.js';
import { StorageService } from '../config/supabaseStorage.js';

export async function cleanupOldDemoData() {
  console.log('🧹 [CLEANUP] Starting cleanup of old demo dataset...');

  // 1. Identify target old demo messes
  const targetMesses = await prisma.mess.findMany({
    where: {
      OR: [
        { code: 'MM-329A5M' },
        { name: { contains: 'Green View', mode: 'insensitive' } },
        { code: { startsWith: 'MM-DEMO' } },
      ],
    },
    select: { id: true, name: true, code: true },
  });

  if (targetMesses.length === 0) {
    console.log('ℹ️ No old demo messes found matching target criteria.');
    return;
  }

  for (const mess of targetMesses) {
    console.log(`\n🗑️ Purging demo mess: "${mess.name}" [${mess.code}] (ID: ${mess.id})...`);

    // Clean documents from Supabase storage first
    try {
      const docs = await prisma.document.findMany({
        where: { messId: mess.id },
        select: { id: true, storagePath: true, storageBucket: true },
      });
      for (const doc of docs) {
        if (doc.storagePath && doc.storageBucket) {
          await StorageService.delete(doc.storageBucket, doc.storagePath).catch(() => {});
        }
      }
      console.log(`  - Checked and purged ${docs.length} storage documents`);
    } catch (err: any) {
      console.warn(`  - Storage doc cleanup note: ${err.message}`);
    }

    // Cascading deletion in proper relational order with extended timeout
    await prisma.$transaction(async (tx) => {
      // 1. Settlement items and payments
      await tx.settlementPayment.deleteMany({
        where: { settlementItem: { plan: { messId: mess.id } } },
      });
      await tx.settlementItem.deleteMany({ where: { plan: { messId: mess.id } } });
      await tx.settlementPlan.deleteMany({ where: { messId: mess.id } });
      await tx.settlement.deleteMany({ where: { messId: mess.id } });

      // 2. Ledger entries
      await tx.ledgerEntry.deleteMany({ where: { messId: mess.id } });

      // 3. Allocations
      await tx.utilityAllocation.deleteMany({ where: { utilityBill: { messId: mess.id } } });
      await tx.expenseAllocation.deleteMany({ where: { messId: mess.id } });

      // 4. Utility bills & Meter readings
      await tx.utilityBill.deleteMany({ where: { messId: mess.id } });
      await tx.meterReading.deleteMany({ where: { messId: mess.id } });
      await tx.recurringUtilityTemplate.deleteMany({ where: { messId: mess.id } });

      // 5. Bills & Recurring bills
      await tx.bill.deleteMany({ where: { messId: mess.id } });
      await tx.recurringBill.deleteMany({ where: { messId: mess.id } });

      // 6. Expenses
      await tx.expense.deleteMany({ where: { messId: mess.id } });

      // 7. Bazar
      await tx.bazarItem.deleteMany({ where: { bazarEntry: { messId: mess.id } } });
      await tx.bazarEntry.deleteMany({ where: { messId: mess.id } });

      // 8. Meals
      await tx.meal.deleteMany({ where: { messId: mess.id } });

      // 9. Advances / Deposits
      await tx.advanceDeposit.deleteMany({ where: { messId: mess.id } });

      // 10. Financial periods, snapshots & events
      await tx.financialSnapshot.deleteMany({ where: { period: { messId: mess.id } } });
      await tx.periodEvent.deleteMany({ where: { period: { messId: mess.id } } });
      await tx.reopenRequest.deleteMany({ where: { period: { messId: mess.id } } });
      await tx.financialAdjustment.deleteMany({ where: { messId: mess.id } });
      await tx.financialPeriod.deleteMany({ where: { messId: mess.id } });

      // 11. Documents, Announcements, Notifications, Audits
      await tx.document.deleteMany({ where: { messId: mess.id } });
      await tx.announcement.deleteMany({ where: { messId: mess.id } });
      await tx.notification.deleteMany({ where: { messId: mess.id } });
      await tx.auditLog.deleteMany({ where: { messId: mess.id } });
      await tx.leaveRequest.deleteMany({ where: { messId: mess.id } });
      await tx.memberHistory.deleteMany({ where: { messId: mess.id } });
      await tx.invitation.deleteMany({ where: { messId: mess.id } });

      // 12. Members & Rooms
      await tx.messMember.deleteMany({ where: { messId: mess.id } });
      await tx.room.deleteMany({ where: { messId: mess.id } });

      // 13. Finally, Mess itself
      await tx.mess.delete({ where: { id: mess.id } });
    }, { timeout: 45000, maxWait: 15000 });

    console.log(`  ✅ Successfully deleted mess "${mess.name}" and all associated records.`);
  }

  // Delete orphaned demo user accounts (synthetic accounts ending in @greenview.app or @padma.local)
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@greenview.app',
      },
    },
  });
  console.log(`🧹 Cleaned up ${deletedUsers.count} orphaned demo user accounts.`);

  console.log('🎉 [CLEANUP] Old demo dataset cleanup complete!');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cleanup_demo_data.ts')) {
  cleanupOldDemoData()
    .catch((e) => {
      console.error('❌ [CLEANUP ERROR]:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
