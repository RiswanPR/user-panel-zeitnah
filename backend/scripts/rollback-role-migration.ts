import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI =
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/zeitnah-lms';
const DB_NAME = process.env.MONGO_DB_NAME || 'zeitnah-lms';

export interface ChangeManifestEntry {
  userId: any;
  oldRole: string;
  newRole: string;
  oldPrimaryRole: string;
  newPrimaryRole: string;
  reason: string;
  status?: 'APPLIED' | 'PENDING' | 'FAILED';
  error?: string;
}

export interface ChangeManifest {
  version: '1.0';
  migrationType: 'ROLE_STANDARDIZATION';
  timestamp: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL_FAILURE';
  database: string;
  backupCollection?: string;
  recordCount: number;
  appliedCount?: number;
  failedCount?: number;
  appliedUserIds?: string[];
  entries: ChangeManifestEntry[];
}

export interface RollbackResult {
  restoredCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Reverts role standardization updates strictly using a change manifest.
 *
 * Safeguards:
 * 1. Validates manifest schema and version.
 * 2. Deduplicates entries by userId.
 * 3. Optimistic Concurrency Check: Will NOT overwrite newer legitimate role
 *    changes made post-migration unless options.force is true.
 * 4. Only touches 'role' and 'primaryRole', preserving all other user fields.
 * 5. Handles missing users, pending entries, and partial migration states safely.
 */
export async function rollbackRoleMigration(
  db: any,
  manifest: ChangeManifest,
  options: { force?: boolean } = {},
): Promise<RollbackResult> {
  if (!manifest || !Array.isArray(manifest.entries)) {
    throw new Error('Invalid manifest: entries array is required.');
  }

  if (
    manifest.version !== '1.0' ||
    manifest.migrationType !== 'ROLE_STANDARDIZATION'
  ) {
    throw new Error(
      `Unsupported manifest version or type: ${manifest.version} / ${manifest.migrationType}`,
    );
  }

  const usersCollection = db.collection('users');
  let restoredCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  // Deduplicate entries by stringified userId (last entry takes precedence)
  const dedupedEntries = new Map<string, ChangeManifestEntry>();
  for (const entry of manifest.entries) {
    if (!entry.userId) {
      errors.push('Manifest entry missing userId; skipped.');
      continue;
    }
    dedupedEntries.set(String(entry.userId), entry);
  }

  for (const entry of dedupedEntries.values()) {
    // If entry status was recorded as PENDING during an interrupted run, skip rollback
    if (entry.status === 'PENDING') {
      skippedCount++;
      errors.push(
        `User ${entry.userId} was not modified (pending in manifest); rollback skipped.`,
      );
      continue;
    }

    // Inspect current record in database
    const currentDoc = await usersCollection.findOne({ _id: entry.userId });
    if (!currentDoc) {
      skippedCount++;
      errors.push(`User ${entry.userId} not found in database; skipped.`);
      continue;
    }

    if (!options.force) {
      // Optimistic concurrency: only rollback if current roles match the migration target
      const primaryMatches =
        !entry.newPrimaryRole ||
        currentDoc.primaryRole === entry.newPrimaryRole;
      const roleMatches =
        !entry.newRole || currentDoc.role === entry.newRole;

      if (!primaryMatches || !roleMatches) {
        skippedCount++;
        errors.push(
          `User ${entry.userId} modified post-migration (current primaryRole="${currentDoc.primaryRole}", role="${currentDoc.role}"). Rollback skipped to prevent overwriting newer changes.`,
        );
        continue;
      }
    }

    const updateDoc: any = {};
    if (entry.oldRole !== undefined) {
      updateDoc.role = entry.oldRole;
    }
    if (entry.oldPrimaryRole !== undefined) {
      updateDoc.primaryRole = entry.oldPrimaryRole;
    }

    if (Object.keys(updateDoc).length > 0) {
      const res = await usersCollection.updateOne(
        { _id: entry.userId },
        { $set: updateDoc },
      );
      if (res.modifiedCount > 0) {
        restoredCount++;
      }
    }
  }

  return { restoredCount, skippedCount, errors };
}

async function runRollbackCLI() {
  const manifestPath = process.argv[2];
  const force = process.argv.includes('--force');

  if (!manifestPath) {
    console.error(
      'Usage: ts-node scripts/rollback-role-migration.ts <path-to-manifest.json> [--force]',
    );
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), manifestPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Manifest file not found: ${fullPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(fullPath, 'utf8');
  const manifest: ChangeManifest = JSON.parse(raw);

  console.log('\n========================================================');
  console.log('       ZEITNAH LMS — ROLE MIGRATION ROLLBACK           ');
  console.log('========================================================');
  console.log(`Database         : ${DB_NAME}`);
  console.log(`Manifest File    : ${manifestPath}`);
  console.log(`Timestamp        : ${manifest.timestamp}`);
  console.log(`Entries to Revert: ${manifest.entries.length}`);
  console.log(`Force Override   : ${force ? 'YES' : 'NO (Safe Guard Active)'}`);

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const result = await rollbackRoleMigration(db, manifest, { force });

    console.log(`\n✓ Restored : ${result.restoredCount} record(s).`);
    if (result.skippedCount > 0) {
      console.log(`⚠️ Skipped  : ${result.skippedCount} record(s).`);
    }
    if (result.errors.length > 0) {
      console.log('\nAudit Notes / Warnings:');
      for (const err of result.errors) {
        console.log(`  - ${err}`);
      }
    }
    console.log('========================================================\n');
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  runRollbackCLI().catch((err) => {
    console.error('Fatal Rollback Error:', err);
    process.exit(1);
  });
}
