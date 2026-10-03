/**
 * Deep inspection of specific post and ALL audience/type value anomalies in DB.
 * Run: node backend/scripts/inspect-post-enums.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  const db = mongoose.connection.db;
  const col = db.collection('community_posts');

  const TARGET_ID = 'dd10d087-ee9e-4c26-a4a7-94cb832cdafd';

  // 1. Check the specific failing post
  const target = await col.findOne({ _id: TARGET_ID });
  if (target) {
    console.log('\n=== TARGET POST ===');
    console.log(`  _id: ${target._id}`);
    console.log(`  type: "${target.type}"`);
    console.log(`  audience: "${target.audience}"`);
    console.log(`  postType: "${target.postType}"`);
    console.log(`  authorId: ${target.authorId}`);
    console.log(`  isDeleted: ${target.isDeleted}`);
    console.log(`  stats.reposts: ${target.stats?.reposts}`);
  } else {
    console.log(`\nTarget post ${TARGET_ID} NOT FOUND`);
    
    // Try searching for a partial match or similar ID
    console.log('Searching for posts with similar ID prefix...');
    const partial = await col.find(
      { _id: { $regex: '^dd10d087' } },
      { projection: { _id: 1, type: 1, audience: 1, postType: 1 } }
    ).limit(5).toArray();
    console.log('Found:', partial);
  }

  // 2. Check all posts with invalid type values
  const invalidType = await col.find(
    { type: { $nin: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'POLL', null, undefined] } },
    { projection: { _id: 1, type: 1, postType: 1, audience: 1 } }
  ).limit(20).toArray();
  
  console.log(`\n=== ALL POSTS WITH NON-CANONICAL TYPE ===`);
  console.log(`Count: ${invalidType.length}`);
  for (const d of invalidType) {
    console.log(`  _id=${d._id}  type="${d.type}"  postType="${d.postType}"  audience="${d.audience}"`);
  }

  // 3. Check all posts with invalid audience values
  const invalidAudience = await col.find(
    { audience: { $nin: ['PUBLIC', 'COURSE', 'BATCH', 'PRIVATE', null, undefined] } },
    { projection: { _id: 1, type: 1, postType: 1, audience: 1 } }
  ).limit(20).toArray();

  console.log(`\n=== ALL POSTS WITH NON-CANONICAL AUDIENCE ===`);
  console.log(`Count: ${invalidAudience.length}`);
  for (const d of invalidAudience) {
    console.log(`  _id=${d._id}  type="${d.type}"  postType="${d.postType}"  audience="${d.audience}"`);
  }

  // 4. Summary of type distribution across all posts
  const typeDist = await col.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('\n=== TYPE DISTRIBUTION (ALL POSTS) ===');
  for (const t of typeDist) {
    console.log(`  type="${t._id}"  count=${t.count}`);
  }

  // 5. Summary of audience distribution
  const audDist = await col.aggregate([
    { $group: { _id: '$audience', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('\n=== AUDIENCE DISTRIBUTION (ALL POSTS) ===');
  for (const a of audDist) {
    console.log(`  audience="${a._id}"  count=${a.count}`);
  }

  // 6. Check for repost of target post
  const reposts = await col.find(
    { originalPostId: TARGET_ID },
    { projection: { _id: 1, type: 1, postType: 1, audience: 1, authorId: 1, isDeleted: 1 } }
  ).toArray();
  console.log(`\n=== REPOSTS OF TARGET POST ===`);
  console.log(`Count: ${reposts.length}`);
  for (const r of reposts) {
    console.log(`  _id=${r._id}  type="${r.type}"  isDeleted=${r.isDeleted}  author=${r.authorId}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
