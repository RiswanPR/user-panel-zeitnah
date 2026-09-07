/**
 * Runtime verification script for API timeout fix.
 * Tests MongoDB index, query performance, and endpoint response times.
 */
const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://zeitnahadmin:Riswan123456@localhost:27017/lms-platform?authSource=admin';

async function main() {
  console.log('=== MONGODB VERIFICATION ===\n');
  
  let client;
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log('✅ MongoDB connected successfully\n');
    
    const db = client.db('lms-platform');
    
    // 1. Check collection stats
    console.log('--- Collection Stats ---');
    const collections = await db.listCollections().toArray();
    const courseCollection = collections.find(c => c.name === 'courses');
    if (courseCollection) {
      const stats = await db.collection('courses').countDocuments();
      console.log(`  courses documents: ${stats}`);
    } else {
      console.log('  ⚠️ courses collection not found');
    }
    
    const userCount = await db.collection('users').countDocuments();
    console.log(`  users documents: ${userCount}`);
    
    const activeStreamCount = await db.collection('activestreams').countDocuments();
    console.log(`  activestreams documents: ${activeStreamCount}\n`);

    // 2. Check indexes on courses collection
    console.log('--- Courses Collection Indexes ---');
    const indexes = await db.collection('courses').indexes();
    for (const idx of indexes) {
      console.log(`  Index: ${idx.name}`);
      console.log(`    Key: ${JSON.stringify(idx.key)}`);
      if (idx.unique) console.log(`    Unique: true`);
    }
    
    const classIdIndex = indexes.find(idx => idx.key && idx.key['chapters.classes._id']);
    if (classIdIndex) {
      console.log(`\n  ✅ INDEX FOUND: chapters.classes._id`);
      console.log(`     Name: ${classIdIndex.name}`);
      console.log(`     Key: ${JSON.stringify(classIdIndex.key)}`);
    } else {
      console.log(`\n  ❌ INDEX MISSING: chapters.classes._id`);
      console.log('     This index will be auto-created when the NestJS app starts.');
      console.log('     Creating it now for testing...');
      
      await db.collection('courses').createIndex({ 'chapters.classes._id': 1 });
      console.log('     ✅ Index created manually.');
    }
    
    // 3. Get a sample classId for testing
    console.log('\n--- Sample Data for Testing ---');
    const sampleCourse = await db.collection('courses').findOne({}, { projection: { name: 1, type: 1, 'chapters.classes._id': 1, 'chapters.classes.title': 1, 'chapters.title': 1 } });
    
    if (!sampleCourse) {
      console.log('  ⚠️ No courses found in database');
      return;
    }
    
    console.log(`  Course: ${sampleCourse.name} (type: ${sampleCourse.type})`);
    
    let totalClasses = 0;
    let totalChapters = 0;
    let sampleClassId = null;
    let largestChapterClassCount = 0;
    let largestChapterClassId = null;
    
    for (const chapter of (sampleCourse.chapters || [])) {
      totalChapters++;
      const classes = chapter.classes || [];
      totalClasses += classes.length;
      if (classes.length > 0 && !sampleClassId) {
        sampleClassId = classes[0]._id.toString();
      }
      if (classes.length > largestChapterClassCount) {
        largestChapterClassCount = classes.length;
        if (classes.length > 0) {
          largestChapterClassId = classes[classes.length - 1]._id.toString();
        }
      }
    }
    
    console.log(`  Chapters: ${totalChapters}`);
    console.log(`  Total classes: ${totalClasses}`);
    console.log(`  Sample classId: ${sampleClassId}`);
    console.log(`  Largest chapter has ${largestChapterClassCount} classes, sample: ${largestChapterClassId}`);
    
    // Get all courses for size analysis
    const allCourses = await db.collection('courses').find({}, { projection: { name: 1, 'chapters.classes._id': 1 } }).toArray();
    let maxClasses = 0;
    let maxClassesCourse = null;
    let maxClassId = null;
    
    for (const course of allCourses) {
      let count = 0;
      let lastClassId = null;
      for (const ch of (course.chapters || [])) {
        count += (ch.classes || []).length;
        if (ch.classes && ch.classes.length > 0) {
          lastClassId = ch.classes[ch.classes.length - 1]._id.toString();
        }
      }
      if (count > maxClasses) {
        maxClasses = count;
        maxClassesCourse = course.name;
        maxClassId = lastClassId;
      }
    }
    
    console.log(`\n  Largest course: "${maxClassesCourse}" with ${maxClasses} classes`);
    console.log(`  Sample classId from largest: ${maxClassId}`);
    
    // 4. Test query performance WITH index
    console.log('\n--- Query Performance (WITH Index) ---');
    
    if (sampleClassId) {
      // Test findOne by chapters.classes._id
      const start1 = Date.now();
      const result1 = await db.collection('courses').findOne({ 'chapters.classes._id': sampleClassId });
      const time1 = Date.now() - start1;
      console.log(`  findOne by chapters.classes._id: ${time1}ms (found: ${!!result1})`);
      
      // Test with explain to verify index usage
      const explain = await db.collection('courses').find({ 'chapters.classes._id': sampleClassId }).explain('executionStats');
      const stage = explain.queryPlanner?.winningPlan?.stage || explain.queryPlanner?.winningPlan?.inputStage?.stage;
      const totalDocsExamined = explain.executionStats?.totalDocsExamined;
      const totalKeysExamined = explain.executionStats?.totalKeysExamined;
      const executionTimeMs = explain.executionStats?.executionTimeMillis;
      
      console.log(`  Explain plan:`);
      console.log(`    Winning stage: ${stage}`);
      console.log(`    Docs examined: ${totalDocsExamined}`);
      console.log(`    Keys examined: ${totalKeysExamined}`);
      console.log(`    Execution time: ${executionTimeMs}ms`);
      
      if (stage === 'FETCH' || stage === 'IXSCAN') {
        console.log('  ✅ MongoDB is USING the index (IXSCAN)');
      } else if (stage === 'COLLSCAN') {
        console.log('  ❌ MongoDB is doing COLLECTION SCAN — index not being used!');
      } else {
        console.log(`  ⚠️ Stage: ${JSON.stringify(explain.queryPlanner?.winningPlan, null, 2).slice(0, 500)}`);
      }
      
      // Test with ObjectId conversion (as Mongoose does)
      const { ObjectId } = require('mongodb');
      let objectIdClassId;
      try {
        objectIdClassId = new ObjectId(sampleClassId);
      } catch (e) {
        objectIdClassId = sampleClassId;
      }
      
      const start2 = Date.now();
      const result2 = await db.collection('courses').findOne({ 'chapters.classes._id': objectIdClassId });
      const time2 = Date.now() - start2;
      console.log(`\n  findOne with ObjectId: ${time2}ms (found: ${!!result2})`);
    }
    
    // 5. Test user query performance
    console.log('\n--- User Query Performance ---');
    const sampleUser = await db.collection('users').findOne({});
    if (sampleUser) {
      const start3 = Date.now();
      await db.collection('users').findOne({ _id: sampleUser._id });
      const time3 = Date.now() - start3;
      console.log(`  findById user: ${time3}ms`);
      console.log(`  User has ${(sampleUser.course || []).length} enrolled courses`);
      
      // Check user indexes
      const userIndexes = await db.collection('users').indexes();
      console.log(`  User indexes: ${userIndexes.map(i => i.name).join(', ')}`);
    }
    
    // 6. Parallel vs sequential benchmark
    console.log('\n--- Parallel vs Sequential Benchmark ---');
    if (sampleClassId && sampleUser) {
      const { ObjectId } = require('mongodb');
      let objectIdClassId;
      try {
        objectIdClassId = new ObjectId(sampleClassId);
      } catch (e) {
        objectIdClassId = sampleClassId;
      }
      
      // Sequential (OLD pattern)
      const seqStart = Date.now();
      await db.collection('courses').findOne({ 'chapters.classes._id': objectIdClassId });
      await db.collection('users').findOne({ _id: sampleUser._id });
      await db.collection('users').findOne({ _id: sampleUser._id }); // duplicate
      const seqTime = Date.now() - seqStart;
      
      // Parallel (NEW pattern)
      const parStart = Date.now();
      await Promise.all([
        db.collection('courses').findOne({ 'chapters.classes._id': objectIdClassId }),
        db.collection('users').findOne({ _id: sampleUser._id }),
      ]);
      const parTime = Date.now() - parStart;
      
      console.log(`  Sequential (course + user + duplicate user): ${seqTime}ms`);
      console.log(`  Parallel (course + user, no duplicate): ${parTime}ms`);
      console.log(`  Improvement: ${seqTime - parTime}ms saved (${Math.round((1 - parTime/seqTime) * 100)}% faster)`);
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total courses: ${allCourses.length}`);
    console.log(`Total users: ${userCount}`);
    console.log(`Largest course: "${maxClassesCourse}" (${maxClasses} classes)`);
    console.log(`Index verified: ${!!indexes.find(idx => idx.key && idx.key['chapters.classes._id']) ? 'YES' : 'CREATED NOW'}`);
    
    // Output test data for endpoint tests
    console.log('\n=== TEST DATA FOR ENDPOINT TESTS ===');
    
    // Find a user with enrolled courses  
    const enrolledUser = await db.collection('users').findOne({ 'course.0': { $exists: true } }, { projection: { email: 1, name: 1, course: 1 } });
    if (enrolledUser) {
      console.log(`  User with enrollments: ${enrolledUser.email} (${(enrolledUser.course || []).length} courses)`);
      if (enrolledUser.course && enrolledUser.course[0]) {
        console.log(`  First enrolled courseId: ${enrolledUser.course[0].courseId}`);
        // Find a class in this enrolled course
        const enrolledCourseId = enrolledUser.course[0].courseId;
        const enrolledCourse = await db.collection('courses').findOne({ _id: enrolledCourseId });
        if (enrolledCourse && enrolledCourse.chapters && enrolledCourse.chapters[0] && enrolledCourse.chapters[0].classes && enrolledCourse.chapters[0].classes[0]) {
          console.log(`  ClassId for testing: ${enrolledCourse.chapters[0].classes[0]._id}`);
          console.log(`  Course name: ${enrolledCourse.name}`);
          
          let enrolledTotalClasses = 0;
          for (const ch of enrolledCourse.chapters || []) {
            enrolledTotalClasses += (ch.classes || []).length;
          }
          console.log(`  Course has ${enrolledTotalClasses} total classes in ${enrolledCourse.chapters?.length || 0} chapters`);
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (client) await client.close();
  }
}

main();
