/**
 * DECOMMISSIONED: Phase 21 Demo Data Eradication.
 * Hardcoded demo seeding has been permanently disabled for production readiness.
 */
export async function seedFiveMonthsDemo() {
  console.warn('⚠️ [DECOMMISSIONED] Demo seeding has been permanently eradicated from the production ecosystem.');
  console.warn('   Production environments must operate with genuine tenant accounts and real data.');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed_five_months_demo.ts')) {
  seedFiveMonthsDemo();
}
