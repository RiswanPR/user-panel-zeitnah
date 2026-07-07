# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: community.spec.ts >> Community Production Upload Audit >> Create text post and verify MongoDB
- Location: e2e/community.spec.ts:32:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('textarea[placeholder*="Share your learning"]') to be visible

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import mongoose from 'mongoose';
  3   | import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
  4   | import dotenv from 'dotenv';
  5   | import path from 'path';
  6   | import fs from 'fs';
  7   | import { fileURLToPath } from 'url';
  8   | 
  9   | const __filename = fileURLToPath(import.meta.url);
  10  | const __dirname = path.dirname(__filename);
  11  | 
  12  | dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
  13  | 
  14  | const s3Client = new S3Client({
  15  |   region: process.env.AWS_REGION || 'ap-south-1',
  16  |   credentials: {
  17  |     accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  18  |     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  19  |   }
  20  | });
  21  | 
  22  | test.describe('Community Production Upload Audit', () => {
  23  |   test.beforeAll(async () => {
  24  |     // Connect to local Mongo directly to verify DB records
  25  |     await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/zeitnah-lms');
  26  |   });
  27  | 
  28  |   test.afterAll(async () => {
  29  |     await mongoose.disconnect();
  30  |   });
  31  | 
  32  |   test('Create text post and verify MongoDB', async ({ page, request }) => {
  33  |     // We mock login via localStorage directly or hit the page
  34  |     await page.goto('/login');
  35  |     // For local dev, we bypass the OTP if possible or just navigate to community
  36  |     // Assuming the user is already logged in or we inject the token.
  37  |     // For this audit, we will inject a valid mock token or rely on existing session.
  38  |     
  39  |     // Inject mock token for the audit user
  40  |     const mockToken = process.env.JWT_SECRET || 'mock_token'; 
  41  |     await page.addInitScript((token) => {
  42  |       localStorage.setItem('token', token);
  43  |       localStorage.setItem('user', JSON.stringify({
  44  |         _id: 'audit_user_123',
  45  |         name: 'QA Auditor',
  46  |         role: 'admin'
  47  |       }));
  48  |     }, mockToken);
  49  | 
  50  |     await page.goto('/community');
> 51  |     await page.waitForSelector('textarea[placeholder*="Share your learning"]');
      |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  52  |     
  53  |     // Click the composer
  54  |     await page.click('textarea[placeholder*="Share your learning"]');
  55  |     await page.fill('textarea[placeholder*="Share your learning"]', 'Automated QA Production Test Post');
  56  |     
  57  |     // Create a mock image for upload
  58  |     const filePath = path.join(__dirname, 'test-image.png');
  59  |     fs.writeFileSync(filePath, Buffer.from('mock image content'));
  60  | 
  61  |     // Upload an image
  62  |     const [fileChooser] = await Promise.all([
  63  |       page.waitForEvent('filechooser'),
  64  |       page.locator('button[title="Add Media"]').click()
  65  |     ]);
  66  |     await fileChooser.setFiles(filePath);
  67  |     
  68  |     // Wait for the upload progress to finish and the image preview to appear
  69  |     await page.waitForSelector('img[alt="Preview"]');
  70  |     
  71  |     // Capture network logs during submit
  72  |     const responsePromise = page.waitForResponse(response => response.url().includes('/api/community/posts') && response.request().method() === 'POST');
  73  |     
  74  |     // Submit Post
  75  |     await page.click('button:has-text("Post")');
  76  |     
  77  |     const response = await responsePromise;
  78  |     expect(response.status()).toBe(201);
  79  |     
  80  |     const postData = await response.json();
  81  |     expect(postData).toHaveProperty('_id');
  82  |     
  83  |     // 1. Verify MongoDB
  84  |     const PostModel = mongoose.connection.collection('community_posts');
  85  |     const dbPost = await PostModel.findOne({ _id: new mongoose.Types.ObjectId(postData._id) });
  86  |     expect(dbPost).toBeTruthy();
  87  |     expect(dbPost.content).toBe('Automated QA Production Test Post');
  88  |     expect(dbPost.media.length).toBe(1);
  89  |     
  90  |     // 2. Verify S3 Object
  91  |     const mediaUrl = dbPost.media[0].url;
  92  |     // Extract key from URL
  93  |     const urlObj = new URL(mediaUrl);
  94  |     const key = urlObj.pathname.substring(1); // remove leading slash
  95  |     
  96  |     try {
  97  |       const headCommand = new HeadObjectCommand({
  98  |         Bucket: process.env.AWS_S3_BUCKET || 'zeitnahacademy-production',
  99  |         Key: key
  100 |       });
  101 |       const s3Response = await s3Client.send(headCommand);
  102 |       expect(s3Response.$metadata.httpStatusCode).toBe(200);
  103 |       console.log('S3 Object Verified:', { key, contentType: s3Response.ContentType, size: s3Response.ContentLength });
  104 |     } catch (error) {
  105 |       console.error('S3 Verification Failed:', error);
  106 |       throw error;
  107 |     }
  108 | 
  109 |     // Cleanup local test file
  110 |     fs.unlinkSync(filePath);
  111 |   });
  112 | });
  113 | 
```