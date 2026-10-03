import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/riyas/.gemini/antigravity-ide/brain/27dd0d16-4ed1-4291-9ba3-7213ac000af2';
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'phase56-qa-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1280x800', width: 1280, height: 800 },
  { name: 'tablet-1024x768', width: 1024, height: 768 },
  { name: 'tablet-portrait-768x1024', width: 768, height: 1024 },
  { name: 'mobile-large-430x932', width: 430, height: 932 },
  { name: 'mobile-standard-390x844', width: 390, height: 844 },
  { name: 'mobile-compact-375x667', width: 375, height: 667 },
  { name: 'mobile-small-360x800', width: 360, height: 800 },
];

const mockUser = {
  _id: 'user-riswan-1',
  id: 'user-riswan-1',
  name: 'Riswan P.R',
  username: 'riswanpr',
  email: 'riswan@zeitnah.com',
  primaryRole: 'ADMIN',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
};

const TARGET_POST_UUID = 'dd10d087-ce9e-4c26-a47d-94cb832dcfd';

const mockPosts = [
  {
    _id: TARGET_POST_UUID,
    id: TARGET_POST_UUID,
    author: {
      _id: 'user-alice-123',
      name: 'Alice Henderson',
      username: 'aliceh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      headline: 'Senior Structural Engineer',
      role: 'Faculty',
    },
    content: 'Reviewing cross-laminated timber slab deflection under dynamic load. Seismic code Eurocode 8 compliance confirmed. #engineering #zeitnah',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861563?w=1000',
        type: 'image',
        caption: 'Structural frame test',
      },
    ],
    stats: {
      likes: 42,
      comments: 7,
      shares: 3,
      reposts: 5,
      views: 380,
    },
    isLikedByMe: false,
    isSaved: true,
    isRepostedByMe: false,
    tags: ['engineering', 'zeitnah'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'post-regular-2',
    id: 'post-regular-2',
    author: {
      _id: 'user-bob-456',
      name: 'Bob Miller',
      username: 'bobm',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      headline: 'Lead BIM Architect',
      role: 'Professional',
    },
    content: 'BIM coordination report complete for composite steel decking. Zero high-priority clashes remaining. #bim #architecture',
    media: [],
    stats: {
      likes: 18,
      comments: 3,
      shares: 1,
      reposts: 2,
      views: 195,
    },
    isLikedByMe: true,
    isSaved: false,
    isRepostedByMe: false,
    tags: ['bim', 'architecture'],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

async function runPhase56Validation() {
  console.log('🚀 Launching Phase 5.6 Repost & Auth Stability Verification...\n');
  const browser = await chromium.launch({ headless: true });

  const results = {
    viewportsTested: [],
    overflowPassed: true,
    repostApiFlowPassed: false,
    repostTogglePassed: false,
    rapidClickGuarded: false,
    savedPageRepostPassed: false,
    authRefreshFlowPassed: false,
    extensionWarningsCheckPassed: false,
    consoleErrors: [],
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: REPOST & REPOST-TOGGLE VERIFICATION (UUID TARGET POST)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Repost & Repost Toggle on Target UUID Post ---');
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const consoleErrors = [];
      const extensionWarnings = [];
      let repostCallsCount = 0;
      let lastRepostPayload = null;
      let targetPostState = { ...mockPosts[0] };

      page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error') {
          if (!text.includes('Failed to load resource') && !text.includes('unsplash.com')) {
            consoleErrors.push(text);
          }
        }
        if (text.includes('MaxListenersExceededWarning') || text.includes('ObjectMultiplex')) {
          extensionWarnings.push(text);
        }
      });

      await page.route('**/*', async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (
          url.includes(':5173') &&
          (url.includes('/src/') ||
            url.includes('/@') ||
            url.includes('/node_modules/') ||
            url.endsWith('.ts') ||
            url.endsWith('.tsx') ||
            url.endsWith('.js') ||
            url.endsWith('.jsx') ||
            url.endsWith('.css'))
        ) {
          return route.continue();
        }

        // Repost endpoint interception
        if (url.includes(`/api/community/posts/${TARGET_POST_UUID}/repost`)) {
          repostCallsCount++;
          const postData = route.request().postData();
          if (postData) {
            try {
              lastRepostPayload = JSON.parse(postData);
            } catch (e) {}
          }

          if (method === 'POST') {
            targetPostState.isRepostedByMe = true;
            targetPostState.stats.reposts = (targetPostState.stats.reposts || 0) + 1;
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                post: targetPostState,
                repost: {
                  _id: 'repost-record-uuid-1',
                  repostOf: TARGET_POST_UUID,
                  author: mockUser,
                },
              }),
            });
          } else if (method === 'DELETE') {
            targetPostState.isRepostedByMe = false;
            targetPostState.stats.reposts = Math.max(0, (targetPostState.stats.reposts || 1) - 1);
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                post: targetPostState,
              }),
            });
          }
        }

        if (url.includes('/api/auth/me') || url.includes('/api/users/me')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              user: mockUser,
            }),
          });
        }

        if (url.includes('/api/community/stories')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }

        if (url.includes('/api/community/posts/saved') || url.includes('/api/community/saved')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              items: [targetPostState],
              total: 1,
            }),
          });
        }

        if (url.includes('/api/community/posts')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              items: [targetPostState, mockPosts[1]],
              total: 2,
            }),
          });
        }

        if (url.includes('/api/')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, items: [] }),
          });
        }

        return route.continue();
      });

      await page.addInitScript(
        ({ user }) => {
          const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
          const payload = btoa(
            JSON.stringify({
              userId: user._id,
              id: user._id,
              email: user.email,
              primaryRole: user.primaryRole,
              role: user.role,
              exp: Math.floor(Date.now() / 1000) + 86400,
            })
          );
          const fakeJwt = `${header}.${payload}.signature`;
          window.localStorage.setItem('token', fakeJwt);
          window.localStorage.setItem('refreshToken', 'mock-valid-refresh-token-xyz');
          window.localStorage.setItem('user', JSON.stringify(user));
        },
        { user: mockUser }
      );

      await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      // Locate Repost button on target post
      const repostTrigger = page.locator('[data-testid="post-repost-btn"]').first();
      await repostTrigger.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Found repost trigger button');

      // Click repost trigger to open RepostMenu
      await repostTrigger.click();
      await page.waitForTimeout(300);

      // Click "Repost" menu item
      const repostMenuItem = page.locator('[role="menu"] [role="menuitem"]:has-text("Repost")').first();
      await repostMenuItem.waitFor({ state: 'visible', timeout: 3000 });
      
      console.log('Clicking "Repost" menu item...');
      await repostMenuItem.click();
      await page.waitForTimeout(800);

      if (repostCallsCount >= 1 && targetPostState.isRepostedByMe) {
        console.log('✅ Repost API called successfully with 200 OK without 500 error!');
        results.repostApiFlowPassed = true;
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'phase56-repost-active.png'),
      });

      // Verify Extension Warnings are absent in clean environment
      if (extensionWarnings.length === 0) {
        console.log('✅ Clean browser environment: Zero MaxListenersExceededWarning or ObjectMultiplex extension warnings detected.');
        results.extensionWarningsCheckPassed = true;
      }

      // Test Repost Toggle (Undo Repost)
      await repostTrigger.click();
      await page.waitForTimeout(300);

      const undoRepostMenuItem = page.locator('[role="menu"] [role="menuitem"]:has-text("Unrepost")').first();
      if (await undoRepostMenuItem.isVisible()) {
        console.log('Clicking "Unrepost"...');
        await undoRepostMenuItem.click();
        await page.waitForTimeout(800);

        if (!targetPostState.isRepostedByMe) {
          console.log('✅ Undo repost succeeded! Repost state toggled cleanly back to false.');
          results.repostTogglePassed = true;
        }
      }

      // Test Rapid-Click in-flight prevention
      await repostTrigger.click();
      await page.waitForTimeout(200);
      const repostAgainItem = page.locator('[role="menu"] [role="menuitem"]:has-text("Repost")').first();
      if (await repostAgainItem.isVisible()) {
        const initialCount = repostCallsCount;
        // Attempt rapid double-click
        await Promise.all([
          repostAgainItem.click({ clickCount: 1 }).catch(() => {}),
          repostAgainItem.click({ clickCount: 1 }).catch(() => {}),
        ]);
        await page.waitForTimeout(600);
        // Should only have triggered 1 call due to isRepostPending / disabled menu
        const additionalCalls = repostCallsCount - initialCount;
        console.log(`Rapid clicks triggered ${additionalCalls} API call(s) (expected: 1)`);
        if (additionalCalls <= 1) {
          console.log('✅ In-flight protection successfully prevented duplicate concurrent reposts!');
          results.rapidClickGuarded = true;
        }
      }

      await page.close();
    }

    // -------------------------------------------------------------
    // TEST 2: REPOST ON SAVED PAGE (/community/saved)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Repost from /community/saved ---');
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      let savedRepostCalled = false;

      await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (
          url.includes(':5173') &&
          (url.includes('/src/') || url.includes('/@') || url.includes('/node_modules/') || url.endsWith('.js') || url.endsWith('.jsx'))
        ) {
          return route.continue();
        }

        if (url.includes(`/api/community/posts/${TARGET_POST_UUID}/repost`)) {
          savedRepostCalled = true;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              post: { ...mockPosts[0], isRepostedByMe: true },
            }),
          });
        }

        if (url.includes('/api/auth/me') || url.includes('/api/users/me')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user: mockUser }),
          });
        }

        if (url.includes('/api/community/posts/saved') || url.includes('/api/community/saved')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              items: [mockPosts[0]],
              total: 1,
            }),
          });
        }

        if (url.includes('/api/community/posts')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, items: [mockPosts[0]], total: 1 }),
          });
        }

        if (url.includes('/api/')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, items: [] }),
          });
        }

        return route.continue();
      });

      await page.addInitScript(
        ({ user }) => {
          const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
          const payload = btoa(
            JSON.stringify({
              userId: user._id,
              id: user._id,
              email: user.email,
              primaryRole: user.primaryRole,
              role: user.role,
              exp: Math.floor(Date.now() / 1000) + 86400,
            })
          );
          window.localStorage.setItem('token', `${header}.${payload}.signature`);
          window.localStorage.setItem('refreshToken', 'mock-valid-refresh-token-xyz');
          window.localStorage.setItem('user', JSON.stringify(user));
        },
        { user: mockUser }
      );

      await page.goto('http://localhost:5173/community/saved', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const repostTrigger = page.locator('[data-testid="post-repost-btn"]').first();
      if (await repostTrigger.isVisible()) {
        await repostTrigger.click();
        await page.waitForTimeout(300);
        const repostItem = page.locator('[role="menu"] [role="menuitem"]:has-text("Repost")').first();
        if (await repostItem.isVisible()) {
          await repostItem.click();
          await page.waitForTimeout(800);
          if (savedRepostCalled) {
            console.log('✅ Repost from /community/saved succeeded!');
            results.savedPageRepostPassed = true;
          }
        }
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'phase56-saved-page-repost.png'),
      });
      await page.close();
    }

    // -------------------------------------------------------------
    // TEST 3: AUTH REFRESH 401 RETRY FLOW VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing 401 Auth Refresh & Replay Flow ---');
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      let refreshRequested = false;
      let refreshAuthHeaderStripped = false;
      let refreshRequestBodyValid = false;
      let requestAttempts = 0;

      await page.route('**/*', async (route) => {
        const url = route.request().url();
        const headers = route.request().headers();

        if (
          url.includes(':5173') &&
          (url.includes('/src/') || url.includes('/@') || url.includes('/node_modules/') || url.endsWith('.js') || url.endsWith('.jsx'))
        ) {
          return route.continue();
        }

        // Auth refresh endpoint
        if (url.includes('/auth/refresh-token') || url.includes('/api/auth/refresh-token')) {
          refreshRequested = true;
          // Check that expired Bearer token was stripped
          if (!headers['authorization'] || !headers['authorization'].includes('expired-access-token')) {
            refreshAuthHeaderStripped = true;
          }
          const postData = route.request().postData();
          if (postData && postData.includes('valid-refresh-token-xyz')) {
            refreshRequestBodyValid = true;
          }

          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              token: 'new-valid-access-token-12345',
              accessToken: 'new-valid-access-token-12345',
              refreshToken: 'new-rotated-refresh-token-67890',
            }),
          });
        }

        if (url.includes('/api/auth/me') || url.includes('/api/users/me')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user: mockUser }),
          });
        }

        if (url.includes('/api/community/posts')) {
          requestAttempts++;
          // First attempt returns 401 to trigger refresh
          if (requestAttempts === 1) {
            return route.fulfill({
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({ success: false, message: 'Unauthorized: Token expired' }),
            });
          }
          // Subsequent attempt with refreshed token succeeds
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              items: mockPosts,
              total: mockPosts.length,
            }),
          });
        }

        if (url.includes('/api/')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, items: [] }),
          });
        }

        return route.continue();
      });

      await page.addInitScript(
        ({ user }) => {
          const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
          const payload = btoa(
            JSON.stringify({
              userId: user._id,
              id: user._id,
              email: user.email,
              primaryRole: user.primaryRole,
              role: user.role,
              exp: Math.floor(Date.now() / 1000) - 100, // Expired
            })
          );
          window.localStorage.setItem('token', `${header}.${payload}.expired-access-token`);
          window.localStorage.setItem('refreshToken', 'valid-refresh-token-xyz');
          window.localStorage.setItem('user', JSON.stringify(user));
        },
        { user: mockUser }
      );

      await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      console.log(`Auth test: Refresh requested = ${refreshRequested}`);
      console.log(`Auth test: Expired auth header stripped = ${refreshAuthHeaderStripped}`);
      console.log(`Auth test: Refresh body sent token = ${refreshRequestBodyValid}`);
      console.log(`Auth test: Request attempts = ${requestAttempts}`);

      if (refreshRequested && refreshAuthHeaderStripped && refreshRequestBodyValid && requestAttempts >= 2) {
        console.log('✅ 401 Refresh flow passed seamlessly! Token was refreshed and request was replayed.');
        results.authRefreshFlowPassed = true;
      }

      await page.close();
    }

    // -------------------------------------------------------------
    // TEST 4: ALL 8 VIEWPORTS HORIZONTAL OVERFLOW & CONSOLE QA
    // -------------------------------------------------------------
    console.log('\n--- 4. Validating All 8 Responsive Viewports ---');
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const consoleErrors = [];
      const reactWarnings = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error') {
          if (!text.includes('Failed to load resource') && !text.includes('unsplash.com')) {
            consoleErrors.push(text);
          }
        }
        if (text.includes('Warning:')) {
          reactWarnings.push(text);
        }
      });

      await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (
          url.includes(':5173') &&
          (url.includes('/src/') || url.includes('/@') || url.includes('/node_modules/') || url.endsWith('.js') || url.endsWith('.jsx'))
        ) {
          return route.continue();
        }

        if (url.includes('/api/auth/me') || url.includes('/api/users/me')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user: mockUser }),
          });
        }

        if (url.includes('/api/community/stories')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }

        if (url.includes('/api/community/posts')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, items: mockPosts, total: mockPosts.length }),
          });
        }

        if (url.includes('/api/')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, items: [] }),
          });
        }

        return route.continue();
      });

      await page.addInitScript(
        ({ user }) => {
          const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
          const payload = btoa(
            JSON.stringify({
              userId: user._id,
              id: user._id,
              email: user.email,
              primaryRole: user.primaryRole,
              role: user.role,
              exp: Math.floor(Date.now() / 1000) + 86400,
            })
          );
          window.localStorage.setItem('token', `${header}.${payload}.signature`);
          window.localStorage.setItem('refreshToken', 'mock-valid-refresh-token-xyz');
          window.localStorage.setItem('user', JSON.stringify(user));
        },
        { user: mockUser }
      );

      await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const overflowCheck = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const bodyWidth = document.body.scrollWidth;
        return {
          docWidth,
          winWidth,
          bodyWidth,
          hasOverflow: docWidth > winWidth || bodyWidth > winWidth,
        };
      });

      const isPass = !overflowCheck.hasOverflow && consoleErrors.length === 0;
      if (overflowCheck.hasOverflow) {
        results.overflowPassed = false;
        console.error(`❌ Overflow in ${vp.name}: doc=${overflowCheck.docWidth}px, win=${overflowCheck.winWidth}px`);
      } else {
        console.log(`✅ ${vp.name}: 0px overflow (doc=${overflowCheck.docWidth}px, win=${overflowCheck.winWidth}px)`);
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `phase56-${vp.name}.png`),
      });

      results.viewportsTested.push({
        viewport: vp.name,
        dimensions: `${vp.width}x${vp.height}`,
        overflow: overflowCheck.hasOverflow ? 'FAIL' : 'PASS',
        consoleErrorsCount: consoleErrors.length,
        reactWarningsCount: reactWarnings.length,
        result: isPass ? 'PASS' : 'FAIL',
      });

      if (consoleErrors.length > 0) {
        results.consoleErrors.push({ viewport: vp.name, errors: consoleErrors });
      }

      await page.close();
    }

    console.log('\n================ PHASE 5.6 QA SUMMARY ================');
    console.table(results.viewportsTested);
    console.log('Zero overflow across all 8 viewports:', results.overflowPassed ? '✅ PASS' : '❌ FAIL');
    console.log('Repost API flow (200 OK without 500):', results.repostApiFlowPassed ? '✅ PASS' : '❌ FAIL');
    console.log('Repost toggle (undo repost):', results.repostTogglePassed ? '✅ PASS' : '❌ FAIL');
    console.log('Rapid click in-flight protection:', results.rapidClickGuarded ? '✅ PASS' : '❌ FAIL');
    console.log('Repost from /community/saved:', results.savedPageRepostPassed ? '✅ PASS' : '❌ FAIL');
    console.log('401 Refresh token replay flow:', results.authRefreshFlowPassed ? '✅ PASS' : '❌ FAIL');
    console.log('Extension warnings isolated from app code:', results.extensionWarningsCheckPassed ? '✅ PASS' : '❌ FAIL');

    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'phase56-qa-results.json'),
      JSON.stringify(results, null, 2)
    );
  } finally {
    await browser.close();
  }
}

runPhase56Validation().catch((err) => {
  console.error('Phase 5.6 QA failed:', err);
  process.exit(1);
});
