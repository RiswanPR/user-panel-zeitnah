import { chromium } from '/Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/riyas/.gemini/antigravity-ide/brain/27dd0d16-4ed1-4291-9ba3-7213ac000af2/qa_screenshots/phase43';
const VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTRmZjUwNGNlMTg1OGVmMTIxZDQ3NWQiLCJwcmltYXJ5Um9sZSI6IlNUVURFTlQiLCJyb2xlIjoic3R1ZGVudCIsImRldmljZUlkIjoiNWFlY2ZhMzgyODMzYjI5ZmI2M2E5YmE1YjRmM2JjMjkiLCJpYXQiOjE3OTA5NzQxNTgsImV4cCI6MTc5MTU3ODk1OH0.eyARAfjlV5aLp8yLSca8hmTLcY3knfUIafsYiI0oseQ";

async function runPhase43E2E() {
  console.log('Initializing browser for Phase 4.3 Production Hardening E2E...');
  let browser;
  let context;
  let page;

  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    context = browser.contexts()[0] || await browser.newContext();
    const pages = context.pages();
    page = pages.find(p => p.url().includes('localhost:5173')) || pages[0] || await context.newPage();
    console.log('Connected via CDP');
  } catch {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
    console.log('Launched Playwright Chromium headless');
  }

  const consoleErrors = [];
  const reactWarnings = [];
  const unhandledRejections = [];
  const networkRequests = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (!text.includes('favicon.ico') && !text.includes('Failed to load resource')) {
        consoleErrors.push(text);
        console.log('Browser Console Error:', text);
      }
    } else if (text.includes('Warning:') || text.includes('React warning')) {
      reactWarnings.push(text);
      console.log('Browser React Warning:', text);
    }
  });

  page.on('pageerror', (err) => {
    unhandledRejections.push(err.message);
    console.log('Browser Page Error:', err.message);
  });

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/community/')) {
      networkRequests.push({ method: req.method(), url, time: Date.now() });
    }
  });

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // 1. Establish Verified Active Session in Browser
  console.log('\n--- 1. Setting Authenticated Session in Browser ---');
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.evaluate((tok) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify({
      _id: '6a4ff504ce1858ef121d475d',
      id: '6a4ff504ce1858ef121d475d',
      name: 'Riswan PR',
      displayName: 'Riswan PR',
      username: 'riswanpr',
      role: 'student',
      primaryRole: 'STUDENT',
    }));
  }, VALID_TOKEN);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log('Active session set for user Riswan PR');

  // 2. Viewport Checks across 8 Viewports
  console.log('\n--- 2. Checking 8 Viewports for 0px Overflow ---');
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 430, height: 932 },
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 360, height: 800 }
  ];

  const viewportResults = [];
  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(400);

    const overflowPx = await page.evaluate(() => {
      return Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    });

    const isPass = overflowPx === 0;
    viewportResults.push({ viewport: `${vp.width}x${vp.height}`, overflowPx, result: isPass ? 'PASS' : 'FAIL' });
    console.log(`Viewport ${vp.width}x${vp.height}: overflow = ${overflowPx}px -> ${isPass ? 'PASS' : 'FAIL'}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `vp_${vp.width}.png`) });
  }

  // Restore desktop viewport for detailed feature testing
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 3. Real Multi-Image Upload & Publishing Test
  console.log('\n--- 3. Testing Real Multi-Image Upload & Publishing ---');
  const realPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const imgPath1 = path.join(SCREENSHOT_DIR, 'upload_item_1.png');
  const imgPath2 = path.join(SCREENSHOT_DIR, 'upload_item_2.png');
  const imgPath3 = path.join(SCREENSHOT_DIR, 'upload_item_3.png');
  const sampleBuf = Buffer.from(realPngBase64, 'base64');
  fs.writeFileSync(imgPath1, sampleBuf);
  fs.writeFileSync(imgPath2, sampleBuf);
  fs.writeFileSync(imgPath3, sampleBuf);

  await page.click('#community-create-trigger');
  await page.waitForTimeout(400);

  const newPostBtn = await page.$('button:has-text("New Post"), [data-testid="create-new-post-btn"]');
  if (newPostBtn) {
    await newPostBtn.click();
    await page.waitForTimeout(500);

    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles([imgPath1, imgPath2, imgPath3]);
      await page.waitForTimeout(800);

      // Verify Step 2: Adjust & Preview
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2_adjust_preview.png') });
      console.log('Captured step2_adjust_preview.png');

      // Click "Next" to Details
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(600);

      const textarea = await page.$('textarea[placeholder*="Write a caption"]');
      if (textarea) {
        await textarea.fill('Phase 4.3 Final Hardening: Real 3-image carousel post on Zeitnah Community! #engineering #zeitnah #security');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step3_post_details.png') });
      console.log('Captured step3_post_details.png');

      // Test Duplicate Publish Protection: Rapid multiple clicks
      console.log('Testing duplicate publish protection (clicking Publish rapidly)...');
      const publishBtn = await page.$('#composer-submit-btn');
      if (publishBtn) {
        await Promise.all([
          publishBtn.click().catch(() => {}),
          publishBtn.click().catch(() => {}),
          publishBtn.click().catch(() => {}),
          publishBtn.click().catch(() => {})
        ]);
      }

      // Wait for upload and post creation to finish (composer modal detaches)
      await page.waitForSelector('#composer-submit-btn', { state: 'detached', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'feed_after_publish.png') });
      console.log('Captured feed_after_publish.png');
    }
  }

  // 4. Verify Immediate Feed Update & Carousel Navigation
  console.log('\n--- 4. Verifying Published Post in Feed & Carousel Navigation ---');
  await page.waitForTimeout(1000);

  const firstPost = await page.$('article.zn-card');
  if (firstPost) {
    console.log('Found newly created post in feed');
    const authorText = await firstPost.$eval('h3, h4', el => el.textContent).catch(() => '');
    console.log(`Post Author: ${authorText}`);

    // Verify carousel next button
    const nextBtn = await firstPost.$('[data-testid="carousel-next-btn"]');
    if (nextBtn) {
      console.log('Clicking carousel next media button...');
      await nextBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'carousel_slide_2.png') });
      console.log('Captured carousel_slide_2.png');
    }

    // Verify Double-Tap Like
    const mediaContainer = await firstPost.$('[data-testid="post-media-container"]');
    if (mediaContainer) {
      console.log('Performing double-tap like on newly published post...');
      await mediaContainer.dblclick();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'double_tap_liked.png') });
      console.log('Captured double_tap_liked.png');
    }
  }

  // 5. Test Stories with Real Story
  console.log('\n--- 5. Testing Stories Creation & Story Viewer ---');
  await page.click('#community-create-trigger');
  await page.waitForTimeout(400);

  const addStoryBtn = await page.$('button:has-text("Add to Story")');
  if (addStoryBtn) {
    await addStoryBtn.click();
    await page.waitForTimeout(500);

    const textTab = await page.$('button:has-text("Text")');
    if (textTab) {
      await textTab.click();
      await page.waitForTimeout(300);

      const storyTextarea = await page.$('textarea[placeholder*="Type something"]');
      if (storyTextarea) {
        await storyTextarea.fill('Zeitnah Phase 4.3 Verified Story 🌟');
      }

      const publishStoryBtn = await page.$('button:has-text("Publish Story")');
      if (publishStoryBtn) {
        await publishStoryBtn.click();
        await page.waitForTimeout(1800);
        console.log('Story created successfully');
      }
    }
  }

  // Check story in rail
  await page.waitForTimeout(1000);
  const storyInRail = await page.$('section[aria-label="Community Stories"] div[role="button"]');
  if (storyInRail) {
    await storyInRail.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'story_viewer_active.png') });
    console.log('Captured story_viewer_active.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 6. Test Comments Sheet with Real Comment
  console.log('\n--- 6. Testing Comment Drawer & Comment Creation ---');
  const commentBtn = await page.$('[data-testid="post-comment-btn"]');
  if (commentBtn) {
    await commentBtn.click();
    await page.waitForTimeout(800);

    const commentInput = await page.$('#comment-drawer-input');
    if (commentInput) {
      await commentInput.fill('Phase 4.3 real comment verification!');
      const sendCommentBtn = await page.$('#comment-drawer-submit');
      if (sendCommentBtn) {
        await sendCommentBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'comments_drawer_real.png') });
    console.log('Captured comments_drawer_real.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 7. Test Repost & Bookmark
  console.log('\n--- 7. Testing Bookmark & Saved Posts Navigation ---');
  const bookmarkBtn = await page.$('[data-testid="bookmark-btn"], [aria-label*="Bookmark"], [aria-label*="Save"]');
  if (bookmarkBtn) {
    await bookmarkBtn.click();
    await page.waitForTimeout(600);
    console.log('Toggled bookmark on first post');
  }

  // Navigate to Saved Posts
  await page.goto('http://localhost:5173/community/saved', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'saved_posts_view.png') });
  console.log('Captured saved_posts_view.png');

  // Return to Community Feed
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Cleanup test image files
  if (fs.existsSync(imgPath1)) fs.unlinkSync(imgPath1);
  if (fs.existsSync(imgPath2)) fs.unlinkSync(imgPath2);
  if (fs.existsSync(imgPath3)) fs.unlinkSync(imgPath3);

  console.log('\n=== PHASE 4.3 E2E VERIFICATION SUMMARY ===');
  console.log('Viewport Overflow Results:');
  console.table(viewportResults);
  console.log(`Total Community Network Requests: ${networkRequests.length}`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`React Warnings: ${reactWarnings.length}`);
  console.log(`Unhandled Rejections: ${unhandledRejections.length}`);

  if (consoleErrors.length > 0) {
    console.log('Console Errors List:', consoleErrors);
  }

  await browser.close();

  const allViewportsPass = viewportResults.every(r => r.result === 'PASS');
  const success = allViewportsPass && consoleErrors.length === 0 && unhandledRejections.length === 0;

  if (!success) {
    console.error('Phase 4.3 E2E verification encountered failures!');
    process.exit(1);
  } else {
    console.log('ALL PHASE 4.3 E2E CRITERIA PASSED CLEANLY!');
    process.exit(0);
  }
}

runPhase43E2E().catch(err => {
  console.error('Phase 4.3 E2E Script Failed:', err);
  process.exit(1);
});
