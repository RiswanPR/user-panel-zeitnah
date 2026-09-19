const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI =
  process.env.MONGO_URL ||
  'mongodb://zeitnahadmin:Riswan123456@localhost:27017/lms-platform?authSource=admin';
const DB_NAME = process.env.MONGO_DB_NAME || 'lms-platform';

async function auditDatabase() {
  console.log('Connecting to MongoDB at:', MONGO_URI.replace(/:([^:@]+)@/, ':****@'));
  try {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    console.log('\n--- Existing Collections ---');
    console.log(collections.map((c) => c.name));

    const usersCollection = db.collection('users');
    const coursesCollection = db.collection('courses');

    const totalUsers = await usersCollection.countDocuments();
    const studentFilter = {
      role: 'student',
      'account_Status.isBlocked': { $ne: true },
      'account_Status.isDeleted': { $ne: true },
      'account_Status.isActive': { $ne: false },
    };
    const eligibleStudents = await usersCollection.countDocuments(studentFilter);
    const blockedCount = await usersCollection.countDocuments({ 'account_Status.isBlocked': true });
    const deletedCount = await usersCollection.countDocuments({ 'account_Status.isDeleted': true });

    console.log('\n--- User Statistics ---');
    console.log(`Total Users in DB: ${totalUsers}`);
    console.log(`Eligible Students: ${eligibleStudents}`);
    console.log(`Blocked Users: ${blockedCount}`);
    console.log(`Deleted Users: ${deletedCount}`);

    // Top 10 Students by deterministic order
    const topStudents = await usersCollection
      .find(studentFilter)
      .sort({
        'gamification.totalPoints': -1,
        'gamification.level': -1,
        'gamification.completedClasses': -1,
        createdAt: 1,
        _id: 1,
      })
      .limit(10)
      .toArray();

    console.log('\n--- Top 10 Students (Deterministic Order) ---');
    topStudents.forEach((s, i) => {
      console.log(
        `#${i + 1}: "${s.name || 'No Name'}" (@${s.username || 'no-handle'}) - ID: ${s._id} - Points: ${
          s.gamification?.totalPoints ?? 0
        } - Level: ${s.gamification?.level ?? 1} - Rank: "${s.gamification?.rank ?? 'None'}" - Classes: ${
          s.gamification?.completedClasses ?? 0
        }`,
      );
    });

    // Courses
    const totalCourses = await coursesCollection.countDocuments();
    console.log(`\n--- Courses (Total: ${totalCourses}) ---`);
    const sampleCourses = await coursesCollection.find({}).limit(10).toArray();
    for (const c of sampleCourses) {
      const enrolledCount = await usersCollection.countDocuments({
        ...studentFilter,
        'course.courseId': c._id.toString(),
      });
      console.log(`Course: "${c.name}" (ID: ${c._id}) - Type: ${c.type} - Enrolled Learners: ${enrolledCount}`);
    }

    // Check point_transactions collection
    if (collections.some((c) => c.name === 'point_transactions')) {
      const ptCollection = db.collection('point_transactions');
      const totalPt = await ptCollection.countDocuments();
      console.log(`\n--- point_transactions found: ${totalPt} records ---`);
      const samplePt = await ptCollection.find({}).limit(3).toArray();
      console.log('Sample transactions:', JSON.stringify(samplePt, null, 2));
    } else {
      console.log('\n--- point_transactions collection does not exist in this MongoDB ---');
    }

    // Check tie-breakers
    const pointsDistribution = await usersCollection
      .aggregate([
        { $match: studentFilter },
        {
          $group: {
            _id: '$gamification.totalPoints',
            count: { $sum: 1 },
            users: {
              $push: {
                id: '$_id',
                name: '$name',
                username: '$username',
                level: '$gamification.level',
                classes: '$gamification.completedClasses',
                createdAt: '$createdAt',
              },
            },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 3 },
      ])
      .toArray();

    console.log('\n--- Tie-breaker candidates (same points) ---');
    console.log(JSON.stringify(pointsDistribution, null, 2));

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

auditDatabase();
