import { chromium } from '/Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/riyas/.gemini/antigravity-ide/brain/27dd0d16-4ed1-4291-9ba3-7213ac000af2/qa_screenshots/phase5_2';
const VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTRmZjUwNGNlMTg1OGVmMTIxZDQ3NWQiLCJwcmltYXJ5Um9sZSI6IlNUVURFTlQiLCJyb2xlIjoic3R1ZGVudCIsImRldmljZUlkIjoiNWFlY2ZhMzgyODMzYjI5ZmI2M2E5YmE1YjRmM2JjMjkiLCJpYXQiOjE3OTA5NzQxNTgsImV4cCI6MTc5MTU3ODk1OH0.eyARAfjlV5aLp8yLSca8hmTLcY3knfUIafsYiI0oseQ";

async function runPhase52Verification() {
  console.log('=== Starting Phase 5.2 Ultra-Premium Instagram-Level UI/UX Verification ===');
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

  // 1. Establish Authenticated Session
  console.log('\n--- 1. Authenticating Session in Browser ---');
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

  // 2. 8 Viewports Responsive & Overflow Check
  console.log('\n--- 2. Checking 8 Responsive Viewports for 0px Overflow ---');
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

  const viewportAudit = [];
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);

    const overflowPx = await page.evaluate(() => {
      return Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    });

    const isPass = overflowPx === 0;
    viewportAudit.push({
      viewport: `${vp.width}x${vp.height} (${vp.name})`,
      overflowPx,
      pass: isPass
    });
    console.log(`Viewport ${vp.width}x${vp.height} (${vp.name}): overflow = ${overflowPx}px -> ${isPass ? 'PASS' : 'FAIL'}`);
  }

  // 3. Capture 01_community_desktop_premium.png (1280x800)
  console.log('\n--- 3. Capturing 01_community_desktop_premium ---');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_community_desktop_premium.png') });
  console.log('Saved 01_community_desktop_premium.png');

  // 4. Capture 02_community_mobile_premium.png (390x844)
  console.log('\n--- 4. Capturing 02_community_mobile_premium ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_community_mobile_premium.png') });
  console.log('Saved 02_community_mobile_premium.png');

  // Restore Desktop for feature captures
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 5. Capture 03_story_rail_premium.png
  console.log('\n--- 5. Capturing 03_story_rail_premium ---');
  const storyRailElem = await page.$('section[aria-label="Community Stories"]');
  if (storyRailElem) {
    await storyRailElem.screenshot({ path: path.join(SCREENSHOT_DIR, '03_story_rail_premium.png') });
  } else {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_story_rail_premium.png') });
  }
  console.log('Saved 03_story_rail_premium.png');

  // 6. Capture 04_story_viewer_premium.png
  console.log('\n--- 6. Capturing 04_story_viewer_premium ---');
  const storyIcon = await page.$('section[aria-label="Community Stories"] [role="button"]');
  if (storyIcon) {
    await storyIcon.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_story_viewer_premium.png') });
    console.log('Saved 04_story_viewer_premium.png');

    // Close Story Viewer
    const closeStoryBtn = await page.$('button[aria-label="Close story viewer"]');
    if (closeStoryBtn) {
      await closeStoryBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(600);
  }

  // 7. Capture 05_create_post_premium.png
  console.log('\n--- 7. Capturing 05_create_post_premium ---');
  await page.click('#community-create-trigger');
  await page.waitForTimeout(400);

  const postOption = await page.$('button:has-text("New Post"), button:has-text("Create Post")');
  if (postOption) {
    await postOption.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_create_post_premium.png') });
    console.log('Saved 05_create_post_premium.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 8. Capture 06_create_story_premium.png
  console.log('\n--- 8. Capturing 06_create_story_premium ---');
  await page.click('#community-create-trigger');
  await page.waitForTimeout(400);

  const storyOption = await page.$('button:has-text("Add to Story")');
  if (storyOption) {
    await storyOption.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_create_story_premium.png') });
    console.log('Saved 06_create_story_premium.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 9. Capture 07_comment_drawer_premium.png
  console.log('\n--- 9. Capturing 07_comment_drawer_premium ---');
  const commentBtn = await page.$('button[data-testid="post-comment-btn"], button[aria-label*="comments"]');
  if (commentBtn) {
    await commentBtn.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_comment_drawer_premium.png') });
    console.log('Saved 07_comment_drawer_premium.png');

    const closeComments = await page.$('button[aria-label="Close comments"]');
    if (closeComments) {
      await closeComments.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  }

  // 10. Capture 08_saved_posts_premium.png
  console.log('\n--- 10. Capturing 08_saved_posts_premium ---');
  await page.goto('http://localhost:5173/community/saved', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_saved_posts_premium.png') });
  console.log('Saved 08_saved_posts_premium.png');

  // Summary
  console.log('\n======================================================');
  console.log('=== PHASE 5.2 ULTRA-PREMIUM VERIFICATION RESULTS ===');
  console.log('======================================================');
  console.log('1. Responsive Viewport Audits:');
  viewportAudit.forEach(v => {
    console.log(`   - ${v.viewport}: overflow = ${v.overflowPx}px [${v.pass ? 'PASS' : 'FAIL'}]`);
  });
  console.log(`2. Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) consoleErrors.forEach(e => console.log('   - ' + e));
  console.log(`3. React Warnings: ${reactWarnings.length}`);
  if (reactWarnings.length > 0) reactWarnings.forEach(w => console.log('   - ' + w));
  console.log(`4. Unhandled Rejections: ${unhandledRejections.length}`);
  if (unhandledRejections.length > 0) unhandledRejections.forEach(r => console.log('   - ' + r));
  console.log('======================================================\n');

  if (browser) await browser.close();
}

runPhase52Verification().catch(err => {
  console.error('Phase 5.2 Verification failed:', err);
  process.exit(1);
});
