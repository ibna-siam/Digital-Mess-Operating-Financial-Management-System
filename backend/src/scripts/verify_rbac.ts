async function verifyRbac() {
  console.log('=== VERIFYING MANAGER VS MEMBER ROLES & RBAC ===');

  // 1. Login as MANAGER
  const mgrLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@messmate.com', password: 'Password@123' })
  });
  const mgrData = (await mgrLogin.json()) as any;
  const mgrToken = mgrData.data?.token;
  console.log('[MANAGER LOGIN] Status:', mgrLogin.status, 'Role:', mgrData.data?.activeMess?.myRole);

  // 2. Login as MEMBER
  const memLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahim@messmate.com', password: 'Password@123' })
  });
  const memData = (await memLogin.json()) as any;
  const memToken = memData.data?.token;
  console.log('[MEMBER LOGIN] Status:', memLogin.status, 'Role:', memData.data?.activeMess?.myRole);

  const messId = 'c3a66302-28a7-48a9-bb71-f500b36e6ea0';

  // 3. Test Manager Action: Financial Period Validation (Treasurer/Manager privilege)
  const mgrValRes = await fetch(`http://localhost:5000/api/v1/messes/${messId}/financial-periods/2026-09/validation`, {
    headers: { 'Authorization': `Bearer ${mgrToken}` }
  });
  console.log('[MANAGER PRIVILEGE] Month-End Validation HTTP Status:', mgrValRes.status, '(Expected 200)');

  // 4. Test Member Action: Member trying Manager-only route (e.g. Month-End Review)
  const memReviewRes = await fetch(`http://localhost:5000/api/v1/messes/${messId}/financial-periods/2026-09/review`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${memToken}` }
  });
  console.log('[MEMBER RESTRICTION] Month-End Review HTTP Status:', memReviewRes.status, '(Expected 403 Forbidden)');

  // 5. Test Member Action: Member can read their own data (e.g. meals)
  const memMealsRes = await fetch(`http://localhost:5000/api/v1/messes/${messId}/meals?date=2026-09-15`, {
    headers: { 'Authorization': `Bearer ${memToken}` }
  });
  console.log('[MEMBER ALLOWED] Read Meals HTTP Status:', memMealsRes.status, '(Expected 200)');

  console.log('=== RBAC VERIFICATION COMPLETED ===');
}

verifyRbac().catch(err => {
  console.error('RBAC check error:', err);
  process.exit(1);
});
