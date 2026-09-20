
const BASE_URL = 'http://localhost:5000/api/v1';

async function measureEndpoint(name: string, url: string, token: string) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const duration = Date.now() - start;
    console.log(`${name.padEnd(35)} : HTTP ${res.status} in ${duration} ms`);
    return duration;
  } catch (err: any) {
    const duration = Date.now() - start;
    console.log(`${name.padEnd(35)} : ERROR (${err.message}) in ${duration} ms`);
    return duration;
  }
}

async function run() {
  console.log('=== BENCHMARKING BACKEND API ENDPOINTS ===');

  // 1. Login
  const loginStart = Date.now();
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@messmate.com', password: 'Password@123' })
  });
  const loginJson: any = await loginRes.json();
  const token = loginJson.data?.token || loginJson.token;
  console.log(`Auth Login`.padEnd(35) + ` : HTTP ${loginRes.status} in ${Date.now() - loginStart} ms (token=${token?.slice(0, 10)}...)`);
  const messId = 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';

  // 2. Measure core page endpoints
  await measureEndpoint('GET /messes/:messId', `${BASE_URL}/messes/${messId}`, token);
  await measureEndpoint('GET /members (mess)', `${BASE_URL}/messes/${messId}/members`, token);
  await measureEndpoint('GET /meals', `${BASE_URL}/messes/${messId}/meals?date=2026-09-01`, token);
  await measureEndpoint('GET /bazar', `${BASE_URL}/messes/${messId}/bazar`, token);
  await measureEndpoint('GET /bills', `${BASE_URL}/messes/${messId}/bills`, token);
  await measureEndpoint('GET /expenses', `${BASE_URL}/messes/${messId}/expenses`, token);
  await measureEndpoint('GET /utilities', `${BASE_URL}/messes/${messId}/utilities`, token);
  await measureEndpoint('GET /financial/ledger', `${BASE_URL}/messes/${messId}/financial/ledger`, token);
  await measureEndpoint('GET /financial/settlements', `${BASE_URL}/messes/${messId}/financial/settlements`, token);
  await measureEndpoint('GET /financial-periods', `${BASE_URL}/messes/${messId}/financial-periods`, token);
  await measureEndpoint('GET /financial-periods/validation', `${BASE_URL}/messes/${messId}/financial-periods/de41fe22-d1f9-4319-a488-a9bb655694c5/validation`, token);
  await measureEndpoint('GET /dashboard/:messId', `${BASE_URL}/dashboard/${messId}`, token);
  await measureEndpoint('GET /reports/monthly', `${BASE_URL}/messes/${messId}/reports/monthly?period=2026-09`, token);
}

run().catch(console.error);
