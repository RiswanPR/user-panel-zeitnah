const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI =
  process.env.MONGO_URL ||
  'mongodb://zeitnahadmin:Riswan123456@localhost:27017/lms-platform?authSource=admin';
const DB_NAME = process.env.MONGO_DB_NAME || 'lms-platform';

async function testFullConsistency() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const usersCollection = mongoose.connection.db.collection('users');

  const studentFilter = {
    role: 'student',
    'account_Status.isBlocked': { $ne: true },
    'account_Status.isDeleted': { $ne: true },
    'account_Status.isActive': { $ne: false },
  };

  const learners = await usersCollection
    .aggregate([
      { $match: studentFilter },
      {
        $addFields: {
          effectivePoints: { $ifNull: ['$gamification.totalPoints', 0] },
          effectiveLevel: { $ifNull: ['$gamification.level', 1] },
          effectiveClasses: { $ifNull: ['$gamification.completedClasses', 0] },
          effectiveCreatedAt: { $ifNull: ['$createdAt', new Date(0)] },
        },
      },
      {
        $sort: {
          effectivePoints: -1,
          effectiveLevel: -1,
          effectiveClasses: -1,
          effectiveCreatedAt: 1,
          _id: 1,
        },
      },
      {
        $project: {
          name: 1,
          username: 1,
          avatar: 1,
          createdAt: '$effectiveCreatedAt',
          'gamification.totalPoints': '$effectivePoints',
          'gamification.level': '$effectiveLevel',
          'gamification.rank': { $ifNull: ['$gamification.rank', 'Beginner'] },
          'gamification.completedClasses': '$effectiveClasses',
          'gamification.completedCourses': { $ifNull: ['$gamification.completedCourses', 0] },
          'gamification.activityDates': { $ifNull: ['$gamification.activityDates', []] },
          'account_Status.isVerified': { $ifNull: ['$account_Status.isVerified', false] },
        },
      },
    ])
    .toArray();

  console.log('=== VERIFYING FULL CONSISTENCY: TABLE ORDER VS getStudentGlobalRank ===');
  for (let idx = 0; idx < learners.length; idx++) {
    const student = learners[idx];
    const pts = student.gamification.totalPoints;
    const lvl = student.gamification.level;
    const cls = student.gamification.completedClasses;
    const createdAt = student.createdAt;
    const studentId = student._id;

    const ahead = await usersCollection
      .aggregate([
        { $match: studentFilter },
        {
          $addFields: {
            effectivePoints: { $ifNull: ['$gamification.totalPoints', 0] },
            effectiveLevel: { $ifNull: ['$gamification.level', 1] },
            effectiveClasses: { $ifNull: ['$gamification.completedClasses', 0] },
            effectiveCreatedAt: { $ifNull: ['$createdAt', new Date(0)] },
          },
        },
        {
          $match: {
            $or: [
              { effectivePoints: { $gt: pts } },
              { effectivePoints: pts, effectiveLevel: { $gt: lvl } },
              { effectivePoints: pts, effectiveLevel: lvl, effectiveClasses: { $gt: cls } },
              { effectivePoints: pts, effectiveLevel: lvl, effectiveClasses: cls, effectiveCreatedAt: { $lt: createdAt } },
              { effectivePoints: pts, effectiveLevel: lvl, effectiveClasses: cls, effectiveCreatedAt: createdAt, _id: { $lt: studentId } },
            ],
          },
        },
        { $count: 'count' },
      ])
      .toArray();

    const aheadCount = ahead[0]?.count || 0;
    const personalRank = aheadCount + 1;
    const tableRank = idx + 1;

    console.log(
      `Table Rank #${tableRank}: ${student.name} (@${student.username}) | Personal Rank #${personalRank} -> ${
        tableRank === personalRank ? 'PERFECT MATCH' : 'MISMATCH!'
      }`,
    );
  }

  await mongoose.disconnect();
}

testFullConsistency();
