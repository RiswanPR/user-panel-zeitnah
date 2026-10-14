import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  isCanonicalCommunityRole,
  CANONICAL_COMMUNITY_ROLES,
} from '../src/common/utils/role-normalization.util';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI =
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/zeitnah-lms';
const DB_NAME = process.env.MONGO_DB_NAME || 'zeitnah-lms';

export interface ExecutionModeValidationResult {
  isDryRun: boolean;
  isLive: boolean;
  targetDb: string;
  environment: string;
  sanitizedHost: string;
}

export function parseSanitizedHost(mongoUri: string): {
  isLocal: boolean;
  sanitizedHost: string;
} {
  try {
    const withoutProtocol = mongoUri.replace(/^mongodb(\+srv)?:\/\//, '');
    const withoutAuth = withoutProtocol.replace(/^[^@]+@/, '');
    const hostPart = withoutAuth.split('/')[0] || 'unknown';
    const isLocal =
      hostPart.includes('localhost') ||
      hostPart.includes('127.0.0.1') ||
      hostPart.includes('0.0.0.0');
    return { isLocal, sanitizedHost: hostPart };
  } catch {
    return { isLocal: false, sanitizedHost: 'unparseable-host' };
  }
}

export function validateMigrationExecutionMode(
  args: string[],
  configuredDbName: string,
  mongoUri: string = MONGO_URI,
): ExecutionModeValidationResult {
  const hasLive = args.includes('--live');
  const hasDryRun = args.includes('--dry-run');

  if (hasLive && hasDryRun) {
    throw new Error(
      'SAFETY CONFLICT: Cannot specify both --live and --dry-run simultaneously.',
    );
  }

  const { isLocal, sanitizedHost } = parseSanitizedHost(mongoUri);

  if (hasLive) {
    // 1. Mandatory --target=<DB_NAME>
    const targetArg = args.find((a) => a.startsWith('--target='));
    const confirmedTarget = targetArg ? targetArg.split('=')[1]?.trim() : null;

    if (!confirmedTarget) {
      throw new Error(
        `SAFETY LOCK: Live migration requires explicit target verification. You must supply --target=${configuredDbName} to confirm write operations.`,
      );
    }

    if (confirmedTarget !== configuredDbName) {
      throw new Error(
        `TARGET MISMATCH: Specified --target="${confirmedTarget}" does not match configured target database "${configuredDbName}". Aborting.`,
      );
    }

    // 2. Mandatory --env=<staging|local>
    const envArg = args.find((a) => a.startsWith('--env='));
    const confirmedEnv = envArg ? envArg.split('=')[1]?.trim().toLowerCase() : null;

    if (!confirmedEnv) {
      throw new Error(
        'SAFETY LOCK: Live migration requires explicit environment declaration. Pass --env=staging (or --env=local for local development). Aborting.',
      );
    }

    if (confirmedEnv === 'production') {
      throw new Error(
        'PRODUCTION SAFETY LOCK: Direct live execution against production is prohibited in this script. Aborting.',
      );
    }

    // 3. Strict host vs environment matching
    if (confirmedEnv === 'staging') {
      if (isLocal) {
        throw new Error(
          `ENVIRONMENT MISMATCH: Declared --env=staging, but configured database host is local (${sanitizedHost}). Refusing live execution against mismatched target.`,
        );
      }
      const hostArg = args.find((a) => a.startsWith('--confirm-host='));
      const confirmedHost = hostArg ? hostArg.split('=')[1]?.trim() : null;
      if (!confirmedHost || !sanitizedHost.toLowerCase().includes(confirmedHost.toLowerCase())) {
        throw new Error(
          `HOST SAFETY LOCK: Staging migration requires explicit host confirmation. Pass --confirm-host=<host_substring> matching the sanitized staging host.`,
        );
      }
    } else if (confirmedEnv === 'local') {
      if (!isLocal) {
        throw new Error(
          `ENVIRONMENT MISMATCH: Declared --env=local, but configured database host is remote (${sanitizedHost}). Refusing live execution.`,
        );
      }
    } else {
      throw new Error(
        `UNRECOGNIZED ENVIRONMENT: Declared environment "${confirmedEnv}" is not recognized. Must be "staging" or "local".`,
      );
    }

    return {
      isDryRun: false,
      isLive: true,
      targetDb: configuredDbName,
      environment: confirmedEnv,
      sanitizedHost,
    };
  }

  return {
    isDryRun: true,
    isLive: false,
    targetDb: configuredDbName,
    environment: 'dry-run',
    sanitizedHost,
  };
}

export interface RoleMigrationPlan {
  userId: any;
  emailMasked: string;
  username?: string;
  currentRole: string;
  targetRole: string;
  currentPrimaryRole: string;
  targetPrimaryRole: string;
  status: 'READY' | 'CONFLICT_REQUIRES_REVIEW';
  reason: string;
  hasMentorshipData?: boolean;
}

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
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL_FAILURE';
  database: string;
  backupCollection?: string;
  recordCount: number;
  appliedCount?: number;
  failedCount?: number;
  appliedUserIds?: string[];
  entries: ChangeManifestEntry[];
}

/**
 * Masks an email address for privacy and log safety.
 * e.g., 'john.doe@zeitnah.com' -> 'j***e@zeitnah.com'
 */
export function maskEmail(email?: string): string {
  if (!email || typeof email !== 'string') return 'anonymous@masked';
  const parts = email.split('@');
  if (parts.length !== 2) return 'invalid@masked';
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Authoritative migration planner for Zeitnah canonical roles.
 *
 * Conflict Handling Guarantees:
 * 1. Valid canonical community roles are preserved.
 * 2. Legacy FOUNDER -> RECRUITER (READY).
 * 3. Legacy MENTOR -> PROFESSIONAL (READY). Mentorship data flagged as preserved.
 * 4. System administrators are never downgraded.
 * 5. Unknown/malformed primary roles are NEVER silently converted to STUDENT.
 *    They are flagged as CONFLICT_REQUIRES_REVIEW.
 * 6. Educator role is never inferred from an unverified legacy field without review.
 * 7. Mentorship preferences, availability, organization memberships, and ownership are untouched.
 * 8. Administrator role (ADMIN) is NEVER granted based solely on an untrusted or unverified legacy role field.
 *    Existing verified administrators (primaryRole: 'ADMIN') are preserved; conflicting or unverified admin records
 *    are flagged as CONFLICT_REQUIRES_REVIEW.
 */
export function planUserRoleMigration(user: any): RoleMigrationPlan | null {
  const rawRole = String(user.role || '').trim();
  const rawPrimaryRole = String(user.primaryRole || '').trim();

  const currentRole = rawRole.toLowerCase();
  const currentPrimaryRole = rawPrimaryRole.toUpperCase();

  let targetRole = currentRole;
  let targetPrimaryRole = currentPrimaryRole;
  const reasons: string[] = [];
  let status: 'READY' | 'CONFLICT_REQUIRES_REVIEW' = 'READY';

  // Check administrator accounts
  const hasAdminRole = currentRole === 'admin' || currentRole === 'superuser';
  const hasAdminPrimaryRole = currentPrimaryRole === 'ADMIN';

  if (hasAdminPrimaryRole) {
    // Trusted verified administrator: preserve ADMIN primaryRole; align legacy role if needed
    if (!hasAdminRole) {
      targetRole = 'admin';
      reasons.push('ADMIN_ROLE_ALIGNMENT');
    }
  } else if (hasAdminRole) {
    // Untrusted or legacy role: 'admin' without trusted primaryRole: 'ADMIN'
    // Safety Rule: NEVER grant ADMIN based solely on an untrusted or legacy role field.
    status = 'CONFLICT_REQUIRES_REVIEW';
    if (currentPrimaryRole) {
      reasons.push(
        `CONFLICT_UNVERIFIED_ADMIN_ROLE_WITH_${currentPrimaryRole}_PRIMARY`,
      );
    } else {
      reasons.push('CONFLICT_ADMIN_ROLE_REQUIRES_VERIFICATION');
    }
  } else {
    // 1. Evaluate primaryRole
    if (currentPrimaryRole === 'FOUNDER') {
      targetPrimaryRole = 'RECRUITER';
      reasons.push('LEGACY_FOUNDER_TO_RECRUITER');
    } else if (currentPrimaryRole === 'MENTOR') {
      targetPrimaryRole = 'PROFESSIONAL';
      reasons.push('LEGACY_MENTOR_TO_PROFESSIONAL');
    } else if (isCanonicalCommunityRole(currentPrimaryRole)) {
      // Valid canonical community role: STUDENT, PROFESSIONAL, RECRUITER, EDUCATOR
      targetPrimaryRole = currentPrimaryRole;
    } else if (!currentPrimaryRole) {
      // Missing primaryRole: safely infer common unambiguous roles or flag conflicts
      if (currentRole === 'recruiter' || currentRole === 'founder') {
        targetPrimaryRole = 'RECRUITER';
        reasons.push('INFER_RECRUITER_FROM_LEGACY_ROLE');
      } else if (currentRole === 'mentor' || currentRole === 'professional') {
        targetPrimaryRole = 'PROFESSIONAL';
        reasons.push('INFER_PROFESSIONAL_FROM_LEGACY_ROLE');
      } else if (currentRole === 'student') {
        targetPrimaryRole = 'STUDENT';
        reasons.push('INFER_STUDENT_FROM_LEGACY_ROLE');
      } else if (currentRole === 'teacher' || currentRole === 'educator') {
        // Educator requires administrator authorization; flag for review
        status = 'CONFLICT_REQUIRES_REVIEW';
        reasons.push('CONFLICT_EDUCATOR_REQUIRES_ADMIN_VERIFICATION');
      } else {
        status = 'CONFLICT_REQUIRES_REVIEW';
        reasons.push('CONFLICT_MISSING_PRIMARY_AND_UNKNOWN_ROLE');
      }
    } else {
      // Unknown / malformed primaryRole string (e.g. 'CEO', 'SUPERMAN', 'INVALID')
      // Rule: Never silently convert to STUDENT. Flag for review!
      status = 'CONFLICT_REQUIRES_REVIEW';
      reasons.push(`CONFLICT_MALFORMED_PRIMARY_ROLE_${currentPrimaryRole}`);
    }

    // 2. Evaluate legacy LMS role enum (valid: student, teacher, recruiter, admin)
    if (currentRole === 'educator') {
      if (targetPrimaryRole === 'EDUCATOR') {
        targetRole = 'teacher';
        reasons.push('LEGACY_EDUCATOR_ROLE_TO_TEACHER');
      } else {
        status = 'CONFLICT_REQUIRES_REVIEW';
        reasons.push('CONFLICT_ROLE_EDUCATOR_BUT_PRIMARY_NOT_EDUCATOR');
      }
    } else if (currentRole === 'founder') {
      targetRole = 'recruiter';
      reasons.push('LEGACY_FOUNDER_ROLE_TO_RECRUITER');
    } else if (currentRole === 'mentor' || currentRole === 'professional') {
      targetRole = 'student';
      reasons.push('LEGACY_ROLE_TO_STUDENT');
    } else if (
      currentRole &&
      !['student', 'teacher', 'recruiter', 'admin'].includes(currentRole)
    ) {
      status = 'CONFLICT_REQUIRES_REVIEW';
      reasons.push(`CONFLICT_UNRECOGNIZED_LEGACY_ROLE_${currentRole}`);
    }
  }

  if (
    status === 'CONFLICT_REQUIRES_REVIEW' ||
    targetRole !== currentRole ||
    targetPrimaryRole !== currentPrimaryRole
  ) {
    const hasMentorship = Boolean(
      user.mentorship?.isAvailableForMentorship ||
        (Array.isArray(user.mentorship?.topics) &&
          user.mentorship.topics.length > 0),
    );

    return {
      userId: user._id,
      emailMasked: maskEmail(user.email),
      username: user.username,
      currentRole,
      targetRole,
      currentPrimaryRole,
      targetPrimaryRole,
      status,
      reason: reasons.join(', '),
      hasMentorshipData: hasMentorship,
    };
  }

  return null;
}

/**
 * Creates an atomic backup collection clone and verifies document counts.
 *
 * Operational & Concurrency Safeguards:
 * 1. Checks if backupCollectionName already exists; appends random hex suffix to prevent accidental overwrite.
 * 2. Uses aggregation pipeline $out for point-in-time snapshotting.
 * 3. Compares post-snapshot document count with pre-flight source count.
 *    Aborts immediately if counts do not match.
 * 4. Operational Limitation: In MongoDB, $out replaces target collection atomically,
 *    but concurrent user writes during aggregation pipeline execution can produce count mismatches.
 *    Live execution should run in a quiet maintenance window.
 */
export async function createMigrationBackup(
  db: any,
  sourceCollectionName = 'users',
): Promise<{ backupCollectionName: string; snapshotCount: number }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let backupCollectionName = `${sourceCollectionName}_backup_role_standardization_${timestamp}`;

  // Prevent accidental overwrite: guarantee unique backup collection name
  let collisionAttempts = 0;
  while (
    await db.listCollections({ name: backupCollectionName }).hasNext()
  ) {
    collisionAttempts++;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    backupCollectionName = `${sourceCollectionName}_backup_role_standardization_${timestamp}_${randomSuffix}`;
    if (collisionAttempts > 10) {
      throw new Error(
        `BACKUP SAFETY ERROR: Unable to generate unique backup collection name after 10 attempts.`,
      );
    }
  }

  const sourceCollection = db.collection(sourceCollectionName);
  const sourceCount = await sourceCollection.countDocuments();

  // Perform point-in-time snapshot via aggregation $out
  await sourceCollection.aggregate([{ $out: backupCollectionName }]).toArray();

  const backupCollection = db.collection(backupCollectionName);
  const snapshotCount = await backupCollection.countDocuments();

  if (snapshotCount !== sourceCount) {
    throw new Error(
      `BACKUP VERIFICATION FAILED: Source collection has ${sourceCount} records, but backup has ${snapshotCount}. Aborting migration.`,
    );
  }

  // Verify document identities and key role fields across the FULL dataset (not just samples)
  if (sourceCount > 0 && typeof sourceCollection.find === 'function') {
    const cursor = sourceCollection.find(
      {},
      { projection: { _id: 1, role: 1, primaryRole: 1 } },
    );
    const allSourceDocs =
      cursor && typeof cursor.toArray === 'function'
        ? await cursor.toArray()
        : Array.isArray(cursor)
          ? cursor
          : [];

    for (const doc of allSourceDocs) {
      const backupDoc = await backupCollection.findOne({ _id: doc._id });
      if (!backupDoc) {
        throw new Error(
          `BACKUP INTEGRITY FAILED: Document _id "${doc._id}" missing in backup snapshot "${backupCollectionName}". Aborting migration.`,
        );
      }
      if (
        backupDoc.role !== doc.role ||
        backupDoc.primaryRole !== doc.primaryRole
      ) {
        throw new Error(
          `BACKUP INTEGRITY FAILED: Critical field mismatch for document _id "${doc._id}" between source and backup snapshot. Aborting migration.`,
        );
      }
    }
  }

  // Post-verification write quiescence validation
  const postVerificationSourceCount = await sourceCollection.countDocuments();
  if (postVerificationSourceCount !== sourceCount) {
    throw new Error(
      `BACKUP WRITE QUIESCENCE VIOLATION: Source collection count changed from ${sourceCount} to ${postVerificationSourceCount} during backup verification. Aborting migration to guarantee data consistency.`,
    );
  }

  return { backupCollectionName, snapshotCount };
}

/**
 * Generates an immutable, redact-safe change manifest.
 */
export function generateChangeManifest(
  plans: RoleMigrationPlan[],
  dbName: string,
  backupCollectionName?: string,
): ChangeManifest {
  const readyEntries: ChangeManifestEntry[] = plans
    .filter((p) => p.status === 'READY')
    .map((p) => ({
      userId: p.userId,
      oldRole: p.currentRole,
      newRole: p.targetRole,
      oldPrimaryRole: p.currentPrimaryRole,
      newPrimaryRole: p.targetPrimaryRole,
      reason: p.reason,
      status: 'PENDING' as const,
    }));

  return {
    version: '1.0',
    migrationType: 'ROLE_STANDARDIZATION',
    timestamp: new Date().toISOString(),
    status: 'PENDING',
    database: dbName,
    backupCollection: backupCollectionName,
    recordCount: readyEntries.length,
    appliedCount: 0,
    failedCount: 0,
    appliedUserIds: [],
    entries: readyEntries,
  };
}

/**
 * Constructs the optimistic concurrency query filter and minimal update payload.
 * Strictly isolates updates to `role` and `primaryRole`, guaranteeing no unrelated
 * user data (profile, bio, mentorship, skills, etc.) is overwritten or dropped.
 */
export function buildUserRoleUpdateDoc(plan: RoleMigrationPlan): {
  filter: { _id: any; role: string; primaryRole: string };
  update: { $set: { role?: string; primaryRole?: string } };
} {
  const setDoc: { role?: string; primaryRole?: string } = {};
  if (plan.targetRole !== plan.currentRole) {
    setDoc.role = plan.targetRole;
  }
  if (plan.targetPrimaryRole !== plan.currentPrimaryRole) {
    setDoc.primaryRole = plan.targetPrimaryRole;
  }

  return {
    filter: {
      _id: plan.userId,
      role: plan.currentRole,
      primaryRole: plan.currentPrimaryRole,
    },
    update: { $set: setDoc },
  };
}

async function runRoleMigration() {
  const executionConfig = validateMigrationExecutionMode(
    process.argv.slice(2),
    DB_NAME,
  );
  const isDryRun = executionConfig.isDryRun;

  console.log('\n========================================================');
  console.log('       ZEITNAH LMS — ROLE CONTRACT MIGRATION           ');
  console.log('========================================================');
  console.log(`Target Database: ${DB_NAME}`);
  console.log(
    `Execution Mode : ${isDryRun ? 'DRY-RUN (Simulated, No Writes)' : 'LIVE EXECUTION'}`,
  );
  if (isDryRun && !process.argv.includes('--dry-run')) {
    console.log(
      'SAFETY NOTICE  : Defaulting to safe DRY-RUN. Supply --live --target=<db> to commit changes.',
    );
  }
  console.log('Connecting to MongoDB...\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    const totalUsers = await usersCollection.countDocuments();
    const allUsers = await usersCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            email: 1,
            username: 1,
            role: 1,
            primaryRole: 1,
            mentorship: 1,
          },
        },
      )
      .toArray();

    console.log(`Scanned ${totalUsers} total user records in database.`);

    const plannedMigrations: RoleMigrationPlan[] = [];

    for (const user of allUsers) {
      const plan = planUserRoleMigration(user);
      if (plan) {
        plannedMigrations.push(plan);
      }
    }

    const readyPlans = plannedMigrations.filter((p) => p.status === 'READY');
    const conflictPlans = plannedMigrations.filter(
      (p) => p.status === 'CONFLICT_REQUIRES_REVIEW',
    );

    console.log(
      `Found ${plannedMigrations.length} accounts evaluated (${readyPlans.length} ready, ${conflictPlans.length} conflicts).\n`,
    );

    if (conflictPlans.length > 0) {
      console.log('⚠️  CONFLICTS REQUIRING MANUAL REVIEW:');
      for (const plan of conflictPlans) {
        console.log(
          `  - [CONFLICT] User: ${plan.emailMasked} (@${plan.username || 'unknown'}) | ` +
            `primaryRole: "${plan.currentPrimaryRole}" | ` +
            `role: "${plan.currentRole}" | ` +
            `Reason: ${plan.reason}`,
        );
      }
      console.log('');
    }

    if (readyPlans.length > 0) {
      console.log('Planned Modifications (Ready):');
      for (const plan of readyPlans) {
        console.log(
          `  - [READY] User: ${plan.emailMasked} (@${plan.username || 'unknown'}) | ` +
            `primaryRole: "${plan.currentPrimaryRole}" -> "${plan.targetPrimaryRole}" | ` +
            `role: "${plan.currentRole}" -> "${plan.targetRole}" | ` +
            `Reason: ${plan.reason} | ` +
            `Mentorship Preserved: ${plan.hasMentorshipData ? 'YES (Active Data)' : 'N/A'}`,
        );
      }
    }

    if (!isDryRun && readyPlans.length > 0) {
      console.log('\n[PRE-FLIGHT] Creating atomic backup snapshot...');
      const backup = await createMigrationBackup(db);
      console.log(
        `✓ Backup verified: ${backup.backupCollectionName} (${backup.snapshotCount} records).`,
      );

      // Persist manifest BEFORE updates begin
      const manifest = generateChangeManifest(
        readyPlans,
        DB_NAME,
        backup.backupCollectionName,
      );
      manifest.status = 'IN_PROGRESS';

      const manifestDir = path.resolve(process.cwd(), 'backups');
      if (!fs.existsSync(manifestDir)) {
        fs.mkdirSync(manifestDir, { recursive: true });
      }
      const manifestPath = path.join(
        manifestDir,
        `manifest-role-migration-${Date.now()}.json`,
      );
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      console.log(`✓ Pre-flight change manifest persisted: ${manifestPath}`);

      console.log('\nApplying updates to MongoDB...');
      let updatedCount = 0;
      const appliedUserIds: string[] = [];
      try {
        for (const plan of readyPlans) {
          const entry = manifest.entries.find(
            (e) => String(e.userId) === String(plan.userId),
          );
          try {
            const { filter, update } = buildUserRoleUpdateDoc(plan);
            const res = await usersCollection.updateOne(filter, update);
            if (res.modifiedCount > 0) {
              updatedCount++;
              appliedUserIds.push(String(plan.userId));
              if (entry) entry.status = 'APPLIED';
            } else if (res.matchedCount === 0) {
              throw new Error(
                `CONCURRENT MUTATION DETECTED: User ${plan.emailMasked} (_id: ${plan.userId}) was modified concurrently since migration planning. Aborting migration to protect data integrity.`,
              );
            }
          } catch (updateErr: any) {
            if (entry) {
              entry.status = 'FAILED';
              entry.error = updateErr.message;
            }
            throw updateErr;
          }
        }
        manifest.status = 'COMPLETED';
        manifest.appliedCount = updatedCount;
        manifest.failedCount = 0;
        manifest.appliedUserIds = appliedUserIds;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.log(`✓ Successfully updated ${updatedCount} records.`);
      } catch (err: any) {
        manifest.status = 'PARTIAL_FAILURE';
        manifest.appliedCount = updatedCount;
        manifest.failedCount = readyPlans.length - updatedCount;
        manifest.appliedUserIds = appliedUserIds;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.error(
          `❌ Migration interrupted after ${updatedCount} records. Manifest updated: ${manifestPath}`,
        );
        throw err;
      }
    } else if (isDryRun && (readyPlans.length > 0 || conflictPlans.length > 0)) {
      console.log(
        '\n[DRY RUN] No changes were written. Review conflicts above. Rerun with --live to apply ready records.',
      );
    } else {
      console.log(
        '\nAll user records are already compliant with the canonical role contract.',
      );
    }

    console.log('========================================================\n');
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  runRoleMigration().catch((err) => {
    console.error('Fatal Role Migration Error:', err);
    process.exit(1);
  });
}
