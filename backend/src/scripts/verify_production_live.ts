import { prisma } from '../config/database.js';

const PROD_API = 'https://messmate-backend-api.onrender.com/api/v1';

async function verifyLiveProduction() {
  console.log('🔍 [1/4] Verifying Live Render Health Endpoint...');
  const healthRes = await fetch(`${PROD_API}/health`);
  const healthData = (await healthRes.json()) as {
    success: boolean;
    data?: { status: string; database?: { status: string } };
  };
  console.log('Health Response:', healthData);
  if (!healthRes.ok || healthData.data?.database?.status !== 'connected') {
    throw new Error('Health check failed: database not connected');
  }

  console.log('🔍 [2/4] Verifying Live Registration Flow (Flow A: Create Mess)...');
  const tempEmail = `smoke_${Date.now()}@messmate.app`;
  const regPayload = {
    email: tempEmail,
    password: 'SecureProdTest@2026',
    name: 'Smoke Test Manager',
    phone: '+8801700000999',
    onboarding: {
      mode: 'CREATE',
      messName: 'Live Verification Mess',
      city: 'Dhaka',
      area: 'Banani',
      currency: 'BDT',
    },
  };

  const regRes = await fetch(`${PROD_API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });
  const regData = (await regRes.json()) as {
    success: boolean;
    data?: { token?: string; activeMess?: { id: string }; user?: { id: string } };
    message?: string;
  };
  console.log('Registration Response status:', regRes.status, 'success:', regData.success);

  if (!regRes.ok || !regData.data?.token || !regData.data?.activeMess?.id || !regData.data?.user?.id) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }

  const token = regData.data.token;
  const messId = regData.data.activeMess.id;
  const userId = regData.data.user.id;

  console.log('🔍 [3/4] Verifying Authenticated Live Dashboard API...');
  const dashRes = await fetch(`${PROD_API}/dashboard/${messId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-mess-id': messId,
    },
  });
  const dashData = (await dashRes.json()) as { success: boolean; data?: any };
  console.log('Dashboard Response status:', dashRes.status, 'success:', dashData.success);

  if (!dashRes.ok) {
    throw new Error(`Dashboard fetch failed: ${JSON.stringify(dashData)}`);
  }

  console.log('🧹 [4/4] Cleaning up Smoke Test Data from Production DB...');
  // Delete smoke test member, mess, user
  await prisma.messMember.deleteMany({ where: { messId } });
  await prisma.mess.deleteMany({ where: { id: messId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  // Verify DB table counts
  const userCount = await prisma.user.count();
  const messCount = await prisma.mess.count();
  console.log(`✅ Production DB cleaned. Users: ${userCount}, Messes: ${messCount}`);

  if (userCount !== 0 || messCount !== 0) {
    throw new Error('Database contains leftover records after smoke test!');
  }

  console.log('🎉 ALL PRODUCTION LIVE CHECKS PASSED WITH 0 LEFTOVER DATA!');
}

verifyLiveProduction()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
