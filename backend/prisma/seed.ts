import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { PrismaClient, Role, MessStatus, MemberStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('❌ FATAL: Database seeding is blocked in PRODUCTION unless ALLOW_PRODUCTION_SEED=true is explicitly set.');
    process.exit(1);
  }

  console.log('🌱 Seeding development database...');

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  // Upsert development admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@messmate.com' },
    update: {},
    create: {
      email: 'admin@messmate.com',
      passwordHash,
      name: 'Siam Ahmed',
      phone: '+8801700000000',
      isActive: true,
    },
  });

  // Create demo mess
  const demoMess = await prisma.mess.upsert({
    where: { code: 'GREENVIEW-01' },
    update: {},
    create: {
      name: 'Green View Mess',
      code: 'GREENVIEW-01',
      currency: 'BDT',
      currencySymbol: '৳',
      area: 'Dhanmondi',
      city: 'Dhaka',
      status: MessStatus.ACTIVE,
      createdById: adminUser.id,
    },
  });

  // Assign admin as OWNER member
  await prisma.messMember.upsert({
    where: {
      messId_userId: {
        messId: demoMess.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      messId: demoMess.id,
      userId: adminUser.id,
      role: Role.OWNER,
      roomNo: 'A-101',
      status: MemberStatus.ACTIVE,
    },
  });

  console.log('✅ Seed completed successfully:');
  console.log(`   User: admin@messmate.com (Pass: Password@123)`);
  console.log(`   Mess: ${demoMess.name} [${demoMess.code}]`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
