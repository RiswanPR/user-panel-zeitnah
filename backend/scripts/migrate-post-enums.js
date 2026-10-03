/**
 * SAFE MIGRATION: Normalize community_posts.type to uppercase enum values.
 *
 * This script fixes all Post documents that have lowercase `type` field values
 * (e.g. 'text', 'image', 'video', 'document', 'poll') to canonical uppercase
 * PostType enum values ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'POLL').
 *
 * It also normalizes `audience` field to uppercase.
 *
 * Safety:
 * - Uses MongoDB $set, NOT Mongoose .save() — no in-memory document validator risk.
 * - Runs in dry-run mode by default. Pass --execute to apply.
 * - Logs before/after counts.
 * - Does NOT delete or restructure documents.
 *
 * Usage:
 *   node backend/scripts/migrate-post-enums.js          # dry run (safe)
 *   node backend/scripts/migrate-post-enums.js --execute  # apply
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const DRY_RUN = !process.argv.includes('--execute');

const TYPE_MAP = {
  text: 'TEXT',
  image: 'IMAGE',
  video: 'VIDEO',
  document: 'DOCUMENT',
  poll: 'POLL',
};

const AUDIENCE_MAP = {
  public: 'PUBLIC',
  course: 'COURSE',
  batch: 'BATCH',
  private: 'PRIVATE',
};

async function main() {
  console.log(`\n=== Community Post Enum Migration ===`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '⚠️  EXECUTE (writing to DB)'}`);

  await mongoose.connect(process.env.MONGO_URL);
  const col = mongoose.connection.db.collection('community_posts');

  // Count invalid documents before
  const invalidTypeDocs = await col.countDocuments({
    type: { $in: Object.keys(TYPE_MAP) }
  });
  const invalidAudienceDocs = await col.countDocuments({
    audience: { $in: Object.keys(AUDIENCE_MAP) }
  });

  console.log(`\nDocuments with lowercase type: ${invalidTypeDocs}`);
  console.log(`Documents with lowercase audience: ${invalidAudienceDocs}`);

  if (invalidTypeDocs === 0 && invalidAudienceDocs === 0) {
    console.log('\n✅ No migration needed — all documents already have canonical enum values.');
    await mongoose.disconnect();
    return;
  }

  // Fix type field
  for (const [lower, upper] of Object.entries(TYPE_MAP)) {
    const count = await col.countDocuments({ type: lower });
    if (count === 0) continue;
    console.log(`\ntype="${lower}" → "${upper}"  (${count} docs)`);
    if (!DRY_RUN) {
      const result = await col.updateMany({ type: lower }, { $set: { type: upper } });
      console.log(`  ✅ Updated ${result.modifiedCount} documents`);
    }
  }

  // Fix audience field
  for (const [lower, upper] of Object.entries(AUDIENCE_MAP)) {
    const count = await col.countDocuments({ audience: lower });
    if (count === 0) continue;
    console.log(`\naudience="${lower}" → "${upper}"  (${count} docs)`);
    if (!DRY_RUN) {
      const result = await col.updateMany({ audience: lower }, { $set: { audience: upper } });
      console.log(`  ✅ Updated ${result.modifiedCount} documents`);
    }
  }

  // Verify after (only in execute mode)
  if (!DRY_RUN) {
    const remainingInvalidType = await col.countDocuments({
      type: { $in: Object.keys(TYPE_MAP) }
    });
    const remainingInvalidAudience = await col.countDocuments({
      audience: { $in: Object.keys(AUDIENCE_MAP) }
    });
    console.log(`\n=== POST-MIGRATION VERIFICATION ===`);
    console.log(`Remaining invalid type docs: ${remainingInvalidType}`);
    console.log(`Remaining invalid audience docs: ${remainingInvalidAudience}`);
    if (remainingInvalidType === 0 && remainingInvalidAudience === 0) {
      console.log('✅ Migration complete — all documents now have canonical enum values.');
    } else {
      console.error('❌ Some documents still have invalid values — investigate manually.');
    }
  } else {
    console.log('\n🔍 DRY RUN complete — no writes made. Run with --execute to apply.');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
