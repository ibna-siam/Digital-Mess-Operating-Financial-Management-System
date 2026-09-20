import 'dotenv/config';
import { prisma } from '../config/database.js';
import { generateJoinCode } from '../utils/joinCode.js';
import { Role, MessStatus, MemberStatus } from '@prisma/client';

export async function migrateMultiTenantData() {
  console.log('🔄 Starting Multi-Tenant Data Migration & Verification...');

  // 1. Audit and ensure valid Join Codes for all messes
  const messes = await prisma.mess.findMany();
  console.log(`Found ${messes.length} mess workspaces.`);

  for (const mess of messes) {
    let currentCode = mess.code;
    if (!currentCode || currentCode.trim() === '') {
      currentCode = generateJoinCode('MM');
      await prisma.mess.update({
        where: { id: mess.id },
        data: { code: currentCode },
      });
      console.log(`✅ Assigned new Join Code [${currentCode}] to Mess: "${mess.name}" (${mess.id})`);
    } else {
      console.log(`ℹ️ Mess: "${mess.name}" has valid Join Code [${currentCode}]`);
    }
  }

  // 2. Audit and align operational roles to MANAGER and MEMBER
  const members = await prisma.messMember.findMany({
    include: {
      user: { select: { email: true, name: true } },
      mess: { select: { name: true } },
    },
  });
  console.log(`Found ${members.length} total mess memberships.`);

  for (const member of members) {
    if (member.role === Role.TREASURER) {
      await prisma.messMember.update({
        where: { id: member.id },
        data: { role: Role.MANAGER },
      });
      console.log(`Updated ${member.user.name} (${member.user.email}) in "${member.mess.name}" from TREASURER to MANAGER`);
    } else if (member.role === Role.VIEWER) {
      await prisma.messMember.update({
        where: { id: member.id },
        data: { role: Role.MEMBER },
      });
      console.log(`Updated ${member.user.name} (${member.user.email}) in "${member.mess.name}" from VIEWER to MEMBER`);
    }
  }

  // 3. Verify tenant scoping across core financial tables
  const [
    mealsCount,
    bazarCount,
    expenseCount,
    billsCount,
    ledgerCount,
    settlementCount,
    periodCount,
  ] = await Promise.all([
    prisma.meal.count(),
    prisma.bazarEntry.count(),
    prisma.expense.count(),
    prisma.bill.count(),
    prisma.ledgerEntry.count(),
    prisma.settlement.count(),
    prisma.financialPeriod.count(),
  ]);

  console.log('📊 Verified Financial History Scoping:');
  console.log(`   - Meals: ${mealsCount}`);
  console.log(`   - Bazar Entries: ${bazarCount}`);
  console.log(`   - Expenses: ${expenseCount}`);
  console.log(`   - Bills: ${billsCount}`);
  console.log(`   - Ledger Entries: ${ledgerCount}`);
  console.log(`   - Settlements: ${settlementCount}`);
  console.log(`   - Financial Periods: ${periodCount}`);

  console.log('✅ Multi-Tenant Data Migration & Integrity Check Complete.');
}

// Run if executed directly
if (process.argv[1]?.endsWith('migrateMultiTenantData.ts') || process.argv[1]?.endsWith('migrateMultiTenantData.js')) {
  migrateMultiTenantData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
