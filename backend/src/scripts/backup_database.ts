import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { prisma } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

export async function runBackup(): Promise<{ backupPath: string; metaPath: string; stats: Record<string, number>; checksum: string }> {
  console.log('📦 Starting database backup procedure...');

  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `messmate-backup-${timestamp}.json.gz`;
  const metaFilename = `messmate-backup-${timestamp}.meta.json`;
  const backupPath = path.join(BACKUPS_DIR, backupFilename);
  const metaPath = path.join(BACKUPS_DIR, metaFilename);

  console.log('🔄 Fetching database tables via Prisma...');

  const [
    users,
    messes,
    members,
    rooms,
    invitations,
    notifications,
    announcements,
    documents,
    auditLogs,
    meals,
    expenses,
    expenseAllocations,
    bazarEntries,
    bazarItems,
    bills,
    recurringBills,
    ledgerEntries,
    advanceDeposits,
    settlementPlans,
    settlementItems,
    settlementPayments,
    financialAdjustments,
    settlements,
    financialPeriods,
    financialSnapshots,
    periodEvents,
    reopenRequests,
    utilityBills,
    utilityAllocations,
    meterReadings,
    recurringUtilityTemplates,
    leaveRequests,
    memberHistories,
    pushSubscriptions,
    notificationPreferences,
    offlineSyncActions,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.mess.findMany(),
    prisma.messMember.findMany(),
    prisma.room.findMany(),
    prisma.invitation.findMany(),
    prisma.notification.findMany(),
    prisma.announcement.findMany(),
    prisma.document.findMany(),
    prisma.auditLog.findMany(),
    prisma.meal.findMany(),
    prisma.expense.findMany(),
    prisma.expenseAllocation.findMany(),
    prisma.bazarEntry.findMany(),
    prisma.bazarItem.findMany(),
    prisma.bill.findMany(),
    prisma.recurringBill.findMany(),
    prisma.ledgerEntry.findMany(),
    prisma.advanceDeposit.findMany(),
    prisma.settlementPlan.findMany(),
    prisma.settlementItem.findMany(),
    prisma.settlementPayment.findMany(),
    prisma.financialAdjustment.findMany(),
    prisma.settlement.findMany(),
    prisma.financialPeriod.findMany(),
    prisma.financialSnapshot.findMany(),
    prisma.periodEvent.findMany(),
    prisma.reopenRequest.findMany(),
    prisma.utilityBill.findMany(),
    prisma.utilityAllocation.findMany(),
    prisma.meterReading.findMany(),
    prisma.recurringUtilityTemplate.findMany(),
    prisma.leaveRequest.findMany(),
    prisma.memberHistory.findMany(),
    prisma.pushSubscription.findMany(),
    prisma.notificationPreference.findMany(),
    prisma.offlineSyncAction.findMany(),
  ]);

  const rawData = {
    users,
    messes,
    members,
    rooms,
    invitations,
    notifications,
    announcements,
    documents,
    auditLogs,
    meals,
    expenses,
    expenseAllocations,
    bazarEntries,
    bazarItems,
    bills,
    recurringBills,
    ledgerEntries,
    advanceDeposits,
    settlementPlans,
    settlementItems,
    settlementPayments,
    financialAdjustments,
    settlements,
    financialPeriods,
    financialSnapshots,
    periodEvents,
    reopenRequests,
    utilityBills,
    utilityAllocations,
    meterReadings,
    recurringUtilityTemplates,
    leaveRequests,
    memberHistories,
    pushSubscriptions,
    notificationPreferences,
    offlineSyncActions,
  };

  const tableStats: Record<string, number> = {};
  for (const [table, rows] of Object.entries(rawData)) {
    tableStats[table] = (rows as any[]).length;
  }

  const jsonString = JSON.stringify(rawData);
  const rawHash = crypto.createHash('sha256').update(jsonString).digest('hex');

  // Gzip compression
  const compressedBuffer = zlib.gzipSync(Buffer.from(jsonString, 'utf-8'));
  const compressedHash = crypto.createHash('sha256').update(compressedBuffer).digest('hex');

  fs.writeFileSync(backupPath, compressedBuffer);

  const manifest = {
    backupFilename,
    timestamp: new Date().toISOString(),
    rawSha256: rawHash,
    compressedSha256: compressedHash,
    compressedSizeBytes: compressedBuffer.length,
    rawSizeBytes: Buffer.byteLength(jsonString, 'utf-8'),
    tableStats,
  };

  fs.writeFileSync(metaPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`✅ Backup successfully created: ${backupPath}`);
  console.log(`📊 Metadata written to: ${metaPath}`);
  console.log(`🔒 SHA-256: ${compressedHash}`);
  console.table(tableStats);

  return { backupPath, metaPath, stats: tableStats, checksum: compressedHash };
}

// Auto-run if invoked directly via CLI
if (process.argv[1] && process.argv[1].endsWith('backup_database.ts')) {
  runBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Backup failed:', err);
      process.exit(1);
    });
}
