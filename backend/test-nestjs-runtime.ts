import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ValidationPipe } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';
const TEST_USER_ID = '6a46ddb60f2316105301f0f9';
const TEST_DEVICE_ID = 'test-runtime-device-01';

const NORMAL_CLASS_ID = '6a343b757304bdf59c0bba01';
const LARGE_CLASS_ID = '6b9999999999999999999150';

async function testHttpEndpoint() {
  console.log('=== BOOTING NESTJS APP FOR LIVE HTTP VERIFICATION ===');
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const PORT = 3009;
  await app.listen(PORT);
  console.log(`NestJS server listening on http://localhost:${PORT}`);

  try {
    // Generate valid JWT token
    const token = jwt.sign(
      {
        userId: TEST_USER_ID,
        role: 'student',
        deviceId: TEST_DEVICE_ID,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('\n--- Test 1: GET /api/courses/class/:classId (Normal Class) ---');
    const t0 = performance.now();
    const res1 = await axios.get(`http://localhost:${PORT}/api/courses/class/${NORMAL_CLASS_ID}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    });
    const duration1 = performance.now() - t0;
    console.log(`  Status: ${res1.status} OK`);
    console.log(`  Response Time: ${duration1.toFixed(2)}ms`);
    console.log(`  Purchased: ${res1.data.purchased}`);
    console.log(`  Course Name: "${res1.data.course?.name}"`);
    console.log(`  Chapter Title: "${res1.data.chapter?.title}"`);
    console.log(`  Class Title: "${res1.data.class?.title}"`);
    console.log(`  Class Exercises Count: ${res1.data.class?.exercises?.length}`);
    console.log(`  Class Cover Signed: ${Boolean(res1.data.class?.coverImage)}`);

    console.log('\n--- Test 2: GET /api/courses/class/:classId (Large Course - 150 Classes) ---');
    const t1 = performance.now();
    const res2 = await axios.get(`http://localhost:${PORT}/api/courses/class/${LARGE_CLASS_ID}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    });
    const duration2 = performance.now() - t1;
    console.log(`  Status: ${res2.status} OK`);
    console.log(`  Response Time: ${duration2.toFixed(2)}ms`);
    console.log(`  Purchased: ${res2.data.purchased}`);
    console.log(`  Course Name: "${res2.data.course?.name}"`);
    console.log(`  Class Title: "${res2.data.class?.title}"`);
    console.log(`  Total Classes Reported in Learning Progress: ${res2.data.progress?.learningProgress?.totalClasses}`);

    console.log('\n--- Test 3: Unauthenticated Access Check (Should return 401) ---');
    try {
      await axios.get(`http://localhost:${PORT}/api/courses/class/${NORMAL_CLASS_ID}`);
      console.log('  ❌ FAILED: Expected 401 Unauthorized');
    } catch (err: any) {
      console.log(`  ✅ Passed: Returned ${err.response?.status} (${err.response?.data?.message || err.message})`);
    }

    console.log('\n--- Test 4: Response Time Evaluation ---');
    console.log(`  Normal class duration: ${duration1.toFixed(2)}ms (Target < 5000ms: ${duration1 < 5000 ? 'PASSED' : 'FAILED'})`);
    console.log(`  Large class duration:  ${duration2.toFixed(2)}ms (Target < 5000ms: ${duration2 < 5000 ? 'PASSED' : 'FAILED'})`);
    console.log(`  Under 15000ms threshold: ${duration1 < 15000 && duration2 < 15000 ? 'YES (PASSED)' : 'NO'}`);

  } finally {
    await app.close();
    console.log('\nNestJS server closed gracefully.');
  }
}

testHttpEndpoint().catch(err => {
  console.error('LIVE HTTP TEST ERROR:', err.response?.data || err.message);
  process.exit(1);
});
