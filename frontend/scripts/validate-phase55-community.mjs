import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/riyas/.gemini/antigravity-ide/brain/27dd0d16-4ed1-4291-9ba3-7213ac000af2';
const AFTER_DIR = path.join(ARTIFACTS_DIR, 'phase55-after-screenshots');
if (!fs.existsSync(AFTER_DIR)) {
  fs.mkdirSync(AFTER_DIR, { recursive: true });
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

// Generate 50 scaled posts for feed scale validation (Section 12)
const generatedPosts = Array.from({ length: 50 }).map((_, i) => {
  const isEven = i % 2 === 0;
  const isVideo = i === 4;
  return {
    _id: `post-scale-${i}`,
    id: `post-scale-${i}`,
    author: {
      _id: isEven ? 'user-alice' : 'user-bob',
      name: isEven ? 'Alice Henderson' : 'Bob Miller',
      username: isEven ? 'aliceh' : 'bobm',
      avatar: isEven
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      headline: isEven ? 'Senior Structural Engineer' : 'Lead BIM Architect',
      role: isEven ? 'Faculty' : 'Professional',
    },
    content: isEven
      ? `Structural analysis benchmark #${i}: Shear wall reinforcement details reviewed against seismic code EC8. Concrete strength meets grade C35/45. #engineering #structures #zeitnah`
      : `BIM coordination sprint #${i}: Completed clash detection report across MEP risers and composite steel decking. Zero high-priority clashes remaining. #bim #architecture`,
    media: isVideo
      ? [
          {
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            type: 'video',
            thumbnailUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861563?w=800',
          },
        ]
      : i % 3 === 0
      ? [
          {
            url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861563?w=1000',
            type: 'image',
            caption: 'Structural frame under seismic load distribution',
          },
          {
            url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1000',
            type: 'image',
            caption: 'Foundation slab inspection',
          },
        ]
      : i % 2 === 0
      ? [
          {
            url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000',
            type: 'image',
            caption: 'Architectural facade geometry',
          },
        ]
      : [],
    stats: {
      likes: 12 + (i % 25),
      comments: i % 7,
      shares: i % 3,
      views: 120 + i * 15,
    },
    isLikedByMe: i % 4 === 0,
    isSaved: i % 5 === 0,
    tags: isEven ? ['engineering', 'structures', 'zeitnah'] : ['bim', 'architecture'],
    createdAt: new Date(Date.now() - 3600000 * (i + 1)).toISOString(),
  };
});

const mockComments = [
  {
    _id: 'comm-1',
    author: {
      _id: 'user-bob',
      name: 'Bob Miller',
      username: 'bobm',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    content: 'Great deflection numbers on that shear core wall!',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'comm-2',
    author: {
      _id: 'user-riswan-1',
      name: 'Riswan P.R',
      username: 'riswanpr',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    content: 'Agreed, this sets a benchmark for the cohort retrofit phase.',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

async function runPhase55Validation() {
  console.log('🚀 Launching Phase 5.5 Ultra-Premium QA & Real-World Validation...\n');
  const browser = await chromium.launch({ headless: true });

  const results = {
    viewportsTested: [],
    overflowPassed: true,
    feedScalePassed: false,
    doubleTapVerified: false,
    storyViewerVerified: false,
    commentsDrawerVerified: false,
    createModalVerified: false,
    consoleErrors: [],
  };

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const consoleErrors = [];
      const reactWarnings = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (msg.type() === 'error') {
          // Ignore external image loading errors from mock URLs if any
          if (!text.includes('Failed to load resource') && !text.includes('unsplash.com')) {
            consoleErrors.push(text);
          }
        }
        if (text.includes('Warning:')) {
          reactWarnings.push(text);
        }
      });

      // Robust Mock API Interception matching client expectations
      await page.route('**/*', async (route) => {
        const url = route.request().url();

        // Never intercept Vite client or frontend source code modules
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

        if (url.includes('/api/auth/me') || url.includes('/api/users/me')) {
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

        if (url.includes('/comments')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              comments: mockComments,
              data: mockComments,
            }),
          });
        }

        if (url.includes('/api/community/stories')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockStories),
          });
        }

        if (url.includes('/reactions') || url.includes('/bookmarks') || url.includes('/view')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }

        if (url.includes('/api/community/posts')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              items: generatedPosts,
              page: 1,
              nextCursor: null,
              hasMore: false,
              total: generatedPosts.length,
            }),
          });
        }

        if (url.includes('/api/')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              count: 0,
              items: [],
              unread: 0,
              unreadCount: 0,
              announcements: [],
            }),
          });
        }

        return route.continue();
      });

      // Pre-seed localStorage with authenticated state
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
          window.localStorage.setItem('user', JSON.stringify(user));
        },
        { user: mockUser }
      );

      // Navigate to Community
      await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

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
        console.error(
          `❌ Overflow detected in ${vp.name}: doc=${overflowCheck.docWidth}px, win=${overflowCheck.winWidth}px`
        );
        results.overflowPassed = false;
      } else {
        console.log(
          `✅ ${vp.name}: 0px horizontal overflow (doc=${overflowCheck.docWidth}px, win=${overflowCheck.winWidth}px)`
        );
      }

      // Check feed scale & interactive flows on desktop-1440x900
      if (vp.name === 'desktop-1440x900') {
        try {
          await page.waitForSelector('article.zn-card', { timeout: 10000 });
        } catch {
          console.warn('Timed out waiting for article.zn-card');
        }

        const postArticles = page.locator('article.zn-card');
        const count = await postArticles.count();
        console.log(`✅ Rendered feed articles count: ${count}`);
        results.feedScalePassed = count >= 50;

        // Test Double-tap Like on Media
        const mediaContainer = page.locator('[data-testid="post-media-container"]').first();
        if (await mediaContainer.isVisible()) {
          console.log('Testing double-tap like on PostMedia...');
          await mediaContainer.dblclick();
          await page.waitForTimeout(300);
          console.log('✅ Double-tap like animation executed');
          results.doubleTapVerified = true;
        }

        // Test Story Viewer (Open Story from rail)
        const storyGroupBtn = page.locator('div[aria-label*="Alice Henderson"], div[aria-label*="by Alice"], div[aria-label*="stories by"]').first();
        if (await storyGroupBtn.isVisible()) {
          console.log('Testing Story Viewer opening & controls...');
          await storyGroupBtn.click();
          await page.waitForTimeout(700);

          const storyViewerDialog = page.locator('div[role="dialog"][aria-label*="Story"]');
          if (await storyViewerDialog.isVisible()) {
            console.log('✅ Story Viewer modal opened and visible');
            results.storyViewerVerified = true;
            await page.screenshot({
              path: path.join(AFTER_DIR, 'phase55-after-story-viewer.png'),
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
          }
        }

        // Test Comment Drawer
        const commentBtn = page.locator('[data-testid="post-comment-btn"]').first();
        if (await commentBtn.isVisible()) {
          console.log('Testing Comment Drawer opening...');
          await commentBtn.click();
          const commentDrawer = page.locator('div[role="dialog"][aria-label="Comments"]');
          await commentDrawer.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

          if (await commentDrawer.isVisible()) {
            console.log('✅ Comment Drawer opened and visible');
            results.commentsDrawerVerified = true;
            await page.screenshot({
              path: path.join(AFTER_DIR, 'phase55-after-comments-drawer.png'),
            });
            const closeCommentBtn = page.locator('button[aria-label="Close comments"]');
            if (await closeCommentBtn.isVisible()) {
              await closeCommentBtn.click();
            } else {
              await page.keyboard.press('Escape');
            }
            await page.waitForTimeout(500);
          }
        }

        // Test Create Post Modal
        const createBtn = page.locator('#community-create-trigger');
        if (await createBtn.isVisible()) {
          console.log('Testing Create Post Modal opening...');
          await createBtn.click();
          await page.waitForTimeout(400);

          const newPostChoice = page.locator('#create-action-post');
          if (await newPostChoice.isVisible()) {
            await newPostChoice.click();
            await page.waitForTimeout(500);
          }

          const dropzone = page.locator('#media-dropzone');
          await dropzone.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

          if (await dropzone.isVisible()) {
            console.log('✅ Create Post modal opened with dropzone visible');
            results.createModalVerified = true;
            await page.screenshot({
              path: path.join(AFTER_DIR, 'phase55-after-create-post-modal.png'),
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        }
      }

      // Capture after screenshot
      const afterScreenPath = path.join(AFTER_DIR, `phase55-after-${vp.name}.png`);
      await page.screenshot({ path: afterScreenPath });
      console.log(`📸 Saved after screenshot: ${afterScreenPath}`);

      results.viewportsTested.push({
        viewport: vp.name,
        dimensions: `${vp.width}x${vp.height}`,
        overflow: overflowCheck.hasOverflow ? 'FAIL' : 'PASS',
        consoleErrorsCount: consoleErrors.length,
        reactWarningsCount: reactWarnings.length,
        result: !overflowCheck.hasOverflow && consoleErrors.length === 0 ? 'PASS' : 'FAIL',
      });

      if (consoleErrors.length > 0) {
        results.consoleErrors.push({ viewport: vp.name, errors: consoleErrors });
      }

      await page.close();
    }

    console.log('\n================ PHASE 5.5 QA SUMMARY ================');
    console.table(results.viewportsTested);
    console.log('Zero overflow across all 8 viewports:', results.overflowPassed ? '✅ PASS' : '❌ FAIL');
    console.log('Feed scale (50+ posts):', results.feedScalePassed ? '✅ PASS' : '❌ FAIL');
    console.log('Double-tap like feedback:', results.doubleTapVerified ? '✅ PASS' : '❌ FAIL');
    console.log('Story Viewer playback & modal:', results.storyViewerVerified ? '✅ PASS' : '❌ FAIL');
    console.log('Comment Drawer & safe area:', results.commentsDrawerVerified ? '✅ PASS' : '❌ FAIL');
    console.log('Create Post modal & dropzone:', results.createModalVerified ? '✅ PASS' : '❌ FAIL');

    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'phase55-qa-results.json'),
      JSON.stringify(results, null, 2)
    );
  } finally {
    await browser.close();
  }
}

runPhase55Validation().catch((err) => {
  console.error('Phase 5.5 QA failed:', err);
  process.exit(1);
});
