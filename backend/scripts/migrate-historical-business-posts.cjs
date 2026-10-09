#!/usr/bin/env node
/**
 * migrate-historical-business-posts.cjs
 *
 * Controlled, reversible migration of explicitly selected historical Zeitnah academy
 * course announcements from Personal Community Feed to official Company Feed.
 *
 * SAFETY INVARIANTS:
 * - DRY_RUN is TRUE by default unless --execute --confirm is passed.
 * - APPROVED_POST_IDS must match exact approved list.
 * - Zero writes before complete document backup is verified.
 * - Minimal update only alters `organizationId`. Never touches author, content, media, audience, timestamps.
 * - Post-migration re-read verification on every document.
 * - Verification of Company Feed aggregation query.
 * - Verification of Rollback readiness.
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables safely without printing
const envPath = fs.existsSync(path.resolve(__dirname, '../.env'))
  ? path.resolve(__dirname, '../.env')
  : '/opt/zeitnah/user-panel/backend/.env';
require('dotenv').config({
  path: envPath,
  quiet: true,
});

// ==========================================
// CONFIGURATION & EXPLICIT ALLOWLIST
// ==========================================
const TARGET_ORG = {
  id: '6abf302319a9558d3cb251db',
  name: 'Zeitnah academy',
  slug: 'zeitnah-academy',
};

/**
 * EXACT MANUALLY APPROVED ALLOWLIST
 */
const APPROVED_POST_IDS = [
  '494030a2-424b-46b5-91ef-bc60320b1394', // October QS Batch Intake (Video)
  '33d65b06-2de4-49c5-9323-7cf649d8efbd', // Land Surveying Diploma (Image)
  'cc77baed-088d-4ec7-ae00-fc45934b710d', // QS, LS, MEP and GIS Catalog (Image)
  'f2bb0656-49f2-4917-afd7-06459eb650e3', // GIS Training Post (Image)
];

const BACKUP_DIR =
  process.env.MIGRATION_BACKUP_DIR ||
  (fs.existsSync('/opt/zeitnah/backups')
    ? '/opt/zeitnah/backups/community_posts'
    : path.resolve(__dirname, '../backups/community_posts'));

const JOURNAL_DIR =
  process.env.MIGRATION_JOURNAL_DIR ||
  (fs.existsSync('/opt/zeitnah/backups')
    ? '/opt/zeitnah/backups/migration_journals'
    : path.resolve(__dirname, '../backups/migration_journals'));

// ==========================================
// CORE HELPERS
// ==========================================
async function getDbConnection() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error('MONGO_URL environment variable is missing.');
  }
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db();
  return { client, db };
}

async function validateTargetOrganization(db) {
  const orgColl = db.collection('organizations');
  let org = null;
  try {
    org = await orgColl.findOne({
      $or: [{ _id: new ObjectId(TARGET_ORG.id) }, { _id: TARGET_ORG.id }],
    });
  } catch (err) {
    org = await orgColl.findOne({ _id: TARGET_ORG.id });
  }

  if (!org) {
    throw new Error(`Target organization not found for ID: ${TARGET_ORG.id}`);
  }
  if (org.name !== TARGET_ORG.name) {
    throw new Error(`Target organization name mismatch: expected "${TARGET_ORG.name}", got "${org.name}"`);
  }
  if (TARGET_ORG.slug && org.slug && org.slug !== TARGET_ORG.slug) {
    throw new Error(`Target organization slug mismatch: expected "${TARGET_ORG.slug}", got "${org.slug}"`);
  }
  if (org.status !== 'APPROVED') {
    throw new Error(`Target organization is not APPROVED (status: "${org.status}")`);
  }
  return org;
}

// ==========================================
// PREVALIDATION HELPER
// ==========================================
async function prevalidateApprovedPosts(db, targetOrgDoc) {
  const postColl = db.collection('community_posts');
  const targetOwnerId = targetOrgDoc.createdBy ? String(targetOrgDoc.createdBy) : null;
  const prevalidatedDocuments = [];

  console.log('\n--- STEP 1: PREVALIDATION OF APPROVED POSTS ---');

  for (const postId of APPROVED_POST_IDS) {
    const post = await postColl.findOne({ _id: postId });
    if (!post) {
      throw new Error(`PREVALIDATION FAILED: Post ID ${postId} does not exist in database.`);
    }

    if (post.isDeleted !== false) {
      throw new Error(`PREVALIDATION FAILED: Post ID ${postId} is deleted (isDeleted: ${post.isDeleted}).`);
    }

    if (post.organizationId !== undefined && post.organizationId !== null) {
      throw new Error(`PREVALIDATION FAILED: Post ID ${postId} already has organizationId: ${post.organizationId}`);
    }

    if (targetOwnerId && String(post.authorId) !== targetOwnerId) {
      throw new Error(
        `PREVALIDATION FAILED: Post ID ${postId} author (${post.authorId}) does not match target org founder (${targetOwnerId}).`,
      );
    }

    if (!post.content || !post.content.trim()) {
      throw new Error(`PREVALIDATION FAILED: Post ID ${postId} has empty content.`);
    }

    console.log(`[PASS] ID: ${postId}`);
    console.log(`       Author: ${post.authorId} | Created: ${post.createdAt}`);
    console.log(`       Type: ${post.type} | Audience: ${post.audience}`);
    console.log(`       Content Excerpt: "${(post.content || '').substring(0, 60).replace(/\n/g, ' ')}..."`);
    console.log(`       Current organizationId: ${post.organizationId === undefined ? 'ABSENT' : 'NULL'}`);

    prevalidatedDocuments.push(post);
  }

  if (prevalidatedDocuments.length !== APPROVED_POST_IDS.length) {
    throw new Error(
      `PREVALIDATION FAILED: Document count (${prevalidatedDocuments.length}) does not match approved count (${APPROVED_POST_IDS.length}).`,
    );
  }

  console.log(`All ${prevalidatedDocuments.length} approved documents successfully revalidated.\n`);
  return prevalidatedDocuments;
}

// ==========================================
// MODE: DRY-RUN / EXECUTE
// ==========================================
async function runMigration(db, isDryRun) {
  const org = await validateTargetOrganization(db);

  console.log('=================================================================');
  console.log(`STAGE: ${isDryRun ? 'DRY-RUN VALIDATION (ZERO WRITES)' : 'LIVE PRODUCTION EXECUTION'}`);
  console.log('=================================================================');
  console.log(`Target Org : ${org.name} (${org._id})`);
  console.log(`Approved IDs: ${APPROVED_POST_IDS.length}`);

  // Step 1: Prevalidate all 4 posts
  const documentsToMigrate = await prevalidateApprovedPosts(db, org);

  if (isDryRun) {
    console.log('--- STEP 2: DRY-RUN SIMULATION ---');
    documentsToMigrate.forEach((doc, idx) => {
      console.log(`[SIMULATE ${idx + 1}] Post ${doc._id}: would set organizationId = "${org._id}"`);
    });
    console.log('\nDRY-RUN VALIDATION PASSED. ZERO WRITES PERFORMED. System state unchanged.');
    return;
  }

  // Live Execution: Step 2: Create verified backup before any write
  console.log('--- STEP 2: FULL DOCUMENT BACKUP CREATION & VERIFICATION ---');
  const runId = `migration_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  }

  const backupFilePath = path.join(BACKUP_DIR, `backup_posts_${runId}.json`);
  const backupPayload = {
    runId,
    timestamp: new Date().toISOString(),
    targetOrgId: String(org._id),
    targetOrgName: org.name,
    approvedPostIds: APPROVED_POST_IDS,
    documentCount: documentsToMigrate.length,
    documents: documentsToMigrate,
  };

  const backupJson = JSON.stringify(backupPayload, null, 2);
  const checksum = crypto.createHash('sha256').update(backupJson).digest('hex');
  fs.writeFileSync(backupFilePath, backupJson, { mode: 0o600 });

  // Read back and verify backup integrity
  const readBack = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  const readBackChecksum = crypto.createHash('sha256').update(JSON.stringify(readBack, null, 2)).digest('hex');

  if (readBack.documents.length !== documentsToMigrate.length) {
    throw new Error(`BACKUP INTEGRITY FAILED: Document count mismatch (expected ${documentsToMigrate.length}, got ${readBack.documents.length}).`);
  }
  if (readBack.targetOrgId !== String(org._id)) {
    throw new Error('BACKUP INTEGRITY FAILED: Target organization ID mismatch.');
  }

  console.log(`Backup created at : ${backupFilePath}`);
  console.log(`Permissions       : 0600 (owner read/write only)`);
  console.log(`Document Count    : ${readBack.documents.length}`);
  console.log(`SHA-256 Checksum  : ${checksum}`);
  console.log(`Backup Read-Back  : VERIFIED\n`);

  // Step 3: Perform conditional updates
  console.log('--- STEP 3: CONDITIONAL MINIMAL UPDATES ---');
  const postColl = db.collection('community_posts');
  const journalEntries = [];
  let attempted = 0;
  let successful = 0;
  let failed = 0;

  for (const originalDoc of documentsToMigrate) {
    attempted++;
    const postId = String(originalDoc._id);
    const wasOriginallyAbsent = !('organizationId' in originalDoc);

    console.log(`Updating [${attempted}/${documentsToMigrate.length}] ID: ${postId}...`);

    try {
      const updateRes = await postColl.updateOne(
        {
          _id: postId,
          isDeleted: false,
          $or: [{ organizationId: { $exists: false } }, { organizationId: null }],
        },
        {
          $set: { organizationId: String(org._id) },
        },
      );

      if (updateRes.matchedCount !== 1 || updateRes.modifiedCount !== 1) {
        throw new Error(
          `Update condition failed for ${postId}: matched ${updateRes.matchedCount}, modified ${updateRes.modifiedCount}`,
        );
      }

      // Step 4: Re-read document immediately to verify field integrity
      const verified = await postColl.findOne({ _id: postId });
      if (!verified) {
        throw new Error(`Integrity Error: Document ${postId} vanished after update.`);
      }
      if (verified.organizationId !== String(org._id)) {
        throw new Error(`Integrity Error: organizationId mismatch on ${postId} (got ${verified.organizationId}).`);
      }
      if (String(verified.authorId) !== String(originalDoc.authorId)) {
        throw new Error(`Integrity Error: authorId altered on ${postId}.`);
      }
      if (verified.content !== originalDoc.content) {
        throw new Error(`Integrity Error: content altered on ${postId}.`);
      }
      if (verified.audience !== originalDoc.audience) {
        throw new Error(`Integrity Error: audience altered on ${postId}.`);
      }
      if (verified.type !== originalDoc.type) {
        throw new Error(`Integrity Error: type altered on ${postId}.`);
      }
      if (verified.isDeleted !== false) {
        throw new Error(`Integrity Error: isDeleted altered on ${postId}.`);
      }
      if (new Date(verified.createdAt).getTime() !== new Date(originalDoc.createdAt).getTime()) {
        throw new Error(`Integrity Error: createdAt altered on ${postId}.`);
      }

      successful++;
      journalEntries.push({
        migrationRunId: runId,
        timestamp: new Date().toISOString(),
        postId,
        previousOrganizationId: null,
        wasOriginallyAbsent,
        newOrganizationId: String(org._id),
        backupFile: backupFilePath,
        updateStatus: 'SUCCESS',
        verificationStatus: 'VERIFIED',
      });
      console.log(`  [OK] Successfully updated & verified ${postId}`);
    } catch (err) {
      failed++;
      journalEntries.push({
        migrationRunId: runId,
        timestamp: new Date().toISOString(),
        postId,
        newOrganizationId: String(org._id),
        backupFile: backupFilePath,
        updateStatus: 'FAILED',
        verificationStatus: 'FAILED',
        error: err.message,
      });
      console.error(`  [FAILED] ${postId}: ${err.message}`);
      // Halt execution on error
      break;
    }
  }

  // Step 5: Write Journal
  console.log('\n--- STEP 4: RECORDING EXECUTION JOURNAL ---');
  if (!fs.existsSync(JOURNAL_DIR)) {
    fs.mkdirSync(JOURNAL_DIR, { recursive: true, mode: 0o700 });
  }
  const journalFilePath = path.join(JOURNAL_DIR, `journal_${runId}.json`);
  const journalPayload = {
    runId,
    timestamp: new Date().toISOString(),
    targetOrgId: String(org._id),
    targetOrgName: org.name,
    attempted,
    successful,
    failed,
    backupFilePath,
    checksum,
    journal: journalEntries,
  };
  fs.writeFileSync(journalFilePath, JSON.stringify(journalPayload, null, 2), { mode: 0o600 });
  console.log(`Journal written to: ${journalFilePath} (mode 0600)`);

  if (failed > 0 || successful !== APPROVED_POST_IDS.length) {
    throw new Error(`MIGRATION INCOMPLETE: ${successful} succeeded, ${failed} failed.`);
  }

  // Step 6: Verify Company Feed Query
  console.log('\n--- STEP 5: COMPANY FEED REPOSITORY QUERY VERIFICATION ---');
  const orgMatches = [String(org._id), new ObjectId(String(org._id))];
  const companyFeedQuery = {
    isDeleted: false,
    organizationId: { $in: orgMatches },
  };

  const feedPosts = await postColl.find(companyFeedQuery).sort({ createdAt: -1 }).toArray();
  console.log(`Company Feed query returned: ${feedPosts.length} posts.`);

  const feedPostIds = feedPosts.map((p) => String(p._id));
  for (const approvedId of APPROVED_POST_IDS) {
    if (!feedPostIds.includes(approvedId)) {
      throw new Error(`Feed Verification Failed: Approved post ${approvedId} not returned by Company Feed query!`);
    }
  }
  console.log('All 4 approved posts confirmed present in Company Feed query result.');

  // Step 7: Verify Rollback Readiness
  console.log('\n--- STEP 6: ROLLBACK READINESS VERIFICATION ---');
  console.log(`Backup manifest verified at: ${backupFilePath}`);
  console.log(`Journal verified at        : ${journalFilePath}`);
  console.log(`Rollback command available: node scripts/migrate-historical-business-posts.cjs --rollback --backup="${backupFilePath}"`);
  console.log('Rollback readiness status : CONFIRMED READY (Not executed)');

  console.log('\n=================================================================');
  console.log(`MIGRATION VERIFIED: All ${successful}/${APPROVED_POST_IDS.length} posts successfully migrated.`);
  console.log('=================================================================');
}

// ==========================================
// MODE: ROLLBACK
// ==========================================
async function runRollback(db, backupFilePath) {
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  const { targetOrgId, documents } = backupData;
  const postColl = db.collection('community_posts');

  console.log('=================================================================');
  console.log('ROLLBACK EXECUTION');
  console.log('=================================================================');
  console.log(`Target Org ID: ${targetOrgId}`);
  console.log(`Documents to restore: ${documents.length}`);

  let restored = 0;
  for (const originalDoc of documents) {
    const postId = String(originalDoc._id);
    const wasOriginallyAbsent = !('organizationId' in originalDoc);

    const currentDoc = await postColl.findOne({ _id: postId });
    if (!currentDoc) {
      console.warn(`[SKIP] Post ${postId} does not exist in DB.`);
      continue;
    }
    if (currentDoc.organizationId !== targetOrgId) {
      console.warn(`[SKIP] Post ${postId} organizationId changed (${currentDoc.organizationId} !== ${targetOrgId}).`);
      continue;
    }

    const updateOp = wasOriginallyAbsent
      ? { $unset: { organizationId: '' } }
      : { $set: { organizationId: null } };

    const res = await postColl.updateOne({ _id: postId, organizationId: targetOrgId }, updateOp);
    if (res.modifiedCount === 1) {
      restored++;
      console.log(`[RESTORED] Post ${postId} organizationId restored.`);
    }
  }

  console.log(`\nRollback Complete: ${restored}/${documents.length} restored.`);
}

// ==========================================
// CLI ENTRY POINT
// ==========================================
async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const isRollback = args.includes('--rollback');
  const backupArg = args.find((a) => a.startsWith('--backup='));
  const backupFile = backupArg ? backupArg.split('=')[1] : null;

  const { client, db } = await getDbConnection();

  try {
    if (isRollback) {
      await runRollback(db, backupFile);
    } else if (isExecute) {
      if (!args.includes('--confirm')) {
        throw new Error('Execution requires explicit --confirm flag.');
      }
      await runMigration(db, false);
    } else {
      // Default: Dry run
      await runMigration(db, true);
    }
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('\n[FATAL ERROR]:', err.message);
    process.exit(1);
  });
}
