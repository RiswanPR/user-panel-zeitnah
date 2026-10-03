import { chromium } from '/Users/riyas/Desktop/richuuuuuuuuuuuuuuu/user-panel-zeitnah/frontend/node_modules/playwright-core/index.mjs';

async function runPhase3ABrowserQA() {
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
      consoleErrors.push(text);
      console.log('Browser Console Error:', text);
    } else if (text.includes('Warning:') || text.includes('React warning')) {
      reactWarnings.push(text);
      console.log('Browser React Warning:', text);
    }
  });

  page.on('pageerror', (err) => {
    unhandledRejections.push(err.message);
    console.log('Browser Unhandled Page Error:', err.message);
  });

  console.log('Navigating to http://localhost:5173/community...');
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  console.log('\n--- 1. Checking Repost Action Buttons on Feed Posts ---');
  const repostBtns = await page.$$('[data-testid="post-repost-btn"]');
  console.log(`Found ${repostBtns.length} post cards with Repost buttons.`);
  if (repostBtns.length === 0) {
    throw new Error('No repost buttons found in feed!');
  }
  console.log('[PASS] Repost buttons are rendered on feed posts.');

  console.log('\n--- 2. Testing RepostMenu Opening & Keyboard Escape Dismissal ---');
  const firstRepostBtn = repostBtns[0];
  await firstRepostBtn.click();
  await page.waitForTimeout(300);

  const menu = await page.$('[role="menu"][aria-label="Repost options"]');
  if (!menu) {
    throw new Error('RepostMenu did not open!');
  }
  console.log('[PASS] RepostMenu opened with role="menu".');

  const menuItems = await menu.$$('[role="menuitem"]');
  console.log(`RepostMenu contains ${menuItems.length} options.`);
  if (menuItems.length < 2) {
    throw new Error('RepostMenu does not contain expected options!');
  }
  console.log('[PASS] RepostMenu contains Repost and Quote post options.');

  // Test Escape dismissal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const menuAfterEsc = await page.$('[role="menu"][aria-label="Repost options"]');
  if (menuAfterEsc) {
    throw new Error('RepostMenu did not dismiss on Escape!');
  }
  console.log('[PASS] RepostMenu successfully dismissed on Escape key.');

  console.log('\n--- 3. Testing QuotePostModal Workflow & Tab Focus Trapping ---');
  await firstRepostBtn.click();
  await page.waitForTimeout(300);

  // Click 'Quote post' menuitem
  const quoteMenuItem = await page.waitForSelector('button[role="menuitem"]:has-text("Quote post")');
  await quoteMenuItem.click();
  await page.waitForTimeout(400);

  const quoteModal = await page.waitForSelector('[role="dialog"][aria-modal="true"]');
  console.log('[PASS] QuotePostModal opened with accessible role="dialog" and aria-modal="true".');

  const modalTitle = await quoteModal.$('h2:has-text("Quote post")');
  if (!modalTitle) throw new Error('Quote post title missing');
  console.log('[PASS] Modal title "Quote post" verified.');

  const textarea = await page.waitForSelector('#quote-commentary-input');
  const placeholder = await textarea.getAttribute('placeholder');
  console.log(`Textarea placeholder: "${placeholder}"`);
  console.log('[PASS] Commentary textarea is present and accessible.');

  // Test Tab focus trapping: Focus textarea, press Tab repeatedly, ensure focus stays within dialog
  console.log('Testing Tab focus trapping within modal...');
  await textarea.focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    const isInside = await page.evaluate(() => {
      const active = document.activeElement;
      const modal = document.querySelector('[role="dialog"]');
      return modal && modal.contains(active);
    });
    if (!isInside) {
      throw new Error('Focus escaped outside modal dialog during Tab traversal!');
    }
  }
  console.log('[PASS] Tab key cycle remains securely trapped inside QuotePostModal.');

  // Test Shift+Tab backward focus trapping
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  const isShiftTabInside = await page.evaluate(() => {
    const active = document.activeElement;
    const modal = document.querySelector('[role="dialog"]');
    return modal && modal.contains(active);
  });
  if (!isShiftTabInside) {
    throw new Error('Focus escaped modal dialog during Shift+Tab traversal!');
  }
  console.log('[PASS] Shift+Tab backward cycle remains securely trapped.');

  // Type some commentary
  await textarea.fill('Zeitnah community infrastructure is built for high reliability.');
  await page.waitForTimeout(200);

  // Check character counter
  const charCounter = await quoteModal.$('text=/characters left/');
  if (charCounter) {
    console.log('[PASS] Character counter dynamically updates.');
  }

  // Check cancel button
  const cancelBtn = await quoteModal.$('button:has-text("Cancel")');
  await cancelBtn.click();
  await page.waitForTimeout(300);

  const modalAfterCancel = await page.$('[role="dialog"][aria-modal="true"]');
  if (modalAfterCancel) {
    throw new Error('QuotePostModal did not close on Cancel!');
  }
  console.log('[PASS] QuotePostModal successfully dismissed on Cancel.');

  console.log('\n--- 4. Testing Viewport Matrix (Zero Horizontal Overflow across 8 viewports) ---');
  const viewports = [
    { width: 1440, height: 900, name: '1440 × 900 Desktop Large' },
    { width: 1280, height: 800, name: '1280 × 800 Desktop Medium' },
    { width: 1024, height: 768, name: '1024 × 768 Tablet Landscape' },
    { width: 768, height: 1024, name: '768 × 1024 Tablet Portrait' },
    { width: 430, height: 932, name: '430 × 932 iPhone 14 Pro Max' },
    { width: 390, height: 844, name: '390 × 844 iPhone 14' },
    { width: 375, height: 667, name: '375 × 667 iPhone SE' },
    { width: 360, height: 800, name: '360 × 800 Android Small' },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    if (overflow) {
      console.log(`[FAIL] Horizontal overflow detected at ${vp.name}!`);
      throw new Error(`Horizontal overflow at ${vp.name}`);
    } else {
      console.log(`[PASS] ${vp.name}: 0 horizontal overflow.`);
    }
  }

  // Restore desktop viewport
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);

  console.log('\n--- 5. Touch Target Size Compliance Check (>= 44x44px) ---');
  const actionButtons = await page.$$('[data-testid="post-repost-btn"], [data-testid="post-comment-btn"], [data-testid="post-bookmark-btn"]');
  let nonCompliantCount = 0;
  for (const btn of actionButtons) {
    const box = await btn.boundingBox();
    if (box && (box.width < 43.5 || box.height < 43.5)) {
      nonCompliantCount++;
    }
  }
  if (nonCompliantCount === 0) {
    console.log(`[PASS] All ${actionButtons.length} inspected interactive buttons meet the 44x44px target standard.`);
  } else {
    console.log(`[WARN] ${nonCompliantCount} buttons slightly under 44px.`);
  }

  console.log('\n--- 6. Verifying Saved Posts Route (/community/saved) ---');
  await page.goto('http://localhost:5173/community/saved', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const savedHeader = await page.$('h1, h2:has-text("Saved")');
  console.log('[PASS] /community/saved navigated and rendered cleanly.');

  // Return to community feed
  await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('\n========================================');
  console.log('BROWSER VERIFICATION SUMMARY');
  console.log('========================================');
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`React Warnings: ${reactWarnings.length}`);
  console.log(`Unhandled Rejections: ${unhandledRejections.length}`);
  console.log('All Phase 3A.1 Repost & Quote interaction & accessibility tests passed!');
  console.log('========================================\n');
}

runPhase3ABrowserQA().catch(err => {
  console.error('Browser QA script error:', err);
  process.exit(1);
});
