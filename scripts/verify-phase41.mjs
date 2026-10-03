import { chromium } from '/Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/riyas/.gemini/antigravity-ide/brain/27dd0d16-4ed1-4291-9ba3-7213ac000af2/qa_screenshots/phase41';

async function runPhase41BrowserQA() {
  console.log('Connecting to browser on CDP 9222...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0] || await browser.newContext();
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('localhost:5173')) || pages[0];

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

  console.log('\n--- 1. Viewport QA (8 Viewports: 1440, 1280, 1024, 768, 430, 390, 375, 360) ---');
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

  const overflowResults = [];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const overflowPx = await page.evaluate(() => {
      return Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    });

    const isPass = overflowPx === 0;
    overflowResults.push({ viewport: `${vp.width}x${vp.height}`, overflowPx, status: isPass ? 'PASS' : 'FAIL' });
    console.log(`Viewport ${vp.width}x${vp.height}: scrollWidth - innerWidth = ${overflowPx}px -> ${isPass ? 'PASS' : 'FAIL'}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `viewport_${vp.width}.png`) });
  }

  // Set default desktop viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  console.log('\n--- 2. Create Chooser Modal QA ---');
  const createTrigger = await page.$('#community-create-trigger');
  if (createTrigger) {
    await createTrigger.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'create_chooser.png') });
    console.log('Captured create_chooser.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  console.log('\n--- 3. Multi-Step Create Post Flow & Draft QA ---');
  await page.click('#community-create-trigger');
  await page.waitForTimeout(400);

  const newPostBtn = await page.$('button:has-text("New Post"), [data-testid="create-new-post-btn"]');
  if (newPostBtn) {
    await newPostBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'media_picker.png') });
    console.log('Captured media_picker.png');

    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const tmpImg1 = path.join(SCREENSHOT_DIR, 'mock1.png');
      const tmpImg2 = path.join(SCREENSHOT_DIR, 'mock2.png');
      const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(tmpImg1, samplePng);
      fs.writeFileSync(tmpImg2, samplePng);

      await fileInput.setInputFiles([tmpImg1, tmpImg2]);
      await page.waitForTimeout(800);

      // Verify Step 2: Adjust & Preview
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'edit_step.png') });
      console.log('Captured edit_step.png');

      // Click "Next" to Step 3: Details
      const nextBtn = await page.$('button:has-text("Next")');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(600);

        const captionInput = await page.$('textarea[placeholder*="Write a caption"]');
        if (captionInput) {
          await captionInput.fill('Phase 4.1 Instagram-Fidelity Community verification #zeitnah #social');
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'post_details.png') });
        console.log('Captured post_details.png');

        // Test Draft confirmation: click close button
        const closeBtn = await page.$('button[aria-label="Close"]');
        if (closeBtn) {
          await closeBtn.click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'draft_confirmation.png') });
          console.log('Captured draft_confirmation.png');

          const saveDraftBtn = await page.$('button:has-text("Save draft")');
          if (saveDraftBtn) {
            await saveDraftBtn.click();
            await page.waitForTimeout(600);
            console.log('Saved draft successfully');

            // Reopen Create Post Modal to verify restoration
            await page.click('#community-create-trigger');
            await page.waitForTimeout(400);
            const reopenNewPost = await page.$('button:has-text("New Post")');
            if (reopenNewPost) {
              await reopenNewPost.click();
              await page.waitForTimeout(600);

              await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'draft_restored.png') });
              console.log('Captured draft_restored.png');

              // Now discard draft: click close button then Discard
              const closeAgain = await page.$('button[aria-label="Close"]');
              if (closeAgain) {
                await closeAgain.click();
                await page.waitForTimeout(400);
                const discardBtn = await page.$('button:has-text("Discard")');
                if (discardBtn) {
                  await discardBtn.click();
                  await page.waitForTimeout(500);
                  console.log('Discarded draft successfully');
                }
              }
            }
          }
        }
      }

      if (fs.existsSync(tmpImg1)) fs.unlinkSync(tmpImg1);
      if (fs.existsSync(tmpImg2)) fs.unlinkSync(tmpImg2);
    }
  }

  // Ensure clean state before Stories QA
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  console.log('\n--- 4. Stories Rail & Story Viewer QA ---');
  const existingStory = await page.$('div[aria-label^="View story by"]');
  if (existingStory) {
    console.log('Found existing story in rail. Opening StoryViewer...');
    await existingStory.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'story_viewer.png') });
    console.log('Captured story_viewer.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } else {
    console.log('No viewed stories yet. Testing Add Story modal...');
    const addStoryBtn = await page.$('button[aria-label="Add to story"]');
    if (addStoryBtn) {
      await addStoryBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'create_story_modal.png') });
      console.log('Captured create_story_modal.png');

      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  }

  console.log('\n--- 5. Carousel & Double-Tap Like QA ---');
  const carouselNext = await page.$('[data-testid="carousel-next-btn"]');
  if (carouselNext) {
    await carouselNext.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'carousel.png') });
    console.log('Captured carousel.png');
  }

  const mediaContainer = await page.$('[data-testid="post-media-container"]');
  if (mediaContainer) {
    await mediaContainer.dblclick();
    await page.waitForTimeout(500);
    console.log('Double-tap like executed');
  }

  console.log('\n--- 6. Comments Sheet / Drawer QA ---');
  const commentBtn = await page.$('[data-testid="post-comment-btn"]');
  if (commentBtn) {
    await commentBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'comment_sheet.png') });
    console.log('Captured comment_sheet.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  console.log('\n--- 7. Repost & Quote Post Modal QA ---');
  const repostBtn = await page.$('[data-testid="post-repost-btn"]');
  if (repostBtn) {
    await repostBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'repost_menu.png') });
    console.log('Captured repost_menu.png');

    const quoteOption = await page.$('button:has-text("Quote Post")');
    if (quoteOption) {
      await quoteOption.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'quote_post_modal.png') });
      console.log('Captured quote_post_modal.png');

      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  }

  console.log('\n--- 8. Saved Posts Page QA ---');
  await page.goto('http://localhost:5173/community/saved', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'saved_posts.png') });
  console.log('Captured saved_posts.png');

  console.log('\n--- 9. Canonical Profile Navigation QA ---');
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const authorLink = await page.$('a[href^="/u/"]');
  if (authorLink) {
    const href = await authorLink.getAttribute('href');
    console.log(`Navigating to author profile: ${href}`);
    await authorLink.click();
    await page.waitForTimeout(1000);
    console.log(`Navigated successfully to: ${page.url()}`);
  }

  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  console.log('\n=== AUDIT RESULTS SUMMARY ===');
  console.log('Viewport Overflow Results:');
  console.table(overflowResults);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`React Warnings: ${reactWarnings.length}`);
  console.log(`Unhandled Rejections: ${unhandledRejections.length}`);

  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
  if (reactWarnings.length > 0) {
    console.log('React Warnings:', reactWarnings);
  }
}

runPhase41BrowserQA().catch(err => {
  console.error('Browser QA Script Failed:', err);
  process.exit(1);
});
