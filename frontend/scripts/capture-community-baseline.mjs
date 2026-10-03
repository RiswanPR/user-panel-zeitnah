import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/riyas/.gemini/antigravity-ide/brain/27dd0d16-4ed1-4291-9ba3-7213ac000af2';
const BASELINE_DIR = path.join(ARTIFACTS_DIR, 'phase55-baseline-screenshots');
if (!fs.existsSync(BASELINE_DIR)) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
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
    stats: { likes: 24, comments: 6, shares: 3, views: 180 },
    isLikedByMe: false,
    isSaved: false,
    tags: ['engineering', 'structures', 'zeitnah'],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: 'post-2',
    id: 'post-2',
    author: {
      _id: 'user-bob',
      name: 'Bob Miller',
      username: 'bobm',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      headline: 'Lead BIM Architect',
    },
    content: 'Coordinated the clash detection report across HVAC, structural steel, and plumbing risers. Zero high-severity clashes remaining ahead of the contractor milestone review.',
    media: [],
    stats: { likes: 18, comments: 3, shares: 1, views: 95 },
    isLikedByMe: true,
    isSaved: true,
    tags: ['bim', 'architecture'],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  }
];

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
  }
];

async function captureBaseline() {
  console.log('Capturing Phase 5.5 baseline screenshots across 8 viewports...');
  const browser = await chromium.launch({ headless: true });

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

      await page.route('**/api/community/stories**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockStories }),
        });
      });

      await page.route('**/api/community/posts**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: mockPosts,
              nextCursor: null,
              hasMore: false,
            },
          }),
        });
      });

      await page.route('**/api/community/posts/*/comments**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockComments,
          }),
        });
      });

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

      await page.goto('http://localhost:5173/community', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Baseline main screenshot
      const screenPath = path.join(BASELINE_DIR, `baseline-before-${vp.name}.png`);
      await page.screenshot({ path: screenPath });
      console.log(`📸 Saved baseline: ${screenPath}`);

      // On desktop, capture modals and drawers
      if (vp.name === 'desktop-1440x900') {
        // Open comments drawer
        const commentBtn = page.locator('#comment-btn-post-1');
        if (await commentBtn.isVisible()) {
          await commentBtn.click();
          await page.waitForTimeout(400);
          const commentsScreenPath = path.join(BASELINE_DIR, 'baseline-before-comments-drawer.png');
          await page.screenshot({ path: commentsScreenPath });
          console.log(`📸 Saved baseline comments drawer: ${commentsScreenPath}`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }

        // Open create post modal
        const createBtn = page.locator('#community-create-trigger');
        if (await createBtn.isVisible()) {
          await createBtn.click();
          await page.waitForTimeout(300);
          const newPostChoice = page.locator('#create-action-post');
          if (await newPostChoice.isVisible()) {
            await newPostChoice.click();
            await page.waitForTimeout(400);
          }
          const createModalPath = path.join(BASELINE_DIR, 'baseline-before-create-post-modal.png');
          await page.screenshot({ path: createModalPath });
          console.log(`📸 Saved baseline create modal: ${createModalPath}`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }

        // Open Story Viewer (click first story in rail)
        const firstStoryRing = page.locator('button[aria-label*="story"], div[aria-label*="story"]').first();
        if (await firstStoryRing.isVisible()) {
          await firstStoryRing.click();
          await page.waitForTimeout(500);
          const storyViewerPath = path.join(BASELINE_DIR, 'baseline-before-story-viewer.png');
          await page.screenshot({ path: storyViewerPath });
          console.log(`📸 Saved baseline story viewer: ${storyViewerPath}`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }

      await page.close();
    }
    console.log('✅ Baseline capture complete.');
  } finally {
    await browser.close();
  }
}

captureBaseline().catch((err) => {
  console.error('Error capturing baseline:', err);
  process.exit(1);
});
