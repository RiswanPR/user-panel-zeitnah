import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

test.describe('Community Production Upload Audit', () => {
  test.beforeAll(async () => {
    // Connect to local Mongo directly to verify DB records
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/zeitnah-lms');
  });

  test.afterAll(async () => {
    await mongoose.disconnect();
  });

  test('Create text post and verify MongoDB', async ({ page, request }) => {
    // We mock login via localStorage directly or hit the page
    await page.goto('/login');
    // For local dev, we bypass the OTP if possible or just navigate to community
    // Assuming the user is already logged in or we inject the token.
    // For this audit, we will inject a valid mock token or rely on existing session.
    
    // Inject mock token for the audit user
    const mockToken = process.env.JWT_SECRET || 'mock_token'; 
    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        _id: 'audit_user_123',
        name: 'QA Auditor',
        role: 'admin'
      }));
    }, mockToken);

    await page.goto('/community');
    await page.waitForSelector('textarea[placeholder*="Share your learning"]');
    
    // Click the composer
    await page.click('textarea[placeholder*="Share your learning"]');
    await page.fill('textarea[placeholder*="Share your learning"]', 'Automated QA Production Test Post');
    
    // Create a mock image for upload
    const filePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(filePath, Buffer.from('mock image content'));

    // Upload an image
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button[title="Add Media"]').click()
    ]);
    await fileChooser.setFiles(filePath);
    
    // Wait for the upload progress to finish and the image preview to appear
    await page.waitForSelector('img[alt="Preview"]');
    
    // Capture network logs during submit
    const responsePromise = page.waitForResponse(response => response.url().includes('/api/community/posts') && response.request().method() === 'POST');
    
    // Submit Post
    await page.click('button:has-text("Post")');
    
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    
    const postData = await response.json();
    expect(postData).toHaveProperty('_id');
    
    // 1. Verify MongoDB
    const PostModel = mongoose.connection.collection('community_posts');
    const dbPost = await PostModel.findOne({ _id: new mongoose.Types.ObjectId(postData._id) });
    expect(dbPost).toBeTruthy();
    expect(dbPost.content).toBe('Automated QA Production Test Post');
    expect(dbPost.media.length).toBe(1);
    
    // 2. Verify S3 Object
    const mediaUrl = dbPost.media[0].url;
    // Extract key from URL
    const urlObj = new URL(mediaUrl);
    const key = urlObj.pathname.substring(1); // remove leading slash
    
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || 'zeitnahacademy-production',
        Key: key
      });
      const s3Response = await s3Client.send(headCommand);
      expect(s3Response.$metadata.httpStatusCode).toBe(200);
      console.log('S3 Object Verified:', { key, contentType: s3Response.ContentType, size: s3Response.ContentLength });
    } catch (error) {
      console.error('S3 Verification Failed:', error);
      throw error;
    }

    // Cleanup local test file
    fs.unlinkSync(filePath);
  });
});
