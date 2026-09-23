import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';
import {
  Role,
  MemberStatus,
  ExpenseType,
  ExpenseStatus,
  SplitMethod,
  BillStatus,
  LedgerEntryType,
  LedgerDirection,
  SettlementPlanStatus,
  SettlementItemStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

export async function seedFiveMonthsDemo() {
  const startTime = Date.now();
  console.log('🚀 [SEED] Starting 5-month demo seeder for 10 members (May 2026 - Sept 2026)...');

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const testAdminPasswordHash = await bcrypt.hash('Password@123', 10);

  // 1. Prepare Manager User first
  const managerEmail = 'siamibna29@gmail.com';
  const managerUser = await prisma.user.upsert({
    where: { email: managerEmail },
    update: { name: 'Ibna Siam', passwordHash },
    create: {
      email: managerEmail,
      name: 'Ibna Siam',
      passwordHash,
      phone: '+8801711000001',
    },
  });

  // Prepare Mess
  const messCode = 'MM-PADMA5';
  let mess = await prisma.mess.findUnique({ where: { code: messCode } });
  if (mess) {
    console.log(`ℹ️ Existing mess "${mess.name}" [${mess.code}] found. Re-initializing...`);
  } else {
    mess = await prisma.mess.create({
      data: {
        name: 'Padma Student Residence',
        code: messCode,
        currency: 'BDT',
        currencySymbol: '৳',
        area: 'Dhanmondi, Road 8/A',
        city: 'Dhaka',
        description: 'Modern university & young professional shared residence mess',
        timezone: 'Asia/Dhaka',
        status: 'ACTIVE',
        createdById: managerUser.id,
      },
    });
    console.log(`🏠 [1/6] Created demo mess: ${mess.name} [${mess.code}] (ID: ${mess.id})`);
  }

  // Ensure test admin user exists for test suites
  await prisma.user.upsert({
    where: { email: 'admin@messmate.com' },
    update: { passwordHash: testAdminPasswordHash, name: 'MessMate Manager' },
    create: {
      email: 'admin@messmate.com',
      passwordHash: testAdminPasswordHash,
      name: 'MessMate Manager',
      phone: '+8801700000000',
    },
  });

  // 2. Setup 5 Rooms
  const roomDefs = [
    { roomNumber: '101', floor: '1', capacity: 2, monthlyRent: 7000 },
    { roomNumber: '102', floor: '1', capacity: 2, monthlyRent: 7000 },
    { roomNumber: '201', floor: '2', capacity: 2, monthlyRent: 7000 },
    { roomNumber: '202', floor: '2', capacity: 2, monthlyRent: 7000 },
    { roomNumber: '301', floor: '3', capacity: 2, monthlyRent: 7000 },
  ];

  const roomMap = new Map<string, string>(); // roomNumber -> roomId
  for (const r of roomDefs) {
    let room = await prisma.room.findFirst({ where: { messId: mess.id, roomNumber: r.roomNumber } });
    if (!room) {
      room = await prisma.room.create({
        data: {
          messId: mess.id,
          roomNumber: r.roomNumber,
          floor: r.floor,
          capacity: r.capacity,
          monthlyRent: new Prisma.Decimal(r.monthlyRent),
          isActive: true,
        },
      });
    }
    roomMap.set(r.roomNumber, room.id);
  }

  // 3. Setup Exactly 10 Members: 1 MANAGER + 9 MEMBERs (NO TREASURER)
  const memberSpecs = [
    { name: 'Ibna Siam', email: 'siamibna29@gmail.com', phone: '+8801711000001', role: Role.MANAGER, room: '101' },
    { name: 'Tanvir Ahmed', email: 'tanvir.ahmed@padma.local', phone: '+8801711000002', role: Role.MEMBER, room: '102' },
    { name: 'Rafiqul Islam', email: 'rafiqul.islam@padma.local', phone: '+8801711000003', role: Role.MEMBER, room: '102' },
    { name: 'Shahadat Hossain', email: 'shahadat.h@padma.local', phone: '+8801711000004', role: Role.MEMBER, room: '201' },
    { name: 'Mahmudul Hasan', email: 'mahmudul.hasan@padma.local', phone: '+8801711000005', role: Role.MEMBER, room: '201' },
    { name: 'Kazi Nazrul', email: 'kazi.nazrul@padma.local', phone: '+8801711000006', role: Role.MEMBER, room: '202' },
    { name: 'Ashraful Alam', email: 'ashraful.alam@padma.local', phone: '+8801711000007', role: Role.MEMBER, room: '202' },
    { name: 'Zubair Hossain', email: 'zubair.hossain@padma.local', phone: '+8801711000008', role: Role.MEMBER, room: '301' },
    { name: 'Kamrul Islam', email: 'kamrul.islam@padma.local', phone: '+8801711000009', role: Role.MEMBER, room: '301' },
    { name: 'Tariqul Bashar', email: 'tariqul.bashar@padma.local', phone: '+8801711000010', role: Role.MEMBER, room: '101' },
  ];

  const memberList: Array<{ id: string; userId: string; name: string; email: string; role: Role; roomId: string }> = [];

  for (const spec of memberSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: { name: spec.name, passwordHash, phone: spec.phone },
      create: {
        email: spec.email,
        name: spec.name,
        passwordHash,
        phone: spec.phone,
      },
    });

    const roomId = roomMap.get(spec.room)!;
    let membership = await prisma.messMember.findFirst({
      where: { messId: mess.id, userId: user.id },
    });

    if (!membership) {
      membership = await prisma.messMember.create({
        data: {
          messId: mess.id,
          userId: user.id,
          role: spec.role,
          status: MemberStatus.ACTIVE,
          roomId,
          roomNo: spec.room,
          joinDate: new Date('2026-04-01T00:00:00Z'),
        },
      });
    } else {
      membership = await prisma.messMember.update({
        where: { id: membership.id },
        data: {
          role: spec.role,
          status: MemberStatus.ACTIVE,
          roomId,
          roomNo: spec.room,
        },
      });
    }

    memberList.push({
      id: membership.id,
      userId: user.id,
      name: spec.name,
      email: spec.email,
      role: spec.role,
      roomId,
    });
  }

  console.log(`👥 [2/6] Setup 10 members (1 MANAGER + 9 MEMBERs) in ${mess.name}`);

  console.log('🧹 Clearing previous transactions for clean idempotency...');
  await prisma.settlementPayment.deleteMany({ where: { settlementItem: { plan: { messId: mess.id } } } });
  await prisma.settlementItem.deleteMany({ where: { plan: { messId: mess.id } } });
  await prisma.settlementPlan.deleteMany({ where: { messId: mess.id } });
  await prisma.ledgerEntry.deleteMany({ where: { messId: mess.id } });
  await prisma.utilityAllocation.deleteMany({ where: { utilityBill: { messId: mess.id } } });
  await prisma.expenseAllocation.deleteMany({ where: { messId: mess.id } });
  await prisma.utilityBill.deleteMany({ where: { messId: mess.id } });
  await prisma.bill.deleteMany({ where: { messId: mess.id } });
  await prisma.expense.deleteMany({ where: { messId: mess.id } });
  await prisma.bazarItem.deleteMany({ where: { bazarEntry: { messId: mess.id } } });
  await prisma.bazarEntry.deleteMany({ where: { messId: mess.id } });
  await prisma.meal.deleteMany({ where: { messId: mess.id } });
  await prisma.advanceDeposit.deleteMany({ where: { messId: mess.id } });
  await prisma.financialSnapshot.deleteMany({ where: { messId: mess.id } });
  await prisma.financialPeriod.deleteMany({ where: { messId: mess.id } });
  await prisma.announcement.deleteMany({ where: { messId: mess.id } });

  // 4. Months configuration: 5 months (May 2026 - Sept 2026)
  const monthsConfig = [
    { periodKey: '2026-05', year: 2026, month: 5, days: 31, isClosed: true,  elecUnits: 350, elecAmount: 3850, gasAmount: 1450, foodBazarCount: 8, baseFood: 18200 },
    { periodKey: '2026-06', year: 2026, month: 6, days: 30, isClosed: true,  elecUnits: 395, elecAmount: 4420, gasAmount: 1500, foodBazarCount: 9, baseFood: 21450 },
    { periodKey: '2026-07', year: 2026, month: 7, days: 31, isClosed: true,  elecUnits: 415, elecAmount: 4680, gasAmount: 2900, foodBazarCount: 9, baseFood: 23100 },
    { periodKey: '2026-08', year: 2026, month: 8, days: 31, isClosed: true,  elecUnits: 370, elecAmount: 4150, gasAmount: 1450, foodBazarCount: 8, baseFood: 19850 },
    { periodKey: '2026-09', year: 2026, month: 9, days: 23, isClosed: false, elecUnits: 350, elecAmount: 3900, gasAmount: 1500, foodBazarCount: 6, baseFood: 14600 },
  ];

  console.log('📅 [3/6] Generating 5 months of realistic accounting operations...');

  let totalMeals = 0;
  let totalBazar = 0;
  let totalExpenses = 0;
  let totalBills = 0;
  let totalDeposits = 0;

  for (const cfg of monthsConfig) {
    const { periodKey, year, month, days, isClosed, elecUnits, elecAmount, gasAmount, foodBazarCount, baseFood } = cfg;

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, days, 23, 59, 59));

    // A. Financial Period
    const period = await prisma.financialPeriod.upsert({
      where: { messId_periodKey: { messId: mess.id, periodKey } },
      update: { status: isClosed ? 'CLOSED' : 'ACTIVE', startDate, endDate },
      create: {
        messId: mess.id,
        periodKey,
        year,
        month,
        startDate,
        endDate,
        status: isClosed ? 'CLOSED' : 'ACTIVE',
        closedAt: isClosed ? new Date(Date.UTC(year, month - 1, days, 23, 59, 59)) : null,
      },
    });

    // B. Advance Deposits (৳6,000 – ৳7,500 per member per month)
    const depositRows = [];
    const depositAmounts: Record<string, number> = {};
    for (let i = 0; i < memberList.length; i++) {
      const mem = memberList[i];
      // Vary deposits realistically
      const depAmt = 6500 + ((i * 300) % 1500); // 6500, 6800, 7100, 7400, 6500...
      depositAmounts[mem.id] = depAmt;
      depositRows.push({
        messId: mess.id,
        memberId: mem.id,
        amount: new Prisma.Decimal(depAmt),
        billingPeriod: periodKey,
        date: new Date(Date.UTC(year, month - 1, 2 + (i % 3))),
        paymentMethod: i % 2 === 0 ? 'BKASH' : 'BANK',
        reference: `TRX-${periodKey.replace('-', '')}-${mem.name.substring(0, 3).toUpperCase()}${i}`,
        status: PaymentStatus.CONFIRMED,
        notes: `Monthly advance deposit for ${periodKey}`,
      });
      totalDeposits++;
    }
    await prisma.advanceDeposit.createMany({ data: depositRows });

    // C. Meals (Realistic daily attendance per member)
    const mealRows = [];
    const memberMealsCount: Record<string, number> = {};
    for (const mem of memberList) {
      memberMealsCount[mem.id] = 0;
    }

    for (let d = 1; d <= days; d++) {
      const mealDate = new Date(Date.UTC(year, month - 1, d));
      const dayOfWeek = mealDate.getUTCDay(); // 5 = Friday, 6 = Saturday

      for (let mIdx = 0; mIdx < memberList.length; mIdx++) {
        const mem = memberList[mIdx];
        // Weekday vs weekend patterns, occasional skip
        const skipDay = (d + mIdx) % 17 === 0;
        const b = skipDay ? 0 : 1;
        const l = skipDay ? 0 : (dayOfWeek === 5 ? 1 : (mIdx % 3 === 0 ? 0 : 1)); // Some have office lunch
        const dn = 1;
        const guest = (d === 15 && mIdx === 1) ? 2 : 0;

        const counted = b + l + dn + guest;
        memberMealsCount[mem.id] += counted;
        totalMeals++;

        mealRows.push({
          messId: mess.id,
          memberId: mem.id,
          date: mealDate,
          breakfast: b,
          lunch: l,
          dinner: dn,
          guestBreakfast: 0,
          guestLunch: guest > 0 ? 2 : 0,
          guestDinner: 0,
          notes: guest > 0 ? 'Friend visiting' : null,
        });
      }
    }

    // Chunk insert meals
    const chunkSize = 500;
    for (let c = 0; c < mealRows.length; c += chunkSize) {
      await prisma.meal.createMany({ data: mealRows.slice(c, c + chunkSize) });
    }

    const totalPeriodMeals = Object.values(memberMealsCount).reduce((a, b) => a + b, 0);

    // D. Bazar Trips with Line Items (7-9 trips per month across different shoppers)
    let periodFoodCost = 0;
    const memberBazarContributed: Record<string, number> = {};
    for (const mem of memberList) {
      memberBazarContributed[mem.id] = 0;
    }

    const bazarCategories = [
      { name: 'Fresh Fish (Rui & Hilsha)', unit: 'kg', price: 650 },
      { name: 'Broiler & Sonali Chicken', unit: 'kg', price: 260 },
      { name: 'Beef Shank & Ribs', unit: 'kg', price: 780 },
      { name: 'Farm Eggs (Brown)', unit: 'dozen', price: 155 },
      { name: 'Miniket Premium Rice', unit: 'kg', price: 75 },
      { name: 'Soybean & Mustard Oil', unit: 'liter', price: 185 },
      { name: 'Potatoes, Onion & Garlic', unit: 'kg', price: 65 },
      { name: 'Lentils & Spices Pack', unit: 'kg', price: 140 },
    ];

    for (let bIdx = 0; bIdx < foodBazarCount; bIdx++) {
      const shopper = memberList[(bIdx * 2 + 1) % memberList.length];
      const tripDay = Math.min(days, 2 + bIdx * 3);
      const tripDate = new Date(Date.UTC(year, month - 1, tripDay));
      const tripCost = Math.round(baseFood / foodBazarCount + ((bIdx % 3) - 1) * 250);
      periodFoodCost += tripCost;
      memberBazarContributed[shopper.id] += tripCost;
      totalBazar++;

      const bEntry = await prisma.bazarEntry.create({
        data: {
          messId: mess.id,
          buyerMemberId: shopper.id,
          amount: new Prisma.Decimal(tripCost),
          date: tripDate,
          description: `Weekly Mess Grocery Trip #${bIdx + 1}`,
          paymentMethod: 'CASH',
          itemsSummary: 'Fresh meat, fish, seasonal vegetables, spices and rice',
        },
      });

      // 3-4 realistic items
      const item1 = bazarCategories[bIdx % bazarCategories.length];
      const item2 = bazarCategories[(bIdx + 3) % bazarCategories.length];
      const p1 = Math.round(tripCost * 0.6);
      const p2 = tripCost - p1;

      await prisma.bazarItem.createMany({
        data: [
          {
            bazarEntryId: bEntry.id,
            name: item1.name,
            quantity: new Prisma.Decimal(Math.max(1, Math.round(p1 / item1.price))),
            unit: item1.unit,
            unitPrice: new Prisma.Decimal(item1.price),
            totalAmount: new Prisma.Decimal(p1),
          },
          {
            bazarEntryId: bEntry.id,
            name: item2.name,
            quantity: new Prisma.Decimal(Math.max(1, Math.round(p2 / item2.price))),
            unit: item2.unit,
            unitPrice: new Prisma.Decimal(item2.price),
            totalAmount: new Prisma.Decimal(p2),
          },
        ],
      });
    }

    // Calculated Meal Rate
    const calculatedMealRate = Math.round((periodFoodCost / totalPeriodMeals) * 100) / 100;

    // E. One-Time Miscellaneous Expenses (Strictly Maintenance, Cleaning, Repairs — NO BILLS)
    const expensePayer = memberList[0]; // Manager
    const oneTimeExpenses = [
      {
        cat: 'MAINTENANCE',
        desc: `Bathroom plumbing & faucet repair (Period ${periodKey})`,
        amt: 1200 + ((month * 170) % 600),
        day: 10,
      },
      {
        cat: 'CLEANING',
        desc: `Heavy floor disinfectant & kitchen cleaning supplies (${periodKey})`,
        amt: 850 + ((month * 90) % 300),
        day: 18,
      },
    ];

    let periodExpenseTotal = 0;
    for (const exp of oneTimeExpenses) {
      periodExpenseTotal += exp.amt;
      totalExpenses++;
      const createdExp = await prisma.expense.create({
        data: {
          messId: mess.id,
          payerMemberId: expensePayer.id,
          amount: new Prisma.Decimal(exp.amt),
          type: ExpenseType.VARIABLE,
          category: exp.cat,
          description: exp.desc,
          date: new Date(Date.UTC(year, month - 1, exp.day)),
          billingPeriod: periodKey,
          status: ExpenseStatus.APPROVED,
        },
      });

      // Split equally across 10 members
      const expAllocRows = memberList.map((m) => ({
        messId: mess.id,
        expenseId: createdExp.id,
        memberId: m.id,
        amount: new Prisma.Decimal(Math.round((exp.amt / 10) * 100) / 100),
        splitMethod: SplitMethod.EQUAL,
      }));
      await prisma.expenseAllocation.createMany({ data: expAllocRows });
    }

    // F. Unified Bills & Utilities (Rent, Wi-Fi, Maid, Electricity, Gas, Water)
    const billItems = [
      { title: 'Apartment House Rent', cat: 'RENT', group: 'FIXED', amt: 35000, billType: 'FIXED' },
      { title: 'High-Speed Broadband Optical Fiber', cat: 'WIFI', group: 'FIXED', amt: 1500, billType: 'FIXED' },
      { title: 'Cook & Maid Household Monthly Salary', cat: 'MAID', group: 'FIXED', amt: 5500, billType: 'FIXED' },
      { title: 'DESCO Electricity Utility Bill', cat: 'ELECTRICITY', group: 'UTILITY', amt: elecAmount, billType: 'METER_BASED', units: elecUnits },
      { title: 'LP Gas Cylinder Refill', cat: 'GAS', group: 'UTILITY', amt: gasAmount, billType: 'USAGE_BASED' },
      { title: 'WASA Water & Sewerage Utility', cat: 'WATER', group: 'UTILITY', amt: 1000, billType: 'FIXED' },
    ];

    let periodBillsTotal = 0;
    let periodUtilitiesTotal = 0;

    for (const b of billItems) {
      if (b.group === 'FIXED') periodBillsTotal += b.amt;
      else periodUtilitiesTotal += b.amt;
      totalBills++;

      const ub = await prisma.utilityBill.create({
        data: {
          messId: mess.id,
          title: b.title,
          category: b.cat,
          billType: b.billType,
          amount: new Prisma.Decimal(b.amt),
          billingPeriod: periodKey,
          billingDate: new Date(Date.UTC(year, month - 1, 5)),
          dueDate: new Date(Date.UTC(year, month - 1, 15)),
          status: isClosed ? BillStatus.PAID : BillStatus.POSTED,
          splitMethod: SplitMethod.EQUAL,
          isPosted: true,
          postedAt: new Date(Date.UTC(year, month - 1, 6)),
          consumedUnits: b.units ? new Prisma.Decimal(b.units) : null,
          unitRate: b.units ? new Prisma.Decimal(Math.round((b.amt / b.units) * 100) / 100) : null,
          paidByMemberId: expensePayer.id,
          paidAt: isClosed ? new Date(Date.UTC(year, month - 1, 10)) : null,
          paymentMethod: 'BANK',
        },
      });

      // Also create matching Bill record for unified cross-table compatibility
      const billRecord = await prisma.bill.create({
        data: {
          messId: mess.id,
          name: b.title,
          category: b.cat,
          amount: new Prisma.Decimal(b.amt),
          billingPeriod: periodKey,
          dueDate: new Date(Date.UTC(year, month - 1, 15)),
          status: isClosed ? BillStatus.PAID : BillStatus.POSTED,
          paidByMemberId: expensePayer.id,
          paidAt: isClosed ? new Date(Date.UTC(year, month - 1, 10)) : null,
        },
      });

      // Allocations
      const uAllocRows = memberList.map((m) => ({
        utilityBillId: ub.id,
        memberId: m.id,
        amount: new Prisma.Decimal(Math.round((b.amt / 10) * 100) / 100),
      }));
      await prisma.utilityAllocation.createMany({ data: uAllocRows });

      const billAllocRows = memberList.map((m) => ({
        messId: mess.id,
        billId: billRecord.id,
        memberId: m.id,
        amount: new Prisma.Decimal(Math.round((b.amt / 10) * 100) / 100),
        splitMethod: SplitMethod.EQUAL,
      }));
      await prisma.expenseAllocation.createMany({ data: billAllocRows });
    }

    // G. Double-Entry Ledger Entries
    const ledgerRows = [];
    const memberNetBalances: Array<{ memberId: string; memberName: string; netBalance: number }> = [];

    // Calculate individual member financial breakdowns
    const rentPerMember = 3500; // 35000 / 10
    const wifiPerMember = 150;  // 1500 / 10
    const maidPerMember = 550;  // 5500 / 10
    const fixedSharePerMember = rentPerMember + wifiPerMember + maidPerMember; // 4200
    const utilSharePerMember = Math.round((periodUtilitiesTotal / 10) * 100) / 100;
    const expSharePerMember = Math.round((periodExpenseTotal / 10) * 100) / 100;

    for (const mem of memberList) {
      let runningBalance = 0;

      // 1. Advance Deposit (Credit)
      const depAmt = depositAmounts[mem.id];
      runningBalance += depAmt;
      ledgerRows.push({
        messId: mess.id,
        memberId: mem.id,
        entryType: LedgerEntryType.ADVANCE_DEPOSIT,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal(depAmt),
        balanceAfter: new Prisma.Decimal(runningBalance),
        referenceType: 'ADVANCE',
        description: `Advance deposit confirmed for ${periodKey}`,
        effectiveDate: new Date(Date.UTC(year, month - 1, 3)),
      });

      // 2. Bazar Contribution (Credit if this member bought groceries)
      const bazarPaid = memberBazarContributed[mem.id];
      if (bazarPaid > 0) {
        runningBalance += bazarPaid;
        ledgerRows.push({
          messId: mess.id,
          memberId: mem.id,
          entryType: LedgerEntryType.BAZAR_CONTRIBUTION,
          direction: LedgerDirection.CREDIT,
          amount: new Prisma.Decimal(bazarPaid),
          balanceAfter: new Prisma.Decimal(runningBalance),
          referenceType: 'BAZAR',
          description: `Grocery shopping contribution in ${periodKey}`,
          effectiveDate: new Date(Date.UTC(year, month - 1, 15)),
        });
      }

      // 3. Food Share (Debit = memberMeals * mealRate)
      const memberMealCount = memberMealsCount[mem.id];
      const foodShare = Math.round(memberMealCount * calculatedMealRate * 100) / 100;
      runningBalance -= foodShare;
      ledgerRows.push({
        messId: mess.id,
        memberId: mem.id,
        entryType: LedgerEntryType.FOOD_SHARE,
        direction: LedgerDirection.DEBIT,
        amount: new Prisma.Decimal(foodShare),
        balanceAfter: new Prisma.Decimal(runningBalance),
        referenceType: 'MEAL_PERIOD',
        description: `Food consumption share (${memberMealCount} meals @ ৳${calculatedMealRate})`,
        effectiveDate: new Date(Date.UTC(year, month - 1, days)),
      });

      // 4. Rent Share (Debit)
      runningBalance -= rentPerMember;
      ledgerRows.push({
        messId: mess.id,
        memberId: mem.id,
        entryType: LedgerEntryType.RENT_SHARE,
        direction: LedgerDirection.DEBIT,
        amount: new Prisma.Decimal(rentPerMember),
        balanceAfter: new Prisma.Decimal(runningBalance),
        referenceType: 'BILL',
        description: `Monthly house rent share for ${periodKey}`,
        effectiveDate: new Date(Date.UTC(year, month - 1, 5)),
      });

      // 5. Utility & Recurring Share (Debit)
      const totalOverhead = wifiPerMember + maidPerMember + utilSharePerMember + expSharePerMember;
      runningBalance -= totalOverhead;
      ledgerRows.push({
        messId: mess.id,
        memberId: mem.id,
        entryType: LedgerEntryType.UTILITY_SHARE,
        direction: LedgerDirection.DEBIT,
        amount: new Prisma.Decimal(totalOverhead),
        balanceAfter: new Prisma.Decimal(runningBalance),
        referenceType: 'UTILITY',
        description: `Utilities & maintenance overhead share for ${periodKey}`,
        effectiveDate: new Date(Date.UTC(year, month - 1, 20)),
      });

      memberNetBalances.push({
        memberId: mem.id,
        memberName: mem.name,
        netBalance: Math.round(runningBalance * 100) / 100,
      });
    }

    await prisma.ledgerEntry.createMany({ data: ledgerRows });

    // H. Smart Settlement Plan for CLOSED Periods
    if (isClosed) {
      // Reconcile settlement debtors vs creditors
      const debtors = memberNetBalances.filter((m) => m.netBalance < -0.01).map((m) => ({ ...m, remaining: Math.abs(m.netBalance) }));
      const creditors = memberNetBalances.filter((m) => m.netBalance > 0.01).map((m) => ({ ...m, remaining: m.netBalance }));

      // Adjust rounding cent if necessary so totalDebt == totalCredit exactly
      const totalDebt = debtors.reduce((s, d) => s + d.remaining, 0);
      const totalCredit = creditors.reduce((s, c) => s + c.remaining, 0);
      const diff = Math.round((totalDebt - totalCredit) * 100) / 100;
      if (Math.abs(diff) > 0 && Math.abs(diff) < 0.5 && creditors.length > 0) {
        creditors[0].remaining = Math.round((creditors[0].remaining + diff) * 100) / 100;
      }

      debtors.sort((a, b) => b.remaining - a.remaining);
      creditors.sort((a, b) => b.remaining - a.remaining);

      const plan = await prisma.settlementPlan.create({
        data: {
          messId: mess.id,
          billingPeriod: periodKey,
          totalDebtPool: new Prisma.Decimal(Math.round(totalDebt * 100) / 100),
          status: SettlementPlanStatus.SETTLED,
        },
      });

      let dI = 0;
      let cI = 0;
      while (dI < debtors.length && cI < creditors.length) {
        const d = debtors[dI];
        const c = creditors[cI];
        const transfer = Math.round(Math.min(d.remaining, c.remaining) * 100) / 100;

        if (transfer > 0.01) {
          const item = await prisma.settlementItem.create({
            data: {
              planId: plan.id,
              payerMemberId: d.memberId,
              receiverMemberId: c.memberId,
              amount: new Prisma.Decimal(transfer),
              settledAmount: new Prisma.Decimal(transfer),
              status: SettlementItemStatus.PAID,
              notes: `${d.memberName} settled with ${c.memberName}`,
            },
          });

          await prisma.settlementPayment.create({
            data: {
              settlementItemId: item.id,
              payerMemberId: d.memberId,
              receiverMemberId: c.memberId,
              amount: new Prisma.Decimal(transfer),
              paymentMethod: 'BKASH',
              status: PaymentStatus.CONFIRMED,
              paidAt: new Date(Date.UTC(year, month - 1, days)),
              confirmedAt: new Date(Date.UTC(year, month - 1, days)),
            },
          });

          d.remaining = Math.round((d.remaining - transfer) * 100) / 100;
          c.remaining = Math.round((c.remaining - transfer) * 100) / 100;
        }

        if (d.remaining <= 0.01) dI++;
        if (c.remaining <= 0.01) cI++;
      }

      // Financial Snapshot for Closed Period
      const totalMonthCost = periodFoodCost + periodExpenseTotal + periodBillsTotal + periodUtilitiesTotal;
      await prisma.financialSnapshot.create({
        data: {
          periodId: period.id,
          messId: mess.id,
          totalMeals: new Prisma.Decimal(totalPeriodMeals),
          totalFoodCost: new Prisma.Decimal(periodFoodCost),
          mealRate: new Prisma.Decimal(calculatedMealRate),
          totalFixedExpenses: new Prisma.Decimal(periodBillsTotal),
          totalVariableExpenses: new Prisma.Decimal(periodUtilitiesTotal + periodExpenseTotal),
          totalExpenses: new Prisma.Decimal(totalMonthCost),
          totalContributions: new Prisma.Decimal(periodFoodCost + (depositAmounts[memberList[0].id] * 10)),
          totalAdvances: new Prisma.Decimal(depositAmounts[memberList[0].id] * 10),
          totalPayments: new Prisma.Decimal(0),
          outstandingBalance: new Prisma.Decimal(0),
          isReconciled: true,
          memberBalancesJson: memberNetBalances,
          settlementSummaryJson: {
            totalDebtPool: totalDebt,
            status: 'SETTLED',
            settledDate: new Date(Date.UTC(year, month - 1, days)).toISOString(),
          },
          expenseBreakdownJson: [
            { category: 'FOOD', amount: periodFoodCost },
            { category: 'RENT', amount: 35000 },
            { category: 'WIFI', amount: 1500 },
            { category: 'MAID', amount: 5500 },
            { category: 'ELECTRICITY', amount: elecAmount },
            { category: 'GAS', amount: gasAmount },
            { category: 'WATER', amount: 1000 },
            { category: 'MAINTENANCE_CLEANING', amount: periodExpenseTotal },
          ],
        },
      });

      console.log(`   ✅ Period ${periodKey} closed with snapshot & settlement (Rate: ৳${calculatedMealRate}, Food: ৳${periodFoodCost}, Meals: ${totalPeriodMeals})`);
    } else {
      console.log(`   ⚡ Period ${periodKey} initialized as ACTIVE (Current MTD Rate: ৳${calculatedMealRate}, Food: ৳${periodFoodCost}, Meals: ${totalPeriodMeals})`);
    }
  }

  // 5. Create In-App Announcements
  await prisma.announcement.createMany({
    data: [
      {
        messId: mess.id,
        createdById: memberList[0].id,
        title: 'Welcome to Padma Student Residence',
        message: 'Welcome all 10 members! All billing periods May–August 2026 are settled. September 2026 is currently active.',
        priority: 'HIGH',
        audience: 'ALL_MEMBERS',
      },
      {
        messId: mess.id,
        createdById: memberList[0].id,
        title: 'Bazar Schedule for September',
        message: 'Please review your bazar duty dates in the Bazar section. Keep digital receipts for quick reimbursement.',
        priority: 'NORMAL',
        audience: 'ALL_MEMBERS',
      },
    ],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log(`🎉 [6/6] 5-MONTH DEMO SEEDING COMPLETED IN ${elapsed}s!`);
  console.log('======================================================');
  console.log(`Mess:                ${mess.name} [${mess.code}] (ID: ${mess.id})`);
  console.log(`Total Members:       ${memberList.length} Active Residents (1 MANAGER + 9 MEMBERs)`);
  console.log(`Total Rooms:         ${roomMap.size} Rooms (101, 102, 201, 202, 301)`);
  console.log(`Total Meals:         ${totalMeals.toLocaleString()} meal records`);
  console.log(`Total Bazar Trips:   ${totalBazar} grocery trips`);
  console.log(`Total Expenses:      ${totalExpenses} one-time maintenance & repair records`);
  console.log(`Total Bills:         ${totalBills} unified bills & utility records`);
  console.log(`Total Deposits:      ${totalDeposits} monthly advance deposits`);
  console.log(`Financial Periods:   5 periods (May 2026 - September 2026)`);
  console.log('======================================================\n');
  console.log('Login credentials for verification:');
  console.log('1. Manager (Ibna Siam): siamibna29@gmail.com / Password123!');
  console.log('2. Member (Tanvir):     tanvir.ahmed@padma.local / Password123!');
  console.log('3. Member (Rafiqul):    rafiqul.islam@padma.local / Password123!');
  console.log('======================================================\n');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed_five_months_demo.ts')) {
  seedFiveMonthsDemo()
    .catch((e) => {
      console.error('❌ [SEED ERROR]:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
