import { prisma } from '../config/database.js';

async function auditDatabaseIntegrity() {
  console.log('====================================================');
  console.log('🔍 PHASE 15B: DATABASE INTEGRITY AUDIT');
  console.log('====================================================\n');

  let issuesFound = 0;

  // 1. Audit Messes
  const messes = await prisma.mess.findMany({
    include: {
      _count: {
        select: {
          members: true,
          financialPeriods: true,
          bazarEntries: true,
          bills: true,
          meals: true,
          expenses: true,
          ledgerEntries: true,
        },
      },
    },
  });
  console.log(`[1] Auditing Messes (${messes.length} total):`);
  for (const m of messes) {
    if (!m.code) {
      console.error(`❌ ERROR: Mess "${m.name}" (${m.id}) lacks a Join Code!`);
      issuesFound++;
    } else {
      console.log(`  ✓ Mess "${m.name}" | ID: ${m.id} | Code: ${m.code} | Members: ${m._count.members}`);
    }
  }

  // 2. Audit Duplicate Active Memberships
  console.log('\n[2] Auditing User Memberships for Duplicates:');
  const memberships = await prisma.messMember.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, messId: true, userId: true, role: true },
  });
  const userMessMap = new Map<string, string>();
  let duplicateMemberships = 0;
  for (const mem of memberships) {
    const key = `${mem.messId}:${mem.userId}`;
    if (userMessMap.has(key)) {
      console.error(`❌ ERROR: Duplicate active membership detected for User ${mem.userId} in Mess ${mem.messId}!`);
      issuesFound++;
      duplicateMemberships++;
    } else {
      userMessMap.set(key, mem.id);
    }
  }
  if (duplicateMemberships === 0) {
    console.log(`  ✓ All ${memberships.length} active memberships are unique (0 duplicates).`);
  }

  // 3. Audit Orphan Records
  console.log('\n[3] Auditing Orphan Records across Financial Tables:');
  const validMessIds = new Set(messes.map((m) => m.id));

  // Meals
  const meals = await prisma.meal.findMany({ select: { id: true, messId: true } });
  const orphanMeals = meals.filter((x) => !validMessIds.has(x.messId));
  console.log(`  - Meals: ${meals.length} total | Orphan: ${orphanMeals.length}`);
  if (orphanMeals.length > 0) issuesFound += orphanMeals.length;

  // Expenses
  const expenses = await prisma.expense.findMany({ select: { id: true, messId: true } });
  const orphanExpenses = expenses.filter((x) => !validMessIds.has(x.messId));
  console.log(`  - Expenses: ${expenses.length} total | Orphan: ${orphanExpenses.length}`);
  if (orphanExpenses.length > 0) issuesFound += orphanExpenses.length;

  // Bazar
  const bazar = await prisma.bazarEntry.findMany({ select: { id: true, messId: true } });
  const orphanBazar = bazar.filter((x) => !validMessIds.has(x.messId));
  console.log(`  - Bazar Entries: ${bazar.length} total | Orphan: ${orphanBazar.length}`);
  if (orphanBazar.length > 0) issuesFound += orphanBazar.length;

  // Fixed Bills
  const bills = await prisma.bill.findMany({ select: { id: true, messId: true } });
  const orphanBills = bills.filter((x) => !validMessIds.has(x.messId));
  console.log(`  - Fixed Bills: ${bills.length} total | Orphan: ${orphanBills.length}`);
  if (orphanBills.length > 0) issuesFound += orphanBills.length;

  // Ledger Entries
  const ledger = await prisma.ledgerEntry.findMany({ select: { id: true, messId: true, memberId: true } });
  const orphanLedger = ledger.filter((x) => !validMessIds.has(x.messId));
  console.log(`  - Ledger Entries: ${ledger.length} total | Orphan: ${orphanLedger.length}`);
  if (orphanLedger.length > 0) issuesFound += orphanLedger.length;

  // 4. Audit Operational Roles (Only MANAGER and MEMBER)
  console.log('\n[4] Auditing Member Roles Distribution:');
  const allMembers = await prisma.messMember.findMany({
    select: { id: true, role: true, mess: { select: { name: true } } },
  });
  const roleCounts: Record<string, number> = {};
  for (const m of allMembers) {
    roleCounts[m.role] = (roleCounts[m.role] || 0) + 1;
  }
  console.log('  Role distribution:', roleCounts);

  console.log('\n====================================================');
  if (issuesFound === 0) {
    console.log('✅ DATABASE INTEGRITY AUDIT: 100% PASSED (0 ERRORS)');
  } else {
    console.error(`❌ DATABASE INTEGRITY AUDIT: ${issuesFound} ISSUES FOUND`);
  }
  console.log('====================================================');
  process.exit(issuesFound === 0 ? 0 : 1);
}

auditDatabaseIntegrity().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
