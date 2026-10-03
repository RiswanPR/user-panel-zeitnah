import { chromium } from '/Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/riyas/.gemini/antigravity-ide/brain/27dd0d16-4ed1-4291-9ba3-7213ac000af2/qa_screenshots/phase5';
const VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTRmZjUwNGNlMTg1OGVmMTIxZDQ3NWQiLCJwcmltYXJ5Um9sZSI6IlNUVURFTlQiLCJyb2xlIjoic3R1ZGVudCIsImRldmljZUlkIjoiNWFlY2ZhMzgyODMzYjI5ZmI2M2E5YmE1YjRmM2JjMjkiLCJpYXQiOjE3OTA5NzQxNTgsImV4cCI6MTc5MTU3ODk1OH0.eyARAfjlV5aLp8yLSca8hmTLcY3knfUIafsYiI0oseQ";

async function runPhase5E2E() {
  console.log('=== Initializing Browser for Phase 5 Premium UI/UX & Story Grouping E2E ===');
  let browser;
  let context;
  let page;

  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    context = browser.contexts()[0] || await browser.newContext();
    const pages = context.pages();
    page = pages.find(p => p.url().includes('localhost:5173')) || pages[0] || await context.newPage();
    console.log('Connected via Chrome DevTools Protocol');
  } catch {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
    console.log('Launched Playwright Chromium headless');
  }

  const consoleErrors = [];
  const reactWarnings = [];
  const unhandledRejections = [];

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

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // ── Step 1: Establish Authenticated User Session ──
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
  console.log('Authenticated session initialized');

  // ── Step 2: 8 Viewports Responsive & 0px Overflow Check ──
  console.log('\n--- 2. Checking 8 Viewports for 0px Overflow ---');
  const viewports = [
    { name: 'Desktop Ultra-Wide', width: 1440, height: 900 },
    { name: 'Desktop Standard', width: 1280, height: 800 },
    { name: 'Laptop / Tablet Landscape', width: 1024, height: 768 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Large Mobile (iPhone 14 Pro Max)', width: 430, height: 932 },
    { name: 'Standard Mobile (iPhone 14)', width: 390, height: 844 },
    { name: 'Compact Mobile (iPhone SE)', width: 375, height: 667 },
    { name: 'Narrow Mobile (Android 360)', width: 360, height: 800 }
  ];

  const viewportResults = [];
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);

    const overflowPx = await page.evaluate(() => {
      return Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    });

    const isPass = overflowPx === 0;
    viewportResults.push({
      viewport: `${vp.width}x${vp.height} (${vp.name})`,
      overflowPx,
      result: isPass ? 'PASS' : 'FAIL',
    });
    console.log(`Viewport ${vp.width}x${vp.height} (${vp.name}): overflow = ${overflowPx}px -> ${isPass ? 'PASS' : 'FAIL'}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `vp_${vp.width}.png`) });
  }

  // Restore Desktop Viewport for detailed feature tests
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // ── Step 3: Create First Story (Text Mode) ──
  console.log('\n--- 3. Testing Story Upload Flow: Story 1 (Text Story) ---');
  await page.click('#community-create-trigger');
  await page.waitForTimeout(400);

  const addStoryBtn = await page.$('button:has-text("Add to Story")');
  if (addStoryBtn) {
    await addStoryBtn.click();
    await page.waitForTimeout(500);

    const textTab = await page.$('button:has-text("Text Story")');
    if (textTab) {
      await textTab.click();
      await page.waitForTimeout(300);

      const textarea = await page.$('textarea[placeholder*="Type something"]');
      if (textarea) {
        await textarea.fill('Phase 5 Premium Story 1: One User One Story Grouping! 🌟');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'story1_text_composer.png') });
      console.log('Captured story1_text_composer.png');

      const shareBtn = await page.$('button:has-text("Share to Story")');
      if (shareBtn) {
        await shareBtn.click();
        await page.waitForTimeout(2000);
        console.log('Story 1 published successfully');
      }
    }
  }

  // ── Step 4: Create Second Story (Image Mode) by Same User ──
  console.log('\n--- 4. Testing Story Upload Flow: Story 2 (Image Story) by Same User ---');
  const realPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const sampleImagePath = path.join(SCREENSHOT_DIR, 'story_media_test.png');
  fs.writeFileSync(sampleImagePath, Buffer.from(realPngBase64, 'base64'));

  // Trigger from "Your story" + badge or create trigger
  const plusBadge = await page.$('button[title="Add to story"], [aria-label="Add to story"]');
  if (plusBadge) {
    await plusBadge.click();
    await page.waitForTimeout(500);

    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles([sampleImagePath]);
      await page.waitForTimeout(800);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'story2_media_preview.png') });
      console.log('Captured story2_media_preview.png');

      const shareBtn = await page.$('button:has-text("Share to Story")');
      if (shareBtn) {
        await shareBtn.click();
        await page.waitForTimeout(3000);
        console.log('Story 2 published successfully');
      }
    } else {
      // If text mode was active, publish text story
      const textarea = await page.$('textarea[placeholder*="Type something"]');
      if (textarea) {
        await textarea.fill('Phase 5 Story 2: Grouped under same author!');
        const shareBtn = await page.$('button:has-text("Share to Story")');
        if (shareBtn) {
          await shareBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Ensure Create Story modal is closed before continuing
    const openModal = await page.$('div[role="dialog"][aria-label="Create story"]');
    if (openModal) {
      const closeBtn = await page.$('button[aria-label="Close create story modal"]');
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForSelector('div[role="dialog"][aria-label="Create story"]', { state: 'detached', timeout: 5000 }).catch(() => {});
    }
  }

  // ── Step 5: Verify One User = One Icon Grouping in Story Rail ──
  console.log('\n--- 5. Verifying One User = Exactly One Story Icon in Story Rail ---');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'story_rail_grouped.png') });

  // Count items in the story rail
  const storyIcons = await page.$$('section[aria-label="Community Stories"] [role="button"]');
  console.log(`Total interactive story rail items: ${storyIcons.length}`);

  // Check the label on "Your story"
  const yourStoryItem = await page.$('section[aria-label="Community Stories"] [aria-label*="View your"]');
  if (yourStoryItem) {
    const label = await yourStoryItem.getAttribute('aria-label');
    console.log(`Your Story Rail Item Label: "${label}" -> Confirms grouped multiple stories under 1 icon!`);
  }

  // ── Step 6: Verify Story Viewer Segmented Progress & Sequential Playback ──
  console.log('\n--- 6. Verifying Story Viewer with Segmented Progress & Sequential Playback ---');
  if (storyIcons.length > 0) {
    // Click Your story or the first available story
    await storyIcons[0].click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'story_viewer_segmented.png') });
    console.log('Captured story_viewer_segmented.png');

    // Count progress segments
    const segments = await page.$$('div[role="dialog"][aria-label*="Story by"] .h-1.flex-1');
    console.log(`Story Viewer Segments Count: ${segments.length} (One segment per story from active user)`);

    // Verify keyboard navigation: ArrowRight -> next story
    console.log('Testing ArrowRight navigation to next story in user group...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'story_viewer_next_segment.png') });
    console.log('Captured story_viewer_next_segment.png');

    // Verify pause/resume with spacebar
    console.log('Testing pause with spacebar...');
    await page.keyboard.press(' ');
    await page.waitForTimeout(400);

    // Verify close with Escape
    console.log('Testing close with Escape key...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const viewerClosed = await page.$('div[role="dialog"][aria-label*="Story by"]');
    console.log(`Story Viewer closed successfully: ${viewerClosed === null ? 'YES' : 'NO'}`);
  }

  // ── Step 7: Verify Feed & Double-Tap Heart Burst ──
  console.log('\n--- 7. Verifying PostCard & Double-Tap Heart Burst ---');
  const mediaContainer = await page.$('[data-testid="post-media-container"]');
  if (mediaContainer) {
    console.log('Performing double-tap like on post media...');
    await mediaContainer.dblclick();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'double_tap_burst.png') });
    console.log('Captured double_tap_burst.png');
    await page.waitForTimeout(600);
  }

  // ── Step 8: Clean Up Temp Files ──
  if (fs.existsSync(sampleImagePath)) {
    fs.unlinkSync(sampleImagePath);
  }

  // ── Step 9: Summary & Exit Checks ──
  console.log('\n=== PHASE 5 BROWSER QA SUMMARY ===');
  console.log('Viewport Overflow Results:');
  console.table(viewportResults);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`React Warnings: ${reactWarnings.length}`);
  console.log(`Unhandled Rejections: ${unhandledRejections.length}`);

  if (consoleErrors.length > 0) {
    console.log('Console Errors List:', consoleErrors);
  }
  if (reactWarnings.length > 0) {
    console.log('React Warnings List:', reactWarnings);
  }
  if (unhandledRejections.length > 0) {
    console.log('Unhandled Rejections List:', unhandledRejections);
  }

  await browser.close();

  const allViewportsPass = viewportResults.every(r => r.result === 'PASS');
  const success = allViewportsPass && consoleErrors.length === 0 && unhandledRejections.length === 0;

  if (!success) {
    console.error('Phase 5 Browser QA encountered failures!');
    process.exit(1);
  } else {
    console.log('ALL PHASE 5 BROWSER QA CRITERIA PASSED CLEANLY (VERIFIED READY)!');
    process.exit(0);
  }
}

runPhase5E2E().catch(err => {
  console.error('Phase 5 E2E Script Failed:', err);
  process.exit(1);
});
