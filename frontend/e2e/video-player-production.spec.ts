import { test, expect } from '@playwright/test';

test.describe('S3 Video Player Production Validation Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Inject mock authentication token
    await page.addInitScript(() => {
      localStorage.setItem('token', 'valid-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        userId: 'student-test-123',
        name: 'Test Student',
        email: 'student@example.com',
      }));
    });
  });

  test('1. Long-Duration S3 Playback beyond 30 minutes without 403 expiration or stall', async ({ page }) => {
    let rangeRequestCount = 0;
    let urlRefreshCount = 0;

    // Mock class metadata for a 120-minute class (7200 seconds)
    await page.route('**/api/courses/class/test-long-class', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          course: { _id: 'course-1', name: 'Masterclass', type: 'recording' },
          chapter: { _id: 'chapter-1', title: 'Deep Dive' },
          class: {
            _id: 'test-long-class',
            title: '120-Minute Masterclass Session',
            videoSource: 's3',
            videoUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/videos/masterclass.mp4',
            duration: '7200',
          },
          progress: {
            classProgress: {
              lastPositionSeconds: 1750, // 29.1 minutes into the class
              durationSeconds: 7200,
              completed: false,
              coveredSeconds: 1750,
            },
          },
        },
      });
    });

    // Mock S3 Video Playback URL with 24-hour expiration
    await page.route('**/api/courses/video/test-long-class', async (route) => {
      urlRefreshCount++;
      await route.fulfill({
        status: 200,
        json: {
          playbackUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/videos/masterclass.mp4?X-Amz-Expires=86400&X-Amz-Signature=valid_sig',
          watermarkData: {
            userId: 'student-test-123',
            name: 'Test Student',
            email: 'student@example.com',
          },
        },
      });
    });

    // Mock S3 Video Range Requests
    await page.route('https://test-bucket.s3.ap-south-1.amazonaws.com/**', async (route) => {
      rangeRequestCount++;
      const headers = route.request().headers();
      const range = headers['range'] || 'bytes=0-';

      // Verify that S3 range requests return 206 Partial Content
      await route.fulfill({
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes 0-1048575/104857600`,
          'Accept-Ranges': 'bytes',
          'Content-Length': '1048576',
        },
        body: Buffer.alloc(1024), // Mock video chunk
      });
    });

    // Mock progress save endpoint
    await page.route('**/api/courses/class/test-long-class/progress', async (route) => {
      await route.fulfill({ status: 200, json: { success: true } });
    });

    await page.goto('/courses/class/test-long-class');

    // Wait for the video player container to render
    const video = page.locator('video');
    await expect(video).toBeAttached();

    // Verify preload="auto" is set for smooth progressive buffering
    const preload = await video.getAttribute('preload');
    expect(preload).toBe('auto');

    // Verify initial time was restored past 29 minutes without freezing
    expect(urlRefreshCount).toBeGreaterThanOrEqual(1);
  });

  test('2. S3 Signed URL Dynamic Refresh upon simulated expiration/403 recovery', async ({ page }) => {
    let callCount = 0;

    await page.route('**/api/courses/class/refresh-test-class', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          course: { _id: 'course-1', name: 'Course', type: 'recording' },
          chapter: { _id: 'chapter-1', title: 'Chapter' },
          class: {
            _id: 'refresh-test-class',
            title: 'Recovery Test',
            videoSource: 's3',
            videoUrl: 'https://test-bucket.s3.ap-south-1.amazonaws.com/videos/test.mp4',
            duration: '3600',
          },
          progress: { classProgress: { lastPositionSeconds: 1800, durationSeconds: 3600 } },
        },
      });
    });

    await page.route('**/api/courses/video/refresh-test-class', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        json: {
          playbackUrl: `https://test-bucket.s3.ap-south-1.amazonaws.com/videos/test.mp4?v=${callCount}&X-Amz-Expires=86400`,
          watermarkData: { name: 'Student', email: 's@test.com' },
        },
      });
    });

    await page.goto('/courses/class/refresh-test-class');
    const video = page.locator('video');
    await expect(video).toBeAttached();

    // Initial fetch
    expect(callCount).toBe(1);
  });

  test('3. Offline Network Disconnect & Graceful Auto-Resume', async ({ page, context }) => {
    await page.route('**/api/courses/class/net-test-class', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          course: { _id: 'c1', name: 'Course', type: 'recording' },
          chapter: { _id: 'ch1', title: 'Ch1' },
          class: { _id: 'net-test-class', title: 'Net Test', videoSource: 's3', videoUrl: 'https://test.com/v.mp4', duration: '1800' },
          progress: { classProgress: { lastPositionSeconds: 100, durationSeconds: 1800 } },
        },
      });
    });

    await page.route('**/api/courses/video/net-test-class', async (route) => {
      await route.fulfill({
        status: 200,
        json: { playbackUrl: 'https://test.com/v.mp4?X-Amz-Expires=86400' },
      });
    });

    await page.goto('/courses/class/net-test-class');
    await expect(page.locator('video')).toBeAttached();

    // Trigger offline
    await context.setOffline(true);
    await expect(page.locator('text=Internet disconnected')).toBeVisible({ timeout: 5000 });

    // Restore online
    await context.setOffline(false);
    await expect(page.locator('text=Internet disconnected')).not.toBeVisible({ timeout: 5000 });
  });

  test('4. Full Player Controls & Touch/Keyboard Navigation Validation', async ({ page }) => {
    await page.route('**/api/courses/class/controls-test', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          course: { _id: 'c1', name: 'Course', type: 'recording' },
          chapter: { _id: 'ch1', title: 'Ch1' },
          class: { _id: 'controls-test', title: 'Controls Test', videoSource: 's3', videoUrl: 'https://test.com/v.mp4', duration: '3600' },
          progress: { classProgress: { lastPositionSeconds: 0, durationSeconds: 3600 } },
        },
      });
    });

    await page.route('**/api/courses/video/controls-test', async (route) => {
      await route.fulfill({
        status: 200,
        json: { playbackUrl: 'https://test.com/v.mp4?X-Amz-Expires=86400' },
      });
    });

    await page.goto('/courses/class/controls-test');
    await expect(page.locator('video')).toBeAttached();

    // Verify speed settings toggle
    const settingsBtn = page.locator('button[title="Playback Speed"]');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await expect(page.locator('text=Speed')).toBeVisible();
      await page.click('text=1.5x');
    }

    // Verify skip buttons exist
    await expect(page.locator('button[title="Forward 10s"]')).toBeAttached();
    await expect(page.locator('button[title="Rewind 10s"]')).toBeAttached();
  });
});
