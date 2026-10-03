/**
 * DB inspection script for community_posts repost documents.
 * Run: node backend/scripts/inspect-repost-docs.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  const db = mongoose.connection.db;
  const col = db.collection('community_posts');

  // Count repost documents by type field value
  const typeCounts = await col.aggregate([
    { $match: { postType: 'repost' } },
    { $group: { _id: '$type', count: { $sum: 1 }, isDeleted: { $push: '$isDeleted' } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('\n=== REPOST DOCUMENTS BY TYPE ===');
  for (const t of typeCounts) {
    const active = (t.isDeleted || []).filter(d => !d).length;
    const deleted = (t.isDeleted || []).filter(d => d).length;
    console.log(`type="${t._id}"  total=${t.count}  active=${active}  soft-deleted=${deleted}`);
  }

  // Count repost docs with invalid lowercase type
  const invalidDocs = await col.find(
    { postType: 'repost', type: { $in: ['text', 'image', 'video', 'document', 'poll'] } },
    { projection: { _id: 1, type: 1, isDeleted: 1, authorId: 1, originalPostId: 1 } }
  ).limit(20).toArray();

  console.log(`\n=== INVALID LOWERCASE TYPE REPOST DOCS (sample, max 20) ===`);
  console.log(`Found: ${invalidDocs.length}`);
  for (const doc of invalidDocs) {
    console.log(`  _id=${doc._id}  type="${doc.type}"  isDeleted=${doc.isDeleted}  author=${doc.authorId}  origPost=${doc.originalPostId}`);
  }

  // Total count of invalid
  const invalidCount = await col.countDocuments({
    postType: 'repost',
    type: { $in: ['text', 'image', 'video', 'document', 'poll'] }
  });
  console.log(`\nTotal invalid lowercase-type repost docs: ${invalidCount}`);

  // Also check ALL posts with invalid type
  const allInvalidCount = await col.countDocuments({
    type: { $nin: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'POLL'] }
  });
  console.log(`Total posts with non-canonical type (all postTypes): ${allInvalidCount}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
