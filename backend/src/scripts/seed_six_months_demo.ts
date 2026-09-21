import { PrismaClient, Role, MemberStatus, ExpenseType, ExpenseStatus, SplitMethod, PaymentStatus, PeriodStatus, SettlementPlanStatus, SettlementItemStatus, LedgerEntryType, LedgerDirection } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TARGET_MESS_ID = '4b0c678f-02ee-4df6-bdd8-87204d679cfe'; // Green View mess

interface DemoPerson {
  email: string;
  name: string;
  phone: string;
  role: Role;
  roomNo: string;
}

const PEOPLE: DemoPerson[] = [
  { email: 'siamibna29@gmail.com', name: 'Ibna Siam.', phone: '01841380687', role: Role.MANAGER, roomNo: '101' },
  { email: 'admin@messmate.com', name: 'MessMate Demo Admin', phone: '01700000000', role: Role.MANAGER, roomNo: '101' },
  { email: 'tanvir.hossain@greenview.app', name: 'Tanvir Hossain', phone: '01711000001', role: Role.MEMBER, roomNo: '102' },
  { email: 'rafiq.islam@greenview.app', name: 'Rafiqul Islam', phone: '01711000002', role: Role.MEMBER, roomNo: '102' },
  { email: 'shahadat.h@greenview.app', name: 'Shahadat Hossain', phone: '01711000003', role: Role.MEMBER, roomNo: '201' },
  { email: 'mahmud.hasan@greenview.app', name: 'Mahmudul Hasan', phone: '01711000004', role: Role.MEMBER, roomNo: '201' },
  { email: 'nazrul.kazi@greenview.app', name: 'Kazi Nazrul', phone: '01711000005', role: Role.MEMBER, roomNo: '202' },
  { email: 'ashraful.alam@greenview.app', name: 'Ashraful Alam', phone: '01711000006', role: Role.MEMBER, roomNo: '202' },
  { email: 'zubair.ahmed@greenview.app', name: 'Zubair Ahmed', phone: '01711000007', role: Role.MEMBER, roomNo: '301' },
  { email: 'kamrul.hasan@greenview.app', name: 'Kamrul Hasan', phone: '01711000008', role: Role.MEMBER, roomNo: '301' },
];

const ROOM_CONFIGS = [
  { roomNumber: '101', floor: '1st', capacity: 2, monthlyRent: 8000 },
  { roomNumber: '102', floor: '1st', capacity: 2, monthlyRent: 8000 },
  { roomNumber: '201', floor: '2nd', capacity: 2, monthlyRent: 8500 },
  { roomNumber: '202', floor: '2nd', capacity: 2, monthlyRent: 8500 },
  { roomNumber: '301', floor: '3rd', capacity: 2, monthlyRent: 9000 },
];

const MONTHS = [
  { year: 2026, month: 4, key: '2026-04', days: 30, isClosed: true },
  { year: 2026, month: 5, key: '2026-05', days: 31, isClosed: true },
  { year: 2026, month: 6, key: '2026-06', days: 30, isClosed: true },
  { year: 2026, month: 7, key: '2026-07', days: 31, isClosed: true },
  { year: 2026, month: 8, key: '2026-08', days: 31, isClosed: true },
  { year: 2026, month: 9, key: '2026-09', days: 21, isClosed: false }, // Current month up to Sept 21
];

// Typical grocery item sets for realistic bazar trips
const GROCERY_SETS = [
  [
    { name: 'Miniket Rice (25kg)', qty: 1, unit: 'bag', price: 1850 },
    { name: 'Broiler Chicken (3kg)', qty: 3, unit: 'kg', price: 630 },
    { name: 'Soybean Oil (5L)', qty: 1, unit: 'bottle', price: 850 },
    { name: 'Onions (5kg)', qty: 5, unit: 'kg', price: 350 },
    { name: 'Potatoes (5kg)', qty: 5, unit: 'kg', price: 250 },
  ],
  [
    { name: 'Beef (3kg)', qty: 3, unit: 'kg', price: 2250 },
    { name: 'Farm Eggs (2 crate)', qty: 60, unit: 'pcs', price: 720 },
    { name: 'Red Lentils / Masur Dal', qty: 2, unit: 'kg', price: 260 },
    { name: 'Green Chili & Coriander', qty: 1, unit: 'pack', price: 120 },
    { name: 'Ginger & Garlic Paste', qty: 1, unit: 'kg', price: 240 },
  ],
  [
    { name: 'Rui / Katla Fish (4kg)', qty: 4, unit: 'kg', price: 1400 },
    { name: 'Mustard Oil (1L)', qty: 1, unit: 'bottle', price: 280 },
    { name: 'Mixed Vegetables (Eggplant, Papaya, Pointed Gourd)', qty: 6, unit: 'kg', price: 360 },
    { name: 'Turmeric & Chili Powder', qty: 1, unit: 'pack', price: 180 },
    { name: 'Salt & Sugar', qty: 3, unit: 'kg', price: 190 },
  ],
  [
    { name: 'Sonali Chicken (4kg)', qty: 4, unit: 'kg', price: 1280 },
    { name: 'Pangash / Tilapia Fish', qty: 3, unit: 'kg', price: 660 },
    { name: 'Lentils (Moong Dal)', qty: 1.5, unit: 'kg', price: 210 },
    { name: 'Tomatoes & Cucumbers', qty: 4, unit: 'kg', price: 220 },
  ],
];

async function main() {
  console.log('🚀 [SEED] Starting 6-month comprehensive demo data creation for 10 members...');

  // 1. Verify target mess
  const mess = await prisma.mess.findUnique({ where: { id: TARGET_MESS_ID } });
  if (!mess) {
    throw new Error(`Target mess ${TARGET_MESS_ID} not found!`);
  }
  console.log(`🏠 [1/7] Target Mess: ${mess.name} (${mess.code})`);

  // 2. Setup Rooms
  const roomMap = new Map<string, string>();
  for (const r of ROOM_CONFIGS) {
    const room = await prisma.room.upsert({
      where: { messId_roomNumber: { messId: TARGET_MESS_ID, roomNumber: r.roomNumber } },
      update: { floor: r.floor, capacity: r.capacity, monthlyRent: r.monthlyRent },
      create: { messId: TARGET_MESS_ID, roomNumber: r.roomNumber, floor: r.floor, capacity: r.capacity, monthlyRent: r.monthlyRent },
    });
    roomMap.set(r.roomNumber, room.id);
  }
  console.log(`🚪 [2/7] Rooms configured: ${roomMap.size} rooms.`);

  // 3. Upsert 10 Users and MessMembers
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
  const memberList: { id: string; userId: string; name: string; email: string; role: Role }[] = [];

  for (const p of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.name, phone: p.phone, isActive: true },
      create: {
        email: p.email,
        name: p.name,
        phone: p.phone,
        passwordHash: defaultPasswordHash,
        isActive: true,
      },
    });

    const roomId = roomMap.get(p.roomNo);
    const member = await prisma.messMember.upsert({
      where: { messId_userId: { messId: TARGET_MESS_ID, userId: user.id } },
      update: { role: p.role, roomNo: p.roomNo, roomId, status: MemberStatus.ACTIVE },
      create: {
        messId: TARGET_MESS_ID,
        userId: user.id,
        role: p.role,
        roomNo: p.roomNo,
        roomId,
        status: MemberStatus.ACTIVE,
        joinDate: new Date('2026-04-01T00:00:00.000Z'),
      },
    });

    memberList.push({ id: member.id, userId: user.id, name: p.name, email: p.email, role: p.role });
  }
  console.log(`👥 [3/7] Verified 10 members in ${mess.name}:`);
  memberList.forEach((m, idx) => console.log(`   ${idx + 1}. ${m.name} (${m.role}) - ${m.email}`));

  // 4. Clean existing transactional data for Green View mess to ensure clean historical consistency
  console.log('🧹 [4/7] Resetting previous transactional test records for current mess...');
  await prisma.settlementPayment.deleteMany({ where: { payer: { messId: TARGET_MESS_ID } } });
  await prisma.settlementItem.deleteMany({ where: { plan: { messId: TARGET_MESS_ID } } });
  await prisma.settlementPlan.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.settlement.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.ledgerEntry.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.expenseAllocation.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.expense.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.bazarItem.deleteMany({ where: { bazarEntry: { messId: TARGET_MESS_ID } } });
  await prisma.bazarEntry.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.meal.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.advanceDeposit.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.financialSnapshot.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.periodEvent.deleteMany({ where: { messId: TARGET_MESS_ID } });
  await prisma.financialPeriod.deleteMany({ where: { messId: TARGET_MESS_ID } });

  // 5. Seed Month-By-Month Data
  console.log('📅 [5/7] Seeding 6 months of historical operations (April - September 2026)...');

  for (let mIdx = 0; mIdx < MONTHS.length; mIdx++) {
    const mInfo = MONTHS[mIdx];
    const monthStr = String(mInfo.month).padStart(2, '0');
    const startDate = new Date(`${mInfo.year}-${monthStr}-01T00:00:00.000Z`);
    const endDate = new Date(`${mInfo.year}-${monthStr}-${String(mInfo.days).padStart(2, '0')}T23:59:59.999Z`);

    console.log(`\n--- 📆 Generating Period: ${mInfo.key} (${mInfo.isClosed ? 'CLOSED' : 'ACTIVE'}) ---`);

    // A. Financial Period
    const period = await prisma.financialPeriod.create({
      data: {
        messId: TARGET_MESS_ID,
        year: mInfo.year,
        month: mInfo.month,
        periodKey: mInfo.key,
        startDate,
        endDate,
        status: mInfo.isClosed ? PeriodStatus.CLOSED : PeriodStatus.ACTIVE,
        openedAt: startDate,
        finalizedAt: mInfo.isClosed ? endDate : null,
        closedAt: mInfo.isClosed ? endDate : null,
      },
    });

    // B. Advance Deposits (Day 1 - 3)
    const depositPerMember = 4000;
    let totalMonthAdvances = 0;
    const memberAdvances = new Map<string, number>();

    for (let pIdx = 0; pIdx < memberList.length; pIdx++) {
      const mem = memberList[pIdx];
      // slight variation (3800 - 4500)
      const amt = depositPerMember + (pIdx % 3 === 0 ? 500 : pIdx % 3 === 1 ? 0 : -200);
      const depDate = new Date(`${mInfo.year}-${monthStr}-0${(pIdx % 3) + 1}T10:00:00.000Z`);
      const methods = ['BKASH', 'NAGAD', 'CASH', 'BANK'];
      const method = methods[pIdx % methods.length];

      await prisma.advanceDeposit.create({
        data: {
          messId: TARGET_MESS_ID,
          memberId: mem.id,
          amount: amt,
          paymentMethod: method,
          reference: `TRX-${mInfo.key}-${pIdx + 1}829`,
          billingPeriod: mInfo.key,
          date: depDate,
          status: PaymentStatus.CONFIRMED,
          notes: `Monthly advance deposit for ${mInfo.key}`,
        },
      });

      await prisma.ledgerEntry.create({
        data: {
          messId: TARGET_MESS_ID,
          memberId: mem.id,
          entryType: LedgerEntryType.ADVANCE_DEPOSIT,
          direction: LedgerDirection.CREDIT,
          amount: amt,
          balanceAfter: amt,
          referenceType: 'ADVANCE',
          description: `Advance Deposit received via ${method} for ${mInfo.key}`,
          effectiveDate: depDate,
        },
      });

      totalMonthAdvances += amt;
      memberAdvances.set(mem.id, amt);
    }
    console.log(`   💰 Advance deposits recorded: ৳ ${totalMonthAdvances.toLocaleString()}`);

    // C. Daily Meals
    let totalMonthMeals = 0;
    const memberMealCounts = new Map<string, number>();
    memberList.forEach((m) => memberMealCounts.set(m.id, 0));

    const mealsToCreate: any[] = [];
    for (let day = 1; day <= mInfo.days; day++) {
      const dayStr = String(day).padStart(2, '0');
      const mealDate = new Date(`${mInfo.year}-${monthStr}-${dayStr}T00:00:00.000Z`);
      const dayOfWeek = mealDate.getUTCDay(); // 5 = Friday, 6 = Saturday (weekend in Bangladesh)
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

      for (let pIdx = 0; pIdx < memberList.length; pIdx++) {
        const mem = memberList[pIdx];

        // Realistic pattern:
        // Breakfast: 1 most days, 0 occasionally
        // Lunch: 1 on weekends, 0 or 1 on office days
        // Dinner: 1 almost always
        const b = (day + pIdx) % 7 === 0 ? 0 : 1;
        const l = isWeekend ? 1 : (day + pIdx) % 3 === 0 ? 0 : 1;
        const d = 1;
        const guestL = isWeekend && pIdx === 0 && day === 12 ? 1 : 0;
        const guestD = isWeekend && pIdx === 2 && day === 19 ? 2 : 0;

        const dayTotal = b + l + d + guestL + guestD;
        memberMealCounts.set(mem.id, (memberMealCounts.get(mem.id) || 0) + dayTotal);
        totalMonthMeals += dayTotal;

        mealsToCreate.push({
          messId: TARGET_MESS_ID,
          memberId: mem.id,
          date: mealDate,
          breakfast: b,
          lunch: l,
          dinner: d,
          guestBreakfast: 0,
          guestLunch: guestL,
          guestDinner: guestD,
        });
      }
    }

    // Chunk insert meals
    for (let i = 0; i < mealsToCreate.length; i += 100) {
      await prisma.meal.createMany({ data: mealsToCreate.slice(i, i + 100) });
    }
    console.log(`   🍽️ Daily meals generated: ${totalMonthMeals} total meals.`);

    // D. Bazar Entries (~8 trips per month)
    let totalMonthFoodCost = 0;
    const bazarDays = [2, 6, 10, 14, 18, 22, 26, 29].filter((d) => d <= mInfo.days);

    for (let bIdx = 0; bIdx < bazarDays.length; bIdx++) {
      const bDay = bazarDays[bIdx];
      const buyerMem = memberList[bIdx % memberList.length];
      const grocerySet = GROCERY_SETS[bIdx % GROCERY_SETS.length];
      const tripDate = new Date(`${mInfo.year}-${monthStr}-${String(bDay).padStart(2, '0')}T07:30:00.000Z`);

      const tripTotal = grocerySet.reduce((sum, item) => sum + item.price, 0);
      totalMonthFoodCost += tripTotal;

      const bazar = await prisma.bazarEntry.create({
        data: {
          messId: TARGET_MESS_ID,
          buyerMemberId: buyerMem.id,
          amount: tripTotal,
          date: tripDate,
          description: `Bazaar trip on ${mInfo.key}-${bDay} by ${buyerMem.name}`,
          itemsSummary: grocerySet.map((g) => g.name).join(', '),
          paymentMethod: 'CASH',
        },
      });

      for (const item of grocerySet) {
        await prisma.bazarItem.create({
          data: {
            bazarEntryId: bazar.id,
            name: item.name,
            quantity: item.qty,
            unit: item.unit,
            unitPrice: item.price / item.qty,
            totalAmount: item.price,
          },
        });
      }

      await prisma.ledgerEntry.create({
        data: {
          messId: TARGET_MESS_ID,
          memberId: buyerMem.id,
          entryType: LedgerEntryType.BAZAR_CONTRIBUTION,
          direction: LedgerDirection.CREDIT,
          amount: tripTotal,
          balanceAfter: tripTotal,
          referenceType: 'BAZAR',
          referenceId: bazar.id,
          description: `Bazaar purchase contribution (${tripTotal} BDT)`,
          effectiveDate: tripDate,
        },
      });
    }
    console.log(`   🛒 Bazar trips created: ৳ ${totalMonthFoodCost.toLocaleString()} total food cost.`);

    // E. Shared Utilities & Fixed Expenses
    const managerMem = memberList[0];
    const fixedExpenses = [
      { name: 'Maid & Cook Monthly Salary', cat: 'COOK_SALARY', amt: 4500, day: 5 },
      { name: `Electricity Bill (${mInfo.key})`, cat: 'ELECTRICITY', amt: 2600 + (mIdx * 120), day: 10 },
      { name: 'Fiber Internet WiFi (100 Mbps)', cat: 'INTERNET', amt: 1000, day: 7 },
      { name: 'LP Gas Cylinder Refill', cat: 'GAS', amt: 1350, day: 15 },
      { name: 'Waste Disposal & Cleaning Supplies', cat: 'CLEANING', amt: 500, day: 20 },
    ].filter((e) => e.day <= mInfo.days);

    let totalMonthFixedExpenses = 0;
    for (const exp of fixedExpenses) {
      totalMonthFixedExpenses += exp.amt;
      const expDate = new Date(`${mInfo.year}-${monthStr}-${String(exp.day).padStart(2, '0')}T12:00:00.000Z`);

      const createdExp = await prisma.expense.create({
        data: {
          messId: TARGET_MESS_ID,
          payerMemberId: managerMem.id,
          amount: exp.amt,
          type: ExpenseType.FIXED,
          category: exp.cat,
          date: expDate,
          description: exp.name,
          billingPeriod: mInfo.key,
          status: ExpenseStatus.APPROVED,
          splitMethod: SplitMethod.EQUAL,
        },
      });

      // Split equally across all 10 members
      const perMemberShare = Math.round((exp.amt / memberList.length) * 100) / 100;
      for (const mem of memberList) {
        await prisma.expenseAllocation.create({
          data: {
            messId: TARGET_MESS_ID,
            expenseId: createdExp.id,
            memberId: mem.id,
            amount: perMemberShare,
            splitMethod: SplitMethod.EQUAL,
          },
        });
      }
    }
    console.log(`   ⚡ Shared utility expenses: ৳ ${totalMonthFixedExpenses.toLocaleString()}`);

    // Meal Rate calculation
    const mealRate = totalMonthMeals > 0 ? Number((totalMonthFoodCost / totalMonthMeals).toFixed(4)) : 50.0;
    console.log(`   📊 Calculated Meal Rate: ৳ ${mealRate.toFixed(2)} / meal`);

    // Debit food and shared utility consumption to each member
    for (const mem of memberList) {
      const mCount = memberMealCounts.get(mem.id) || 0;
      const foodCost = Math.round(mCount * mealRate * 100) / 100;
      const utilityShare = Math.round((totalMonthFixedExpenses / memberList.length) * 100) / 100;

      await prisma.ledgerEntry.create({
        data: {
          messId: TARGET_MESS_ID,
          memberId: mem.id,
          entryType: LedgerEntryType.FOOD_SHARE,
          direction: LedgerDirection.DEBIT,
          amount: foodCost,
          balanceAfter: 0,
          referenceType: 'MEAL_PERIOD',
          description: `Food share for ${mCount} meals @ ৳${mealRate.toFixed(2)}`,
          effectiveDate: endDate,
        },
      });

      await prisma.ledgerEntry.create({
        data: {
          messId: TARGET_MESS_ID,
          memberId: mem.id,
          entryType: LedgerEntryType.UTILITY_SHARE,
          direction: LedgerDirection.DEBIT,
          amount: utilityShare,
          balanceAfter: 0,
          referenceType: 'EXPENSE',
          description: `Shared utilities & maid fee for ${mInfo.key}`,
          effectiveDate: endDate,
        },
      });
    }

    // F. Finalize and Settle for Closed Months (April - August)
    if (mInfo.isClosed) {
      const totalExpenses = totalMonthFoodCost + totalMonthFixedExpenses;

      // Create Snapshot
      await prisma.financialSnapshot.create({
        data: {
          periodId: period.id,
          messId: TARGET_MESS_ID,
          totalMeals: totalMonthMeals,
          totalFoodCost: totalMonthFoodCost,
          mealRate: mealRate,
          totalFixedExpenses: totalMonthFixedExpenses,
          totalVariableExpenses: totalMonthFoodCost,
          totalExpenses: totalExpenses,
          totalContributions: totalMonthAdvances,
          totalAdvances: totalMonthAdvances,
          totalPayments: totalMonthAdvances,
          outstandingBalance: 0,
          isReconciled: true,
          memberBalancesJson: memberList.map((m) => {
            const adv = memberAdvances.get(m.id) || 0;
            const meals = memberMealCounts.get(m.id) || 0;
            const food = Math.round(meals * mealRate * 100) / 100;
            const shared = Math.round((totalMonthFixedExpenses / memberList.length) * 100) / 100;
            const net = adv - (food + shared);
            return {
              memberId: m.id,
              name: m.name,
              advance: adv,
              meals,
              foodCost: food,
              sharedCost: shared,
              netBalance: net,
            };
          }),
          settlementSummaryJson: { status: 'FULLY_SETTLED', settledAt: endDate.toISOString() },
          expenseBreakdownJson: { food: totalMonthFoodCost, fixed: totalMonthFixedExpenses },
        },
      });

      // Create Settlement Plan
      const plan = await prisma.settlementPlan.create({
        data: {
          messId: TARGET_MESS_ID,
          billingPeriod: mInfo.key,
          totalDebtPool: 2400,
          status: SettlementPlanStatus.SETTLED,
          notes: `Monthly settlement finalized and cleared for ${mInfo.key}`,
        },
      });

      // Sample settlement items between members who owed small amounts and manager
      const item = await prisma.settlementItem.create({
        data: {
          planId: plan.id,
          payerMemberId: memberList[2].id,
          receiverMemberId: managerMem.id,
          amount: 650,
          settledAmount: 650,
          status: SettlementItemStatus.PAID,
          notes: `Settled net balance difference for ${mInfo.key}`,
        },
      });

      await prisma.settlementPayment.create({
        data: {
          settlementItemId: item.id,
          payerMemberId: memberList[2].id,
          receiverMemberId: managerMem.id,
          amount: 650,
          paymentMethod: 'BKASH',
          status: PaymentStatus.CONFIRMED,
          paidAt: endDate,
          confirmedAt: endDate,
        },
      });

      console.log(`   ✅ Financial Snapshot & Settlement Plan saved as CLOSED.`);
    }
  }

  // 6. Announcements
  console.log('\n📢 [6/7] Creating authentic mess announcements...');
  await prisma.announcement.createMany({
    data: [
      {
        messId: TARGET_MESS_ID,
        createdById: memberList[0].id,
        title: 'Welcome to Green View Mess!',
        message: 'All 10 members are now registered on MessMate. Please log your daily meal preferences before 9:00 PM.',
        priority: 'NORMAL',
        audience: 'ALL_MEMBERS',
      },
      {
        messId: TARGET_MESS_ID,
        createdById: memberList[0].id,
        title: 'Monthly Mess Meeting & September Planning',
        message: 'Monthly meeting will be held this Friday after dinner in Room 101 to review grocery budgets.',
        priority: 'HIGH',
        audience: 'ALL_MEMBERS',
      },
      {
        messId: TARGET_MESS_ID,
        createdById: memberList[1].id,
        title: 'High-Speed Fiber WiFi Upgraded',
        message: 'WiFi bandwidth has been upgraded to 100 Mbps optical fiber. Please collect the new password from the manager.',
        priority: 'NORMAL',
        audience: 'ALL_MEMBERS',
      },
    ],
  });

  // 7. Verification Summary
  const [totalMeals, totalBazar, totalExpenses, totalDeposits, totalPeriods] = await Promise.all([
    prisma.meal.count({ where: { messId: TARGET_MESS_ID } }),
    prisma.bazarEntry.count({ where: { messId: TARGET_MESS_ID } }),
    prisma.expense.count({ where: { messId: TARGET_MESS_ID } }),
    prisma.advanceDeposit.count({ where: { messId: TARGET_MESS_ID } }),
    prisma.financialPeriod.count({ where: { messId: TARGET_MESS_ID } }),
  ]);

  console.log('\n======================================================');
  console.log('🎉 [7/7] 6-MONTH DEMO SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log(`Mess:                Green View mess (${mess.code})`);
  console.log(`Total Members:       ${memberList.length} Active Residents`);
  console.log(`Total Rooms:         ${roomMap.size} Rooms (101, 102, 201, 202, 301)`);
  console.log(`Total Meals:         ${totalMeals.toLocaleString()} meal records`);
  console.log(`Total Bazar Trips:   ${totalBazar} grocery trips`);
  console.log(`Total Expenses:      ${totalExpenses} fixed & shared utility bills`);
  console.log(`Total Deposits:      ${totalDeposits} monthly advance deposits`);
  console.log(`Financial Periods:   ${totalPeriods} periods (April 2026 - September 2026)`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ [SEED ERROR]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
