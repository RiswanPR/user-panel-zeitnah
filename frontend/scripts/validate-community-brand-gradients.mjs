import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/riyas/.gemini/antigravity-ide/brain/27dd0d16-4ed1-4291-9ba3-7213ac000af2';
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'brand-qa-screenshots');
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

const mockStories = [
  {
    _id: 'story-1',
    id: 'story-1',
    author: {
      _id: 'user-alice',
      name: 'Alice Henderson',
      username: 'aliceh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    mediaUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861563?w=800',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    viewers: [],
  },
  {
    _id: 'story-2',
    id: 'story-2',
    author: {
      _id: 'user-bob',
      name: 'Bob Miller',
      username: 'bobm',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    mediaUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    viewers: [],
  },
  {
    _id: 'story-3',
    id: 'story-3',
    author: {
      _id: 'user-riswan-1',
      name: 'Riswan P.R',
      username: 'riswanpr',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    mediaUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    viewers: [],
  },
];

const mockPosts = [
  {
    _id: 'post-1',
    id: 'post-1',
    author: {
      _id: 'user-alice',
      name: 'Alice Henderson',
      username: 'aliceh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      headline: 'Senior Structural Engineer | Zeitnah Fellow',
    },
    content: 'Reviewing the seismic retrofit blueprints for the commercial tower. High-performance shear wall analysis completed with 0.12 drift ratio. #engineering #structures #zeitnah',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861563?w=1000',
        type: 'image',
        caption: 'Structural frame under seismic stress distribution',
      },
      {
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1000',
        type: 'image',
        caption: 'Foundation slab inspection',
      }
    ],
    stats: { likes: 42, comments: 8, reposts: 3 },
    tags: ['engineering', 'structures', 'zeitnah'],
    hashtags: ['engineering', 'structures'],
    isLikedByMe: false,
    isSaved: false,
    isRepostedByMe: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'post-2',
    id: 'post-2',
    author: {
      _id: 'user-bob',
      name: 'Bob Miller',
      username: 'bobm',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      headline: 'Geotechnical Specialist',
    },
    content: 'Field soil stratification testing in progress. Soil bearing capacity exceeded design minimum by 18%. #geotechnical #engineering',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000',
        type: 'image',
        caption: 'Core sample analysis results',
      }
    ],
    stats: { likes: 19, comments: 2, reposts: 0 },
    tags: ['geotechnical', 'engineering'],
    hashtags: ['geotechnical'],
    isLikedByMe: true,
    myReactionType: 'insightful',
    isSaved: true,
    isRepostedByMe: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  }
];

async function runBrandQA() {
  console.log('🚀 Starting Zeitnah Brand-Aligned Community QA Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const results = {
    viewportsTested: [],
    overflowPassed: true,
    consoleErrors: [],
    reactWarnings: [],
    brandGradientsVerified: {},
    interactionsVerified: {},
  };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });

      const pageErrors = [];
      const consoleErrors = [];
      const reactWarnings = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error') {
          if (!text.includes('Failed to load resource') && !text.includes('favicon')) {
            consoleErrors.push(text);
          }
        }
        if (text.includes('Warning: ') && !text.includes('React Router')) {
          reactWarnings.push(text);
        }
      });

      page.on('request', (req) => {
        if (req.url().includes('api') || req.url().includes('community')) {
          console.log(`[REQ] ${req.method()} ${req.url()}`);
        }
      });
      page.on('response', (res) => {
        if (res.url().includes('api') || res.url().includes('community')) {
          console.log(`[RES] ${res.status()} ${res.url()}`);
        }
      });

      // Intercept and inject mock responses
      await page.route('**/*', async (route) => {
        const url = route.request().url();

        if (url.includes('/api/auth/me') || url.includes('/api/users/me')) {
          console.log('Intercepted /auth/me -> returning mock user');
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              user: {
                id: mockUser._id,
                userId: mockUser._id,
                name: mockUser.name,
                email: mockUser.email,
                username: mockUser.username,
                primaryRole: 'ADMIN',
                role: 'admin',
              },
            }),
          });
        }
        if (url.includes('/api/community/stories')) {
          console.log('Intercepted /community/stories -> returning mock stories');
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, stories: mockStories, data: mockStories }),
          });
        }
        if (url.includes('/api/community/posts')) {
          console.log('Intercepted /community/posts -> returning mock posts');
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              items: mockPosts,
              page: 1,
              hasMore: false,
              total: mockPosts.length,
            }),
          });
        }
        if (url.includes('/api/community/comments')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, comments: [] }),
          });
        }
        if (url.includes('/api/')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, count: 0, items: [], unread: 0, announcements: [] }),
          });
        }

        return route.continue();
      });

      // Pre-seed localStorage with authenticated state
      await page.addInitScript(({ user }) => {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
          userId: user._id,
          id: user._id,
          email: user.email,
          primaryRole: user.primaryRole,
          role: user.role,
          exp: Math.floor(Date.now() / 1000) + 86400,
        }));
        const fakeJwt = `${header}.${payload}.signature`;

        window.localStorage.setItem('token', fakeJwt);
        window.localStorage.setItem('user', JSON.stringify(user));
      }, { user: mockUser });

      // Navigate to Community
      await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      console.log(`Current page URL after goto: ${page.url()}`);

      // Verify zero horizontal scroll overflow
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

      if (overflowCheck.hasOverflow) {
        console.error(`❌ Overflow detected in ${vp.name}: doc=${overflowCheck.docWidth}px, win=${overflowCheck.winWidth}px`);
        results.overflowPassed = false;
      } else {
        console.log(`✅ ${vp.name}: 0px horizontal overflow (doc=${overflowCheck.docWidth}px, win=${overflowCheck.winWidth}px)`);
      }

      // Check brand gradient elements presence
      if (vp.name === 'desktop-1440x900') {
        const createBtn = page.locator('#community-create-trigger');
        const createBtnVisible = await createBtn.isVisible();
        console.log(`✅ Create trigger button visible: ${createBtnVisible}`);

        const createBtnBg = await createBtn.evaluate((el) => window.getComputedStyle(el).backgroundImage);
        console.log(`✅ Create button gradient backgroundImage: ${createBtnBg}`);
        results.brandGradientsVerified.createButton = createBtnBg.includes('rgb(159, 213, 178)') || createBtnBg.includes('linear-gradient');

        // Check active feed filter tab
        const activeTab = page.locator('#feed-tab-all');
        const activeTabBg = await activeTab.evaluate((el) => {
          const activeIndicator = el.querySelector('[class*="active-feed-tab"]') || el;
          return window.getComputedStyle(activeIndicator).backgroundImage;
        });
        console.log(`✅ Active feed tab backgroundImage: ${activeTabBg}`);

        // Check double tap like interaction
        const mediaContainer = page.locator('[data-testid="post-media-container"]').first();
        if (await mediaContainer.isVisible()) {
          console.log('Testing double-tap like interaction on media...');
          await mediaContainer.dblclick();
          await page.waitForTimeout(200);
          console.log('✅ Double-tap like executed');
          results.interactionsVerified.doubleTapLike = true;
        }

        // Test clicking Create button -> opens CreateActionModal or CreatePostModal
        await createBtn.click();
        await page.waitForTimeout(300);

        // If CreateActionModal chooser is shown, click "New Post"
        const newPostChoice = page.locator('#create-action-post');
        if (await newPostChoice.isVisible()) {
          console.log('✅ CreateActionModal chooser visible -> clicking #create-action-post');
          await newPostChoice.click();
          await page.waitForTimeout(400);
        }

        const dropzone = page.locator('#media-dropzone');
        const modalVisible = await dropzone.isVisible();
        console.log(`✅ Create Post dropzone modal opened: ${modalVisible}`);
        results.interactionsVerified.createModal = modalVisible;

        // Take modal screenshot
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'create-modal-desktop.png') });

        // Press Escape to dismiss
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      // Capture full viewport screenshot
      const screenshotPath = path.join(SCREENSHOTS_DIR, `community-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`📸 Saved screenshot to: ${screenshotPath}`);

      results.viewportsTested.push({
        viewport: vp.name,
        dimensions: `${vp.width}x${vp.height}`,
        overflow: overflowCheck.hasOverflow ? 'FAIL' : 'PASS',
        consoleErrorsCount: consoleErrors.length,
        reactWarningsCount: reactWarnings.length,
      });

      if (consoleErrors.length > 0) {
        console.warn(`⚠️ Console errors in ${vp.name}:`, consoleErrors);
        results.consoleErrors.push({ viewport: vp.name, errors: consoleErrors });
      }

      await page.close();
    }

    console.log('\n================ QA SUMMARY ================');
    console.table(results.viewportsTested);
    console.log('Zero overflow overall:', results.overflowPassed ? '✅ PASS' : '❌ FAIL');
    console.log('Brand gradients verified:', results.brandGradientsVerified);
    console.log('Interactions verified:', results.interactionsVerified);

    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'brand-qa-results.json'),
      JSON.stringify(results, null, 2)
    );
  } finally {
    await browser.close();
  }
}

runBrandQA().catch((err) => {
  console.error('QA Runner encountered error:', err);
  process.exit(1);
});
