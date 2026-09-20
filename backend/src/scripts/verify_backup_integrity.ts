import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  tableCounts: Record<string, number>;
  manifest: any;
}

export async function verifyBackup(specifiedBackupPath?: string): Promise<VerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let targetBackupPath = specifiedBackupPath;

  if (!targetBackupPath) {
    if (!fs.existsSync(BACKUPS_DIR)) {
      throw new Error(`Backups directory does not exist at: ${BACKUPS_DIR}`);
    }

    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith('.json.gz'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error(`No backup archives (.json.gz) found in ${BACKUPS_DIR}`);
    }

    targetBackupPath = path.join(BACKUPS_DIR, files[0]);
  }

  console.log(`🔍 Verifying backup archive: ${targetBackupPath}`);

  if (!fs.existsSync(targetBackupPath)) {
    throw new Error(`Target backup file not found: ${targetBackupPath}`);
  }

  const metaPath = targetBackupPath.replace(/\.json\.gz$/, '.meta.json');
  if (!fs.existsSync(metaPath)) {
    errors.push(`Missing companion manifest file: ${metaPath}`);
  }

  let manifest: any = null;
  if (fs.existsSync(metaPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (e: any) {
      errors.push(`Failed to parse metadata JSON: ${e.message}`);
    }
  }

  // 1. Verify Compressed SHA-256
  const compressedBuffer = fs.readFileSync(targetBackupPath);
  const actualCompressedHash = crypto.createHash('sha256').update(compressedBuffer).digest('hex');

  if (manifest && manifest.compressedSha256) {
    if (actualCompressedHash !== manifest.compressedSha256) {
      errors.push(`Compressed SHA-256 mismatch! Expected: ${manifest.compressedSha256}, Got: ${actualCompressedHash}`);
    } else {
      console.log(`✅ Compressed archive SHA-256 verified: ${actualCompressedHash}`);
    }
  }

  // 2. Decompress
  let decompressedString: string;
  try {
    const decompressedBuffer = zlib.gunzipSync(compressedBuffer);
    decompressedString = decompressedBuffer.toString('utf-8');
  } catch (e: any) {
    errors.push(`Gzip decompression failed: ${e.message}`);
    return { valid: false, errors, warnings, tableCounts: {}, manifest };
  }

  // 3. Verify Decompressed SHA-256
  const actualRawHash = crypto.createHash('sha256').update(decompressedString).digest('hex');
  if (manifest && manifest.rawSha256) {
    if (actualRawHash !== manifest.rawSha256) {
      errors.push(`Decompressed payload SHA-256 mismatch! Expected: ${manifest.rawSha256}, Got: ${actualRawHash}`);
    } else {
      console.log(`✅ Decompressed payload SHA-256 verified: ${actualRawHash}`);
    }
  }

  // 4. Parse JSON & Validate Table Structure
  let parsedData: Record<string, any[]>;
  try {
    parsedData = JSON.parse(decompressedString);
  } catch (e: any) {
    errors.push(`Failed to parse decompressed JSON payload: ${e.message}`);
    return { valid: false, errors, warnings, tableCounts: {}, manifest };
  }

  const tableCounts: Record<string, number> = {};
  for (const [table, rows] of Object.entries(parsedData)) {
    tableCounts[table] = Array.isArray(rows) ? rows.length : -1;
    if (!Array.isArray(rows)) {
      errors.push(`Table ${table} is not an array of rows!`);
    } else if (manifest && manifest.tableStats && manifest.tableStats[table] !== undefined) {
      if (rows.length !== manifest.tableStats[table]) {
        errors.push(`Table ${table} count mismatch: manifest expected ${manifest.tableStats[table]}, but parsed ${rows.length}`);
      }
    }
  }

  // 5. Referential Integrity & Invariant Checks
  const messes = parsedData.messes || [];
  const messIds = new Set(messes.map((m: any) => m.id));

  const members = parsedData.members || [];
  for (const member of members) {
    if (!messIds.has(member.messId)) {
      errors.push(`Member ${member.id} references missing messId ${member.messId}`);
    }
  }

  const expenses = parsedData.expenses || [];
  for (const exp of expenses) {
    if (!messIds.has(exp.messId)) {
      errors.push(`Expense ${exp.id} references missing messId ${exp.messId}`);
    }
    if (Number(exp.amount) <= 0) {
      warnings.push(`Expense ${exp.id} has non-positive amount: ${exp.amount}`);
    }
  }

  const ledgerEntries = parsedData.ledgerEntries || [];
  for (const entry of ledgerEntries) {
    if (!messIds.has(entry.messId)) {
      errors.push(`LedgerEntry ${entry.id} references missing messId ${entry.messId}`);
    }
    if (Number(entry.amount) <= 0) {
      errors.push(`LedgerEntry ${entry.id} has non-positive amount: ${entry.amount}`);
    }
  }

  const isValid = errors.length === 0;

  console.log('\n================ BACKUP VERIFICATION REPORT ================');
  console.log(`Status: ${isValid ? '🟢 PASS (INTEGRITY CONFIRMED)' : '🔴 FAIL (CORRUPTED / INVALID)'}`);
  console.log(`Tables Verified: ${Object.keys(tableCounts).length}`);
  console.log(`Total Errors: ${errors.length}`);
  console.log(`Total Warnings: ${warnings.length}`);
  if (errors.length > 0) {
    console.error('Errors found:');
    errors.forEach((e) => console.error(`  - ${e}`));
  }
  if (warnings.length > 0) {
    console.warn('Warnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }
  console.log('=============================================================\n');

  return {
    valid: isValid,
    errors,
    warnings,
    tableCounts,
    manifest,
  };
}

// Auto-run if invoked directly via CLI
if (process.argv[1] && process.argv[1].endsWith('verify_backup_integrity.ts')) {
  verifyBackup(process.argv[2])
    .then((result) => {
      if (!result.valid) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Verification script crashed:', err);
      process.exit(1);
    });
}
