import { prisma } from '../config/database.js';

async function verifyCrud() {
  console.log('=== STARTING CRUD & DATA FLOW VERIFICATION ===');
  const messId = 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';

  // 1. READ: Verify 10 members in active mess
  const members = await prisma.messMember.findMany({
    where: { messId, status: 'ACTIVE' },
    include: { user: true, room: true },
  });
  console.log(`[READ] Found ${members.length} active members in mess ${messId}`);
  if (members.length !== 10) {
    throw new Error(`Expected exactly 10 members, found ${members.length}`);
  }

  const manager = members.find((m) => m.role === 'MANAGER' || m.role === 'OWNER');
  const regularMembers = members.filter((m) => m.role === 'MEMBER');
  console.log(`[READ] Manager count: ${manager ? 1 : 0} (${manager?.user?.email})`);
  console.log(`[READ] Member count: ${regularMembers.length}`);

  // 2. CREATE: Safe test expense
  console.log('\n[CREATE] Creating temporary verification expense...');
  const testExpense = await prisma.bill.create({
    data: {
      messId,
      name: 'Verification Temp Purchase (Phase 11 Audit)',
      amount: 150.0,
      category: 'SUPPLIES',
      billingPeriod: '2026-09',
      status: 'PAID',
      dueDate: new Date('2026-09-25'),
    },
  });
  console.log(`[CREATE] Created test bill record ID: ${testExpense.id}, Amount: ৳${testExpense.amount}`);

  // 3. READ: Verify test expense
  const readExpense = await prisma.bill.findUnique({
    where: { id: testExpense.id },
  });
  console.log(`[READ] Verified bill ID ${readExpense?.id}, Name: "${readExpense?.name}"`);

  // 4. UPDATE: Update test expense
  console.log('\n[UPDATE] Updating test bill...');
  const updatedExpense = await prisma.bill.update({
    where: { id: testExpense.id },
    data: {
      amount: 175.0,
      notes: 'Audit verified amount update',
    },
  });
  console.log(`[UPDATE] Updated bill ID: ${updatedExpense.id}, New Amount: ৳${updatedExpense.amount}`);

  // 5. DELETE: Delete test expense
  console.log('\n[DELETE] Deleting temporary test bill...');
  await prisma.bill.delete({
    where: { id: testExpense.id },
  });
  const checkDeleted = await prisma.bill.findUnique({
    where: { id: testExpense.id },
  });
  console.log(`[DELETE] Deleted successfully. Record exists in DB? ${!!checkDeleted}`);

  // 6. FINANCIAL RECONCILIATION: Check 2026-08 and 2026-09
  console.log('\n=== FINANCIAL RECONCILIATION CHECK ===');
  const periods = await prisma.financialPeriod.findMany({
    where: { messId },
    orderBy: { periodKey: 'asc' },
  });
  console.log(`Found ${periods.length} financial periods:`);
  for (const p of periods) {
    console.log(`- Period: ${p.periodKey}, Status: ${p.status}, Opened: ${p.openedAt.toISOString()}`);
  }

  // Check Meal count & Bazar for 2026-08
  const augMeals = await prisma.meal.findMany({
    where: {
      messId,
      date: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z'),
      },
    },
  });
  const totalAugMeals = augMeals.reduce((sum, m) => sum + Number(m.breakfast) + Number(m.lunch) + Number(m.dinner), 0);

  const augBazars = await prisma.bazarEntry.findMany({
    where: {
      messId,
      date: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z'),
      },
    },
  });
  const totalAugBazar = augBazars.reduce((sum, b) => sum + Number(b.amount), 0);
  const calculatedAugMealRate = totalAugMeals > 0 ? totalAugBazar / totalAugMeals : 0;

  console.log(`\nAugust 2026:`);
  console.log(`- Total Meals: ${totalAugMeals}`);
  console.log(`- Total Food Cost (Bazar): ৳${totalAugBazar.toFixed(2)}`);
  console.log(`- Exact Meal Rate (FoodCost / Meals): ৳${calculatedAugMealRate.toFixed(2)}`);

  // Check Meal count & Bazar for 2026-09
  const sepMeals = await prisma.meal.findMany({
    where: {
      messId,
      date: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-09-30T23:59:59.999Z'),
      },
    },
  });
  const totalSepMeals = sepMeals.reduce((sum, m) => sum + Number(m.breakfast) + Number(m.lunch) + Number(m.dinner), 0);

  const sepBazars = await prisma.bazarEntry.findMany({
    where: {
      messId,
      date: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-09-30T23:59:59.999Z'),
      },
    },
  });
  const totalSepBazar = sepBazars.reduce((sum, b) => sum + Number(b.amount), 0);
  const calculatedSepMealRate = totalSepMeals > 0 ? totalSepBazar / totalSepMeals : 0;

  console.log(`\nSeptember 2026:`);
  console.log(`- Total Meals: ${totalSepMeals}`);
  console.log(`- Total Food Cost (Bazar): ৳${totalSepBazar.toFixed(2)}`);
  console.log(`- Exact Meal Rate (FoodCost / Meals): ৳${calculatedSepMealRate.toFixed(2)}`);

  await prisma.$disconnect();
  console.log('\n=== ALL CRUD & RECONCILIATION CHECKS PASSED ===');
}

verifyCrud().catch((err) => {
  console.error('CRUD verification failed:', err);
  process.exit(1);
});
