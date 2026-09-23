import { prisma } from '../config/database.js';

async function audit() {
  const messes = await prisma.mess.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      _count: {
        select: {
          members: true,
          financialPeriods: true,
          meals: true,
          bazarEntries: true,
          expenses: true,
          bills: true,
          utilityBills: true,
          ledgerEntries: true,
          settlementPlans: true,
          notifications: true,
          documents: true,
        },
      },
    },
  });

  console.log('--- MESSES AUDIT ---');
  console.dir(messes, { depth: null });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      memberships: {
        select: {
          id: true,
          role: true,
          mess: { select: { name: true, code: true } },
        },
      },
    },
  });

  console.log('--- USERS AUDIT ---');
  console.log(`Total users: ${users.length}`);
  users.forEach((u) => {
    console.log(`- ${u.email} (${u.name}): ${u.memberships.map((m) => `${m.role} in ${m.mess.name}`).join(', ') || 'No mess'}`);
  });
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
