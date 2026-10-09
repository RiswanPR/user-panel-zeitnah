import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface TargetOrgConfig {
  id: string;
  name: string;
  slug?: string;
}

export interface CandidatePostSummary {
  id: string;
  authorId: string;
  authorName?: string;
  currentOrganizationId: string | null;
  contentExcerpt: string;
  type: string;
  audience: string;
  isDeleted: boolean;
  createdAt: Date | string;
  mediaCount: number;
  isEligible: boolean;
  exclusionReason?: string;
  requiresReview?: boolean;
}

export interface PreviewResult {
  targetOrg: {
    id: string;
    name: string;
    slug?: string;
    status: string;
    verificationStatus: string;
    visibility: string;
    createdBy: string;
  };
  totalCandidatesReviewed: number;
  eligibleCount: number;
  excludedCount: number;
  ambiguousCount: number;
  eligiblePostIds: string[];
  candidates: CandidatePostSummary[];
}

export interface MigrationOptions {
  dryRun: boolean;
  targetOrg: TargetOrgConfig;
  approvedPostIds: string[];
  backupDir?: string;
  journalDir?: string;
}

export interface MigrationJournalEntry {
  migrationRunId: string;
  timestamp: string;
  postId: string;
  previousOrganizationId: string | null | undefined;
  wasOriginallyAbsent: boolean;
  newOrganizationId: string;
  backupFile: string;
  updateStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  verificationStatus: 'VERIFIED' | 'FAILED';
  error?: string;
}

export interface MigrationResult {
  runId: string;
  dryRun: boolean;
  targetOrgId: string;
  approvedCount: number;
  attemptedCount: number;
  successfulCount: number;
  failedCount: number;
  backupFile?: string;
  backupChecksum?: string;
  journalFile?: string;
  journal: MigrationJournalEntry[];
  errors: string[];
}

/**
 * Validates the target organization record in the database.
 */
export async function validateTargetOrganization(
  db: any,
  config: TargetOrgConfig,
): Promise<any> {
  const orgColl = db.collection('organizations');
  let orgDoc: any = null;

  // Search by ObjectId or string ID
  const { ObjectId } = require('mongodb');
  try {
    orgDoc = await orgColl.findOne({
      $or: [
        { _id: new ObjectId(config.id) },
        { _id: config.id as any },
      ],
    });
  } catch (err) {
    orgDoc = await orgColl.findOne({ _id: config.id });
  }

  if (!orgDoc) {
    throw new Error(
      `Target organization not found for ID: ${config.id}`,
    );
  }

  if (orgDoc.name !== config.name) {
    throw new Error(
      `Organization name mismatch: expected "${config.name}", found "${orgDoc.name}"`,
    );
  }

  if (config.slug && orgDoc.slug && orgDoc.slug !== config.slug) {
    throw new Error(
      `Organization slug mismatch: expected "${config.slug}", found "${orgDoc.slug}"`,
    );
  }

  if (orgDoc.status !== 'APPROVED') {
    throw new Error(
      `Target organization is not APPROVED (current status: "${orgDoc.status}")`,
    );
  }

  return orgDoc;
}

/**
 * Discovers and previews candidate posts for historical migration.
 */
export async function discoverAndPreviewCandidates(
  db: any,
  targetOrgConfig: TargetOrgConfig,
): Promise<PreviewResult> {
  const orgDoc = await validateTargetOrganization(db, targetOrgConfig);
  const targetOwnerId = orgDoc.createdBy ? String(orgDoc.createdBy) : null;

  const postColl = db.collection('community_posts');
  const userColl = db.collection('users');

  // Discover all active posts
  const posts = await postColl.find({ isDeleted: false }).sort({ createdAt: -1 }).toArray();

  const candidates: CandidatePostSummary[] = [];

  for (const post of posts) {
    let authorName = 'Unknown';
    if (post.authorId) {
      try {
        const { ObjectId } = require('mongodb');
        const user = await userColl.findOne(
          { $or: [{ _id: new ObjectId(post.authorId) }, { _id: post.authorId }] },
          { projection: { name: 1, role: 1 } },
        );
        if (user?.name) authorName = user.name;
      } catch (_) {}
    }

    const contentText = (post.content || '').trim();
    const excerpt = contentText.length > 80 ? contentText.substring(0, 80) + '...' : contentText;
    const mediaCount = Array.isArray(post.media) ? post.media.length : 0;

    let isEligible = false;
    let exclusionReason: string | undefined;
    let requiresReview = false;

    // Rule 1: Exclude if soft-deleted
    if (post.isDeleted === true) {
      exclusionReason = 'Post is soft-deleted (isDeleted: true)';
    }
    // Rule 2: Exclude if already has non-null organizationId
    else if (post.organizationId !== undefined && post.organizationId !== null) {
      exclusionReason = `Post already assigned to organizationId: ${post.organizationId}`;
    }
    // Rule 3: Exclude if author does not match target org creator/owner
    else if (targetOwnerId && String(post.authorId) !== targetOwnerId) {
      exclusionReason = `Author (${post.authorId} - ${authorName}) does not match target organization owner (${targetOwnerId})`;
    }
    // Rule 4: Exclude empty posts
    else if (!contentText) {
      exclusionReason = 'Post has empty content';
    }
    // Rule 5: Specific topic qualification
    else {
      const lower = contentText.toLowerCase();
      const isCourseAnnouncement =
        lower.includes('quantity surveying') ||
        lower.includes('qs') ||
        lower.includes('land surveying') ||
        lower.includes('gis') ||
        lower.includes('mep') ||
        lower.includes('intake') ||
        lower.includes('course provide');

      if (isCourseAnnouncement) {
        isEligible = true;
      } else if (lower.includes('team zeitnah') || lower.includes('proudly announcing our platform')) {
        requiresReview = true;
        exclusionReason = 'Flagged for manual review: platform welcome/announcement post rather than specific course intake';
      } else if (lower.includes('congrats') || lower.includes('jibin')) {
        exclusionReason = 'Personal congratulatory shoutout, not an official academy course announcement';
      } else if (lower.includes('road topo')) {
        exclusionReason = 'Technical survey file/document post without explicit course announcement copy';
      } else {
        exclusionReason = 'Content does not match academy course announcement criteria';
      }
    }

    candidates.push({
      id: String(post._id),
      authorId: String(post.authorId),
      authorName,
      currentOrganizationId: post.organizationId ? String(post.organizationId) : null,
      contentExcerpt: excerpt,
      type: post.type,
      audience: post.audience,
      isDeleted: Boolean(post.isDeleted),
      createdAt: post.createdAt,
      mediaCount,
      isEligible,
      exclusionReason,
      requiresReview,
    });
  }

  const eligiblePosts = candidates.filter((c) => c.isEligible);
  const excludedPosts = candidates.filter((c) => !c.isEligible && !c.requiresReview);
  const ambiguousPosts = candidates.filter((c) => c.requiresReview);

  return {
    targetOrg: {
      id: String(orgDoc._id),
      name: orgDoc.name,
      slug: orgDoc.slug,
      status: orgDoc.status,
      verificationStatus: orgDoc.verificationStatus,
      visibility: orgDoc.visibility,
      createdBy: String(orgDoc.createdBy),
    },
    totalCandidatesReviewed: candidates.length,
    eligibleCount: eligiblePosts.length,
    excludedCount: excludedPosts.length,
    ambiguousCount: ambiguousPosts.length,
    eligiblePostIds: eligiblePosts.map((c) => c.id),
    candidates,
  };
}

/**
 * Executes a controlled, reversible migration on explicitly approved post IDs.
 */
export async function executeControlledMigration(
  db: any,
  options: MigrationOptions,
): Promise<MigrationResult> {
  const { dryRun, targetOrg, approvedPostIds, backupDir, journalDir } = options;
  const runId = `migration_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();

  const result: MigrationResult = {
    runId,
    dryRun,
    targetOrgId: targetOrg.id,
    approvedCount: approvedPostIds.length,
    attemptedCount: 0,
    successfulCount: 0,
    failedCount: 0,
    journal: [],
    errors: [],
  };

  // Precondition: Allowlist must not be empty
  if (!approvedPostIds || approvedPostIds.length === 0) {
    const err = 'No post IDs in approved allowlist. Aborting.';
    result.errors.push(err);
    throw new Error(err);
  }

  // Precondition: Revalidate target organization
  const orgDoc = await validateTargetOrganization(db, targetOrg);
  const expectedOwnerId = orgDoc.createdBy ? String(orgDoc.createdBy) : null;

  const postColl = db.collection('community_posts');

  // Step 1: Pre-read and revalidate every single approved post
  const documentsToMigrate: any[] = [];
  for (const postId of approvedPostIds) {
    const post = await postColl.findOne({ _id: postId });
    if (!post) {
      const err = `Prevalidation failed: Post ID ${postId} not found in database.`;
      result.errors.push(err);
      throw new Error(err);
    }

    if (post.isDeleted !== false) {
      const err = `Prevalidation failed: Post ID ${postId} is soft-deleted (isDeleted: ${post.isDeleted}).`;
      result.errors.push(err);
      throw new Error(err);
    }

    if (post.organizationId !== undefined && post.organizationId !== null) {
      const err = `Prevalidation failed: Post ID ${postId} already has organizationId: ${post.organizationId}.`;
      result.errors.push(err);
      throw new Error(err);
    }

    if (expectedOwnerId && String(post.authorId) !== expectedOwnerId) {
      const err = `Prevalidation failed: Post ID ${postId} author (${post.authorId}) does not match expected owner (${expectedOwnerId}).`;
      result.errors.push(err);
      throw new Error(err);
    }

    documentsToMigrate.push(post);
  }

  // If DRY RUN: return simulation without writing or creating backups
  if (dryRun) {
    for (const post of documentsToMigrate) {
      result.attemptedCount++;
      result.successfulCount++;
      result.journal.push({
        migrationRunId: runId,
        timestamp,
        postId: String(post._id),
        previousOrganizationId: post.organizationId || null,
        wasOriginallyAbsent: !('organizationId' in post),
        newOrganizationId: targetOrg.id,
        backupFile: 'SIMULATED_DRY_RUN',
        updateStatus: 'SUCCESS',
        verificationStatus: 'VERIFIED',
      });
    }
    return result;
  }

  // Step 2: Create Full Document Backup before writing
  const effectiveBackupDir = backupDir || path.resolve(process.cwd(), 'backups/community_posts');
  if (!fs.existsSync(effectiveBackupDir)) {
    fs.mkdirSync(effectiveBackupDir, { recursive: true });
  }

  const backupFilename = `backup_posts_${runId}.json`;
  const backupFilePath = path.join(effectiveBackupDir, backupFilename);

  const backupData = {
    runId,
    timestamp,
    targetOrgId: targetOrg.id,
    targetOrgName: targetOrg.name,
    approvedPostIds,
    documentCount: documentsToMigrate.length,
    documents: documentsToMigrate,
  };

  const backupJsonString = JSON.stringify(backupData, null, 2);
  const checksum = createHash('sha256').update(backupJsonString).digest('hex');

  fs.writeFileSync(backupFilePath, backupJsonString, { mode: 0o600 });

  // Verify backup integrity
  const readBack = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  if (readBack.documents.length !== documentsToMigrate.length) {
    throw new Error('Backup verification failed: document count mismatch.');
  }

  result.backupFile = backupFilePath;
  result.backupChecksum = checksum;

  // Step 3: Conditional Updates
  for (const post of documentsToMigrate) {
    result.attemptedCount++;
    const postId = String(post._id);
    const wasOriginallyAbsent = !('organizationId' in post);
    const previousOrgId = post.organizationId !== undefined ? post.organizationId : null;

    try {
      const updateResult = await postColl.updateOne(
        {
          _id: postId,
          isDeleted: false,
          $or: [{ organizationId: { $exists: false } }, { organizationId: null }],
        },
        {
          $set: { organizationId: targetOrg.id },
        },
      );

      if (updateResult.modifiedCount !== 1) {
        throw new Error(
          `Conditional update failed for ${postId}: matched ${updateResult.matchedCount}, modified ${updateResult.modifiedCount}`,
        );
      }

      // Re-read document to verify
      const verifiedDoc = await postColl.findOne({ _id: postId });
      if (!verifiedDoc || verifiedDoc.organizationId !== targetOrg.id) {
        throw new Error(`Post-write verification failed for ${postId}`);
      }
      if (verifiedDoc.isDeleted !== false) {
        throw new Error(`Integrity violation: isDeleted altered for ${postId}`);
      }
      if (String(verifiedDoc.authorId) !== String(post.authorId)) {
        throw new Error(`Integrity violation: authorId altered for ${postId}`);
      }
      if (verifiedDoc.content !== post.content) {
        throw new Error(`Integrity violation: content altered for ${postId}`);
      }

      result.successfulCount++;
      result.journal.push({
        migrationRunId: runId,
        timestamp: new Date().toISOString(),
        postId,
        previousOrganizationId: previousOrgId,
        wasOriginallyAbsent,
        newOrganizationId: targetOrg.id,
        backupFile: backupFilePath,
        updateStatus: 'SUCCESS',
        verificationStatus: 'VERIFIED',
      });
    } catch (writeErr: any) {
      result.failedCount++;
      result.errors.push(writeErr.message);
      result.journal.push({
        migrationRunId: runId,
        timestamp: new Date().toISOString(),
        postId,
        previousOrganizationId: previousOrgId,
        wasOriginallyAbsent,
        newOrganizationId: targetOrg.id,
        backupFile: backupFilePath,
        updateStatus: 'FAILED',
        verificationStatus: 'FAILED',
        error: writeErr.message,
      });
      // Halt execution on failure
      break;
    }
  }

  // Step 4: Write Journal
  const effectiveJournalDir = journalDir || path.resolve(process.cwd(), 'backups/migration_journals');
  if (!fs.existsSync(effectiveJournalDir)) {
    fs.mkdirSync(effectiveJournalDir, { recursive: true });
  }
  const journalFilePath = path.join(effectiveJournalDir, `journal_${runId}.json`);
  fs.writeFileSync(journalFilePath, JSON.stringify(result, null, 2), { mode: 0o600 });
  result.journalFile = journalFilePath;

  return result;
}

/**
 * Rolls back migrated posts based on a verified backup and journal file.
 */
export async function executeRollback(
  db: any,
  backupFilePath: string,
  dryRun = false,
): Promise<{
  attempted: number;
  restored: number;
  failed: number;
  restoredPostIds: string[];
  errors: string[];
}> {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  const { targetOrgId, documents } = backupData;

  const postColl = db.collection('community_posts');
  const restoredPostIds: string[] = [];
  const errors: string[] = [];
  let attempted = 0;
  let restored = 0;
  let failed = 0;

  for (const originalDoc of documents) {
    attempted++;
    const postId = String(originalDoc._id);
    const wasOriginallyAbsent = !('organizationId' in originalDoc);

    const currentDoc = await postColl.findOne({ _id: postId });
    if (!currentDoc) {
      errors.push(`Rollback failed: Post ${postId} does not exist in database`);
      failed++;
      continue;
    }

    if (currentDoc.organizationId !== targetOrgId) {
      errors.push(
        `Rollback skipped for ${postId}: organizationId has changed since migration (current: ${currentDoc.organizationId}, expected: ${targetOrgId})`,
      );
      failed++;
      continue;
    }

    if (dryRun) {
      restored++;
      restoredPostIds.push(postId);
      continue;
    }

    try {
      const updateOp = wasOriginallyAbsent
        ? { $unset: { organizationId: '' } }
        : { $set: { organizationId: null } };

      const res = await postColl.updateOne({ _id: postId, organizationId: targetOrgId }, updateOp);
      if (res.modifiedCount !== 1) {
        throw new Error(`Rollback update failed for ${postId}`);
      }

      restored++;
      restoredPostIds.push(postId);
    } catch (err: any) {
      failed++;
      errors.push(err.message);
    }
  }

  return {
    attempted,
    restored,
    failed,
    restoredPostIds,
    errors,
  };
}
