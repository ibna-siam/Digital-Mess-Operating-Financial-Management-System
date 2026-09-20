import { prisma } from '../config/database.js';

async function main() {
  const messId = 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';

  console.log('=== Non-GreenView Messes ===');
  const otherMesses = await prisma.mess.findMany({
    where: { id: { not: messId } },
    select: { id: true, name: true, code: true }
  });
  console.log(otherMesses);

  console.log('=== Non-MessMate Users ===');
  const otherUsers = await prisma.user.findMany({
    where: { NOT: { email: { endsWith: '@messmate.com' } } },
    select: { id: true, email: true, name: true }
  });
  console.log(`Count: ${otherUsers.length}`);
  console.log(otherUsers.map(u => u.email));

  console.log('=== Green View Mess Summary ===');
  const periods = await prisma.financialPeriod.findMany({
    where: { messId },
    select: { id: true, month: true, year: true, status: true, startDate: true, endDate: true }
  });
  console.log('Periods:', periods);

  const mealsByPeriod = await prisma.meal.groupBy({
    by: ['date'],
    where: { messId },
    _count: { id: true }
  });
  console.log(`Meals distinct dates count: ${mealsByPeriod.length}`);
  const minDate = mealsByPeriod.reduce((min, p) => p.date < min ? p.date : min, mealsByPeriod[0]?.date);
  const maxDate = mealsByPeriod.reduce((max, p) => p.date > max ? p.date : max, mealsByPeriod[0]?.date);
  console.log(`Meals date range: ${minDate?.toISOString()} to ${maxDate?.toISOString()}`);

  const bazarDates = await prisma.bazarEntry.findMany({
    where: { messId },
    select: { date: true, amount: true, description: true }
  });
  console.log(`Bazar entries count: ${bazarDates.length}`);
  console.log('Bazar dates:', bazarDates.map(b => `${b.date.toISOString().slice(0, 10)}: ${b.description} (${b.amount})`));

  const bills = await prisma.bill.findMany({
    where: { messId },
    select: { billingPeriod: true, name: true, amount: true, status: true }
  });
  console.log('Bills:', bills);

  const ledgerTypes = await prisma.ledgerEntry.groupBy({
    by: ['entryType', 'direction'],
    where: { messId },
    _count: { id: true },
    _sum: { amount: true }
  });
  console.log('Ledger summary:', ledgerTypes);

  await prisma.$disconnect();
}

main().catch(console.error);
