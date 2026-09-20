import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
  PrismaClient,
  Role,
  MessStatus,
  MemberStatus,
  PeriodStatus,
  SettlementPlanStatus,
  SettlementItemStatus,
  PaymentStatus,
  LedgerEntryType,
  LedgerDirection,
  BillStatus,
  ExpenseStatus,
  ExpenseType,
  SplitMethod,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Phase 11 Realistic Demo & Test Dataset Initialization...');

  // 1. Password Hash for all demo users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  // 2. Clean transient test messes from earlier integration tests
  console.log('🧹 Cleaning transient integration test messes...');
  const testMesses = await prisma.mess.findMany({
    where: {
      OR: [
        { code: { startsWith: 'PWATESTM-' } },
        { code: { startsWith: 'UTIL-' } },
        { name: { contains: 'Test Mess' } },
      ],
    },
  });

  for (const tm of testMesses) {
    try {
      await prisma.utilityAllocation.deleteMany({ where: { utilityBill: { messId: tm.id } } });
      await prisma.utilityBill.deleteMany({ where: { messId: tm.id } });
      await prisma.meterReading.deleteMany({ where: { messId: tm.id } });
      await prisma.expenseAllocation.deleteMany({ where: { messId: tm.id } });
      await prisma.expense.deleteMany({ where: { messId: tm.id } });
      await prisma.bill.deleteMany({ where: { messId: tm.id } });
      await prisma.ledgerEntry.deleteMany({ where: { messId: tm.id } });
      await prisma.advanceDeposit.deleteMany({ where: { messId: tm.id } });
      await prisma.settlementPayment.deleteMany({ where: { settlementItem: { plan: { messId: tm.id } } } });
      await prisma.settlementItem.deleteMany({ where: { plan: { messId: tm.id } } });
      await prisma.settlementPlan.deleteMany({ where: { messId: tm.id } });
      await prisma.meal.deleteMany({ where: { messId: tm.id } });
      await prisma.bazarItem.deleteMany({ where: { bazarEntry: { messId: tm.id } } });
      await prisma.bazarEntry.deleteMany({ where: { messId: tm.id } });
      await prisma.messMember.deleteMany({ where: { messId: tm.id } });
      await prisma.room.deleteMany({ where: { messId: tm.id } });
      await prisma.mess.delete({ where: { id: tm.id } });
      console.log(`   Deleted transient test mess: ${tm.name} (${tm.code})`);
    } catch (e) {
      console.warn(`   Could not delete mess ${tm.code}:`, e);
    }
  }

  // Clean orphan test users that don't own any mess
  const remainingMesses = await prisma.mess.findMany({ select: { createdById: true } });
  const ownerIds = new Set(remainingMesses.map(m => m.createdById));
  
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { startsWith: 'pwa_' } },
        { email: { startsWith: 'util_' } },
      ],
    },
  });

  for (const tu of testUsers) {
    if (!ownerIds.has(tu.id)) {
      await prisma.messMember.deleteMany({ where: { userId: tu.id } });
      await prisma.pushSubscription.deleteMany({ where: { userId: tu.id } });
      await prisma.notification.deleteMany({ where: { userId: tu.id } });
      await prisma.user.delete({ where: { id: tu.id } });
    }
  }

  // 3. Ensure Core Mess (Green View Mess)
  console.log('🏢 Setting up Core Mess: Green View Mess (GREENVIEW-01)...');
  let coreMess = await prisma.mess.findUnique({
    where: { code: 'GREENVIEW-01' },
  });

  // Ensure Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@messmate.com' },
    update: {
      name: 'Siam Ahmed',
      phone: '+8801711000001',
      passwordHash,
      isActive: true,
    },
    create: {
      email: 'admin@messmate.com',
      passwordHash,
      name: 'Siam Ahmed',
      phone: '+8801711000001',
      isActive: true,
    },
  });

  if (!coreMess) {
    coreMess = await prisma.mess.create({
      data: {
        name: 'Green View Mess',
        code: 'GREENVIEW-01',
        currency: 'BDT',
        currencySymbol: '৳',
        area: 'Dhanmondi 32',
        city: 'Dhaka',
        address: 'House 42, Road 7/A, Dhanmondi, Dhaka 1209',
        timezone: 'Asia/Dhaka',
        status: MessStatus.ACTIVE,
        createdById: adminUser.id,
      },
    });
  } else {
    // Clean old demo data under GREENVIEW-01 to ensure exact 10 members and 2 months of clean records
    console.log('   Refreshing existing records for Green View Mess...');
    await prisma.settlementPayment.deleteMany({ where: { settlementItem: { plan: { messId: coreMess.id } } } });
    await prisma.settlementItem.deleteMany({ where: { plan: { messId: coreMess.id } } });
    await prisma.settlementPlan.deleteMany({ where: { messId: coreMess.id } });
    await prisma.financialAdjustment.deleteMany({ where: { messId: coreMess.id } });
    await prisma.ledgerEntry.deleteMany({ where: { messId: coreMess.id } });
    await prisma.advanceDeposit.deleteMany({ where: { messId: coreMess.id } });
    await prisma.expenseAllocation.deleteMany({ where: { messId: coreMess.id } });
    await prisma.utilityAllocation.deleteMany({ where: { utilityBill: { messId: coreMess.id } } });
    await prisma.utilityBill.deleteMany({ where: { messId: coreMess.id } });
    await prisma.bill.deleteMany({ where: { messId: coreMess.id } });
    await prisma.expense.deleteMany({ where: { messId: coreMess.id } });
    await prisma.bazarItem.deleteMany({ where: { bazarEntry: { messId: coreMess.id } } });
    await prisma.bazarEntry.deleteMany({ where: { messId: coreMess.id } });
    await prisma.meal.deleteMany({ where: { messId: coreMess.id } });
    await prisma.periodEvent.deleteMany({ where: { period: { messId: coreMess.id } } });
    await prisma.financialSnapshot.deleteMany({ where: { messId: coreMess.id } });
    await prisma.financialPeriod.deleteMany({ where: { messId: coreMess.id } });
  }

  const messId = coreMess.id;

  // 4. Setup Rooms
  console.log('🛏️ Creating 5 Mess Rooms...');
  const roomConfigs = [
    { roomNumber: '101', floor: '1st', capacity: 2, monthlyRent: 7000.0 },
    { roomNumber: '102', floor: '1st', capacity: 2, monthlyRent: 7000.0 },
    { roomNumber: '201', floor: '2nd', capacity: 2, monthlyRent: 7000.0 },
    { roomNumber: '202', floor: '2nd', capacity: 2, monthlyRent: 7000.0 },
    { roomNumber: '301', floor: '3rd', capacity: 2, monthlyRent: 7000.0 },
  ];

  const rooms: Record<string, any> = {};
  for (const rc of roomConfigs) {
    rooms[rc.roomNumber] = await prisma.room.upsert({
      where: {
        messId_roomNumber: {
          messId,
          roomNumber: rc.roomNumber,
        },
      },
      update: {
        capacity: rc.capacity,
        monthlyRent: rc.monthlyRent,
        floor: rc.floor,
        isActive: true,
      },
      create: {
        messId,
        roomNumber: rc.roomNumber,
        floor: rc.floor,
        capacity: rc.capacity,
        monthlyRent: rc.monthlyRent,
        isActive: true,
      },
    });
  }

  // 5. Exactly 10 Bangladeshi Members (1 MANAGER with Treasurer responsibilities + 9 MEMBERs)
  console.log('👥 Establishing 10 Realistic Demo Members (1 MANAGER, 9 MEMBER)...');
  const memberConfigs = [
    {
      name: 'Siam Ahmed',
      email: 'admin@messmate.com',
      phone: '+8801711000001',
      role: Role.MANAGER, // Manager acts as Treasurer
      roomNumber: '101',
    },
    {
      name: 'Rahim Ahmed',
      email: 'rahim@messmate.com',
      phone: '+8801711000002',
      role: Role.MEMBER,
      roomNumber: '101',
    },
    {
      name: 'Karim Ullah',
      email: 'karim@messmate.com',
      phone: '+8801711000003',
      role: Role.MEMBER,
      roomNumber: '102',
    },
    {
      name: 'Farhan Kabir',
      email: 'farhan@messmate.com',
      phone: '+8801711000004',
      role: Role.MEMBER,
      roomNumber: '102',
    },
    {
      name: 'Shafiqul Islam',
      email: 'shafiq@messmate.com',
      phone: '+8801711000005',
      role: Role.MEMBER,
      roomNumber: '201',
    },
    {
      name: 'Tareq Rahman',
      email: 'tareq@messmate.com',
      phone: '+8801711000006',
      role: Role.MEMBER,
      roomNumber: '201',
    },
    {
      name: 'Naimur Reza',
      email: 'naimur@messmate.com',
      phone: '+8801711000007',
      role: Role.MEMBER,
      roomNumber: '202',
    },
    {
      name: 'Arif Hossain',
      email: 'arif@messmate.com',
      phone: '+8801711000008',
      role: Role.MEMBER,
      roomNumber: '202',
    },
    {
      name: 'Mahmudul Hasan',
      email: 'mahmud@messmate.com',
      phone: '+8801711000009',
      role: Role.MEMBER,
      roomNumber: '301',
    },
    {
      name: 'Zubair Ahmed',
      email: 'zubair@messmate.com',
      phone: '+8801711000010',
      role: Role.MEMBER,
      roomNumber: '301',
    },
  ];

  const members: any[] = [];

  for (const mc of memberConfigs) {
    const user = await prisma.user.upsert({
      where: { email: mc.email },
      update: {
        name: mc.name,
        phone: mc.phone,
        passwordHash,
        isActive: true,
      },
      create: {
        email: mc.email,
        name: mc.name,
        phone: mc.phone,
        passwordHash,
        isActive: true,
      },
    });

    const room = rooms[mc.roomNumber];

    const member = await prisma.messMember.upsert({
      where: {
        messId_userId: {
          messId,
          userId: user.id,
        },
      },
      update: {
        role: mc.role,
        roomNo: mc.roomNumber,
        roomId: room?.id,
        status: MemberStatus.ACTIVE,
        joinDate: new Date('2026-08-01T00:00:00Z'),
      },
      create: {
        messId,
        userId: user.id,
        role: mc.role,
        roomNo: mc.roomNumber,
        roomId: room?.id,
        status: MemberStatus.ACTIVE,
        joinDate: new Date('2026-08-01T00:00:00Z'),
      },
      include: { user: true },
    });

    members.push(member);
    console.log(`   Registered: ${mc.name} (${mc.role}) -> Room ${mc.roomNumber} [${mc.email}]`);
  }

  // 6. Generate Realistic 2-Month Dataset
  // Month 1: August 2026 (2026-08-01 to 2026-08-31) - Fully CLOSED & Finalized
  // Month 2: September 2026 (2026-09-01 to 2026-09-30) - ACTIVE & Operational

  const months = [
    {
      year: 2026,
      month: 8,
      key: '2026-08',
      days: 31,
      isClosed: true,
      startDate: new Date('2026-08-01T00:00:00Z'),
      endDate: new Date('2026-08-31T23:59:59Z'),
      elecBillAmount: 3800.0,
      gasBillAmount: 1500.0,
    },
    {
      year: 2026,
      month: 9,
      key: '2026-09',
      days: 30,
      isClosed: false,
      startDate: new Date('2026-09-01T00:00:00Z'),
      endDate: new Date('2026-09-30T23:59:59Z'),
      elecBillAmount: 3450.0,
      gasBillAmount: 1500.0,
    },
  ];

  for (const mInfo of months) {
    console.log(`\n📅 Processing Month: ${mInfo.key} (${mInfo.days} days)...`);

    // A. Daily Meals
    console.log(`   Generating daily meals for 10 members across ${mInfo.days} days...`);
    let totalMealsCount = 0;
    const memberMealTotals: Record<string, number> = {};
    members.forEach((m) => (memberMealTotals[m.id] = 0));

    for (let day = 1; day <= mInfo.days; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const mealDate = new Date(`${mInfo.year}-${mInfo.month < 10 ? '0' + mInfo.month : mInfo.month}-${dayStr}T12:00:00Z`);
      const dayOfWeek = mealDate.getUTCDay(); // 5 = Friday (weekend in BD)

      for (let i = 0; i < members.length; i++) {
        const mem = members[i];
        // Realistic patterns:
        // Friday or Saturday: occasionally on weekend trip or skipping lunch/dinner
        let b = 1.0;
        let l = 1.0;
        let d = 1.0;

        if (dayOfWeek === 5 && (i === 2 || i === 7)) {
          // Weekend home visit
          b = 0.5;
          l = 0.0;
          d = 0.0;
        } else if (day % 7 === 0 && (i === 3 || i === 5)) {
          l = 0.0; // Skipped lunch
        }

        const memDailySum = b + l + d;
        memberMealTotals[mem.id] += memDailySum;
        totalMealsCount += memDailySum;

        await prisma.meal.create({
          data: {
            messId,
            memberId: mem.id,
            date: mealDate,
            breakfast: b,
            lunch: l,
            dinner: d,
          },
        });
      }
    }
    console.log(`   Total meals logged: ${totalMealsCount}`);

    // B. Bazar Purchases & Items
    console.log('   Creating realistic grocery bazaar purchases...');
    const bazarList = [
      {
        day: 2,
        buyerIdx: 0,
        amount: 3250.0,
        desc: 'Miniket Rice 50kg bag, Soybean Oil 5L, Spices',
        items: [
          { name: 'Miniket Rice', qty: 50, unit: 'kg', unitPrice: 50.0, total: 2500.0 },
          { name: 'Soybean Oil', qty: 5, unit: 'L', unitPrice: 150.0, total: 750.0 },
        ],
      },
      {
        day: 5,
        buyerIdx: 1,
        amount: 2850.0,
        desc: 'Broiler Chicken 5kg, Fresh Potatoes 10kg, Onions 5kg',
        items: [
          { name: 'Broiler Chicken', qty: 5, unit: 'kg', unitPrice: 210.0, total: 1050.0 },
          { name: 'Potatoes', qty: 10, unit: 'kg', unitPrice: 60.0, total: 600.0 },
          { name: 'Onions', qty: 5, unit: 'kg', unitPrice: 120.0, total: 600.0 },
          { name: 'Garlic & Ginger', qty: 2, unit: 'kg', unitPrice: 300.0, total: 600.0 },
        ],
      },
      {
        day: 8,
        buyerIdx: 2,
        amount: 3400.0,
        desc: 'Fresh Rui Fish 4kg, Green Vegetables, Eggs 4 crates',
        items: [
          { name: 'Rui Fish', qty: 4, unit: 'kg', unitPrice: 380.0, total: 1520.0 },
          { name: 'Farm Eggs', qty: 120, unit: 'pcs', unitPrice: 12.0, total: 1440.0 },
          { name: 'Mixed Vegetables', qty: 8, unit: 'kg', unitPrice: 55.0, total: 440.0 },
        ],
      },
      {
        day: 12,
        buyerIdx: 3,
        amount: 3100.0,
        desc: 'Beef 3.5kg, Green Papaya, Lentils 4kg',
        items: [
          { name: 'Beef', qty: 3.5, unit: 'kg', unitPrice: 750.0, total: 2625.0 },
          { name: 'Musur Dal (Lentils)', qty: 4, unit: 'kg', unitPrice: 118.75, total: 475.0 },
        ],
      },
      {
        day: 15,
        buyerIdx: 4,
        amount: 2950.0,
        desc: 'Hilsha Fish 2pcs, Seasonal Vegetables, Salt & Spices',
        items: [
          { name: 'Hilsha Fish', qty: 2, unit: 'kg', unitPrice: 1100.0, total: 2200.0 },
          { name: 'Eggplant & Tomato', qty: 5, unit: 'kg', unitPrice: 80.0, total: 400.0 },
          { name: 'Spices Mix', qty: 1, unit: 'pack', unitPrice: 350.0, total: 350.0 },
        ],
      },
      {
        day: 18,
        buyerIdx: 5,
        amount: 2750.0,
        desc: 'Chicken 4kg, Vegetables, Eggs 2 crates',
        items: [
          { name: 'Broiler Chicken', qty: 4, unit: 'kg', unitPrice: 210.0, total: 840.0 },
          { name: 'Eggs', qty: 60, unit: 'pcs', unitPrice: 12.5, total: 750.0 },
          { name: 'Vegetables & Chilies', qty: 10, unit: 'kg', unitPrice: 116.0, total: 1160.0 },
        ],
      },
      {
        day: 22,
        buyerIdx: 6,
        amount: 3600.0,
        desc: 'Beef 4kg, Mustard Oil, Dry Chilies, Turmeric',
        items: [
          { name: 'Beef', qty: 4, unit: 'kg', unitPrice: 750.0, total: 3000.0 },
          { name: 'Mustard Oil', qty: 2, unit: 'L', unitPrice: 300.0, total: 600.0 },
        ],
      },
      {
        day: 25,
        buyerIdx: 7,
        amount: 2800.0,
        desc: 'Catla Fish 4kg, Cauliflower, Carrots, Green Peas',
        items: [
          { name: 'Catla Fish', qty: 4, unit: 'kg', unitPrice: 400.0, total: 1600.0 },
          { name: 'Winter Vegetables', qty: 15, unit: 'kg', unitPrice: 80.0, total: 1200.0 },
        ],
      },
      {
        day: 28,
        buyerIdx: 8,
        amount: 3200.0,
        desc: 'Miniket Rice 25kg, Chicken 4kg, Dal 2kg',
        items: [
          { name: 'Miniket Rice', qty: 25, unit: 'kg', unitPrice: 50.0, total: 1250.0 },
          { name: 'Chicken', qty: 4, unit: 'kg', unitPrice: 215.0, total: 860.0 },
          { name: 'Dal & Spices', qty: 1, unit: 'pack', unitPrice: 1090.0, total: 1090.0 },
        ],
      },
      {
        day: 30,
        buyerIdx: 9,
        amount: 2900.0,
        desc: 'Tilapia Fish 5kg, Fresh Potatoes 10kg, Onions',
        items: [
          { name: 'Tilapia Fish', qty: 5, unit: 'kg', unitPrice: 220.0, total: 1100.0 },
          { name: 'Vegetables & Spices', qty: 1, unit: 'lot', unitPrice: 1800.0, total: 1800.0 },
        ],
      },
    ];

    let totalBazarAmount = 0;
    const memberBazarSpent: Record<string, number> = {};
    members.forEach((m) => (memberBazarSpent[m.id] = 0));

    for (const bz of bazarList) {
      if (bz.day > mInfo.days) continue;
      const bzDate = new Date(`${mInfo.year}-${mInfo.month < 10 ? '0' + mInfo.month : mInfo.month}-${bz.day < 10 ? '0' + bz.day : bz.day}T09:00:00Z`);
      const buyer = members[bz.buyerIdx];
      totalBazarAmount += bz.amount;
      memberBazarSpent[buyer.id] += bz.amount;

      const bazarEntry = await prisma.bazarEntry.create({
        data: {
          messId,
          buyerMemberId: buyer.id,
          amount: bz.amount,
          date: bzDate,
          description: bz.desc,
          paymentMethod: 'CASH',
        },
      });

      for (const it of bz.items) {
        await prisma.bazarItem.create({
          data: {
            bazarEntryId: bazarEntry.id,
            name: it.name,
            quantity: it.qty,
            unit: it.unit,
            unitPrice: it.unitPrice,
            totalAmount: it.total,
          },
        });
      }

      // Record in Ledger as BAZAR_CONTRIBUTION (Credit for buyer)
      await prisma.ledgerEntry.create({
        data: {
          messId,
          memberId: buyer.id,
          entryType: LedgerEntryType.BAZAR_CONTRIBUTION,
          direction: LedgerDirection.CREDIT,
          amount: bz.amount,
          balanceAfter: 0.0, // calculated downstream
          referenceType: 'BAZAR',
          referenceId: bazarEntry.id,
          description: `Bazar contribution: ${bz.desc}`,
          effectiveDate: bzDate,
        },
      });
    }

    const calculatedMealRate = Math.round((totalBazarAmount / totalMealsCount) * 10000) / 10000;
    console.log(`   Total Bazar Cost: ৳ ${totalBazarAmount}`);
    console.log(`   Total Meals: ${totalMealsCount}`);
    console.log(`   Calculated Meal Rate: ৳ ${calculatedMealRate} / meal`);

    // C. Fixed Bills
    console.log('   Creating recurring fixed bills (Rent, Wi-Fi, Maid)...');
    const fixedBillsConfig = [
      { name: 'House Rent (5 Rooms)', category: 'RENT', amount: 35000.0, paidByIdx: 0, day: 5 },
      { name: 'Maid / Cook (Bua) Salary', category: 'SALARY', amount: 5000.0, paidByIdx: 0, day: 7 },
      { name: 'Wi-Fi Fiber Broadband', category: 'INTERNET', amount: 1200.0, paidByIdx: 1, day: 3 },
    ];

    let totalFixedCost = 0;
    for (const fb of fixedBillsConfig) {
      totalFixedCost += fb.amount;
      const dueDate = new Date(`${mInfo.year}-${mInfo.month < 10 ? '0' + mInfo.month : mInfo.month}-${fb.day < 10 ? '0' + fb.day : fb.day}T00:00:00Z`);
      const payer = members[fb.paidByIdx];

      const bill = await prisma.bill.create({
        data: {
          messId,
          name: fb.name,
          category: fb.category,
          amount: fb.amount,
          billingPeriod: mInfo.key,
          dueDate,
          status: BillStatus.PAID,
          isRecurring: true,
          paidByMemberId: payer.id,
          paidAt: dueDate,
          paymentMethod: 'BKASH',
        },
      });

      // Split across 10 members
      const perMemberShare = Math.round((fb.amount / members.length) * 100) / 100;
      for (const mem of members) {
        await prisma.expenseAllocation.create({
          data: {
            messId,
            billId: bill.id,
            memberId: mem.id,
            amount: perMemberShare,
          },
        });

        // Add ledger entry
        await prisma.ledgerEntry.create({
          data: {
            messId,
            memberId: mem.id,
            entryType: fb.category === 'RENT' ? LedgerEntryType.RENT_SHARE : LedgerEntryType.UTILITY_SHARE,
            direction: LedgerDirection.DEBIT,
            amount: perMemberShare,
            balanceAfter: 0.0,
            referenceType: 'BILL',
            referenceId: bill.id,
            description: `${fb.name} share (${mInfo.key})`,
            effectiveDate: dueDate,
          },
        });
      }
    }

    // D. Utilities (Electricity & Gas)
    console.log('   Creating utility meters and bills...');
    const utilityConfigs = [
      { title: 'Electricity (DESCO)', category: 'ELECTRICITY', amount: mInfo.elecBillAmount, day: 10 },
      { title: 'Titas Gas & WASA Water', category: 'GAS', amount: mInfo.gasBillAmount, day: 12 },
    ];

    let totalUtilityCost = 0;
    for (const ut of utilityConfigs) {
      totalUtilityCost += ut.amount;
      const uDate = new Date(`${mInfo.year}-${mInfo.month < 10 ? '0' + mInfo.month : mInfo.month}-${ut.day < 10 ? '0' + ut.day : ut.day}T00:00:00Z`);
      const uBill = await prisma.utilityBill.create({
        data: {
          messId,
          billType: ut.category === 'ELECTRICITY' ? 'METER_BASED' : 'FIXED',
          category: ut.category,
          title: ut.title,
          billingPeriod: mInfo.key,
          billingDate: uDate,
          dueDate: new Date(uDate.getTime() + 10 * 86400000),
          amount: ut.amount,
          status: BillStatus.POSTED,
          splitMethod: SplitMethod.EQUAL,
          paidByMemberId: members[0].id,
        },
      });

      const perMemUtil = Math.round((ut.amount / members.length) * 100) / 100;
      for (const mem of members) {
        await prisma.utilityAllocation.create({
          data: {
            utilityBillId: uBill.id,
            memberId: mem.id,
            amount: perMemUtil,
          },
        });

        await prisma.ledgerEntry.create({
          data: {
            messId,
            memberId: mem.id,
            entryType: LedgerEntryType.UTILITY_SHARE,
            direction: LedgerDirection.DEBIT,
            amount: perMemUtil,
            balanceAfter: 0.0,
            referenceType: 'UTILITY_BILL',
            referenceId: uBill.id,
            description: `${ut.title} allocation (${mInfo.key})`,
            effectiveDate: uDate,
          },
        });
      }
    }

    // E. Food Share Ledger Debit for each member
    for (const mem of members) {
      const memMeals = memberMealTotals[mem.id];
      const foodCost = Math.round(memMeals * calculatedMealRate * 100) / 100;

      await prisma.ledgerEntry.create({
        data: {
          messId,
          memberId: mem.id,
          entryType: LedgerEntryType.FOOD_SHARE,
          direction: LedgerDirection.DEBIT,
          amount: foodCost,
          balanceAfter: 0.0,
          referenceType: 'MEAL_PERIOD',
          description: `Food share: ${memMeals} meals @ ৳${calculatedMealRate} (${mInfo.key})`,
          effectiveDate: mInfo.endDate,
        },
      });
    }

    // F. Member Advance Deposits / Payments
    console.log('   Recording member advance payments...');
    let totalAdvances = 0;
    const memberPaidTotals: Record<string, number> = {};
    members.forEach((m) => (memberPaidTotals[m.id] = 0));

    // Realistic deposit patterns matching total fixed expenses so contributions exactly balance operating expenses
    const depositAmounts =
      mInfo.key === '2026-09'
        ? [5500, 4000, 5200, 3800, 5600, 4000, 5000, 4000, 5300, 3750] // Sum = 46,150.00
        : [5500, 4000, 5200, 3800, 5600, 4000, 5000, 4000, 5300, 4100]; // Sum = 46,500.00

    for (let i = 0; i < members.length; i++) {
      const mem = members[i];
      const basePay = depositAmounts[i];
      totalAdvances += basePay;
      memberPaidTotals[mem.id] += basePay;

      const payDate = new Date(`${mInfo.year}-${mInfo.month < 10 ? '0' + mInfo.month : mInfo.month}-0${(i % 5) + 1}T10:00:00Z`);
      const dep = await prisma.advanceDeposit.create({
        data: {
          messId,
          memberId: mem.id,
          amount: basePay,
          paymentMethod: i % 2 === 0 ? 'BKASH' : 'CASH',
          reference: `TRX-MM-${mInfo.key}-${1000 + i}`,
          billingPeriod: mInfo.key,
          date: payDate,
          status: PaymentStatus.CONFIRMED,
          notes: 'Regular monthly living advance deposit',
        },
      });

      await prisma.ledgerEntry.create({
        data: {
          messId,
          memberId: mem.id,
          entryType: LedgerEntryType.ADVANCE_DEPOSIT,
          direction: LedgerDirection.CREDIT,
          amount: basePay,
          balanceAfter: 0.0,
          referenceType: 'ADVANCE',
          referenceId: dep.id,
          description: `Monthly advance deposit (${mInfo.key})`,
          effectiveDate: payDate,
        },
      });
    }

    // G. Calculate Member Balances & Reconciled Settlement Plan
    console.log('   Calculating balances and constructing settlement plan...');
    const billCredits: Record<string, number> = {};
    members.forEach((m) => (billCredits[m.id] = 0));

    const netBalances: { memberId: string; name: string; net: number }[] = [];
    for (const mem of members) {
      const credits = memberPaidTotals[mem.id] + memberBazarSpent[mem.id] + billCredits[mem.id];
      const debits =
        3500.0 + // Rent
        500.0 + // Maid
        120.0 + // Wifi
        mInfo.elecBillAmount / 10 +
        mInfo.gasBillAmount / 10 +
        memberMealTotals[mem.id] * calculatedMealRate;

      const net = Math.round((credits - debits) * 100) / 100;
      netBalances.push({ memberId: mem.id, name: mem.user.name, net });
    }

    console.log('   Member Net Balances:');
    netBalances.forEach((nb) => console.log(`     ${nb.name}: ${nb.net >= 0 ? '+' : ''}${nb.net} BDT`));

    // Build Settlement Plan
    const debtors = netBalances.filter((b) => b.net < -0.01).map((b) => ({ ...b, balance: -b.net }));
    const creditors = netBalances.filter((b) => b.net > 0.01).map((b) => ({ ...b, balance: b.net }));

    const settlementItems: { fromId: string; toId: string; amount: number }[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const transferAmount = Math.round(Math.min(debtor.balance, creditor.balance) * 100) / 100;

      if (transferAmount > 0) {
        settlementItems.push({
          fromId: debtor.memberId,
          toId: creditor.memberId,
          amount: transferAmount,
        });
      }

      debtor.balance -= transferAmount;
      creditor.balance -= transferAmount;

      if (debtor.balance <= 0.01) dIdx++;
      if (creditor.balance <= 0.01) cIdx++;
    }

    const totalDebtPool = settlementItems.reduce((acc, it) => acc + it.amount, 0);

    const plan = await prisma.settlementPlan.create({
      data: {
        messId,
        billingPeriod: mInfo.key,
        totalDebtPool,
        status: mInfo.isClosed ? SettlementPlanStatus.SETTLED : SettlementPlanStatus.ACTIVE,
        notes: `Automated smart settlement plan for ${mInfo.key}`,
      },
    });

    for (const it of settlementItems) {
      const itemStatus = mInfo.isClosed ? SettlementItemStatus.PAID : SettlementItemStatus.PENDING;
      const sItem = await prisma.settlementItem.create({
        data: {
          planId: plan.id,
          payerMemberId: it.fromId,
          receiverMemberId: it.toId,
          amount: it.amount,
          settledAmount: mInfo.isClosed ? it.amount : 0.0,
          status: itemStatus,
        },
      });

      if (mInfo.isClosed) {
        await prisma.settlementPayment.create({
          data: {
            settlementItemId: sItem.id,
            payerMemberId: it.fromId,
            receiverMemberId: it.toId,
            amount: it.amount,
            paymentMethod: 'BKASH',
            reference: `SETTLE-${mInfo.key}-${Math.floor(Math.random() * 90000 + 10000)}`,
            status: PaymentStatus.CONFIRMED,
            paidAt: mInfo.endDate,
            confirmedAt: mInfo.endDate,
          },
        });
      }
    }

    // H. Financial Period Record & Snapshot
    console.log(`   Creating FinancialPeriod for ${mInfo.key}...`);
    const totalExpenses = totalBazarAmount + totalFixedCost + totalUtilityCost;

    const periodRecord = await prisma.financialPeriod.create({
      data: {
        messId,
        year: mInfo.year,
        month: mInfo.month,
        periodKey: mInfo.key,
        startDate: mInfo.startDate,
        endDate: mInfo.endDate,
        status: mInfo.isClosed ? PeriodStatus.CLOSED : PeriodStatus.ACTIVE,
        closedAt: mInfo.isClosed ? mInfo.endDate : null,
        closedById: mInfo.isClosed ? members[0].userId : null,
      },
    });

    await prisma.financialSnapshot.create({
      data: {
        periodId: periodRecord.id,
        messId,
        totalMeals: totalMealsCount,
        totalFoodCost: totalBazarAmount,
        mealRate: calculatedMealRate,
        totalFixedExpenses: totalFixedCost,
        totalVariableExpenses: totalUtilityCost,
        totalExpenses,
        totalContributions: totalBazarAmount,
        totalAdvances,
        totalPayments: totalAdvances,
        outstandingBalance: 0.0,
        isReconciled: true,
        memberBalancesJson: netBalances,
        settlementSummaryJson: { totalDebtPool, transfers: settlementItems.length },
        expenseBreakdownJson: {
          foodBazar: totalBazarAmount,
          rent: 35000.0,
          maid: 5000.0,
          wifi: 1200.0,
          electricity: mInfo.elecBillAmount,
          gas: mInfo.gasBillAmount,
        },
      },
    });

    console.log(`   ✅ Period ${mInfo.key} completely generated and synchronized!`);
  }

  console.log('\n🎉 =======================================================');
  console.log('🎉 PHASE 11 REALISTIC DATASET SEED COMPLETED SUCCESSFULLY!');
  console.log('🎉 =======================================================');
  console.log('Credentials:');
  console.log('  Manager (Full Admin & Treasurer): admin@messmate.com (Pass: Password@123)');
  console.log('  Member (Standard Access):        rahim@messmate.com (Pass: Password@123)');
  console.log('  Active Mess: Green View Mess (GREENVIEW-01)');
  console.log('  Periods: 2026-08 (CLOSED) & 2026-09 (ACTIVE)');
  console.log('  10 Members, 5 Rooms, 61 Days of Meals, Bazars, Bills, Utilities & Settlements.');
}

main()
  .catch((e) => {
    console.error('Fatal seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
