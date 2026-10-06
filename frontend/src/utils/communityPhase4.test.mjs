import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Phase 4: Community Feed & Creator Experience 2.0 Architectural Tests', async (t) => {
  await t.test('Phase 3 Composer Entry: verifies CommunityComposerEntry component exists and offers Post, Reel, Story', () => {
    const entryPath = path.resolve('src/components/community/composer/CommunityComposerEntry.jsx');
    assert.ok(fs.existsSync(entryPath), 'CommunityComposerEntry.jsx must exist');

    const content = fs.readFileSync(entryPath, 'utf8');
    assert.ok(content.includes('onOpenCreatePost'), 'Must provide Post creation action');
    assert.ok(content.includes('onOpenCreateReel'), 'Must provide Reel creation action');
    assert.ok(content.includes('onOpenCreateStory'), 'Must provide Story creation action');
    assert.ok(content.includes('min-h-[44px]'), 'Must enforce accessible touch targets (>= 44px)');
    assert.ok(content.includes('What would you like to share'), 'Must include calm, intentional welcoming trigger');
  });

  await t.test('Phase 14 Creator Insights: verifies CreatorInsightsModal and API integration', () => {
    const modalPath = path.resolve('src/components/community/creator/CreatorInsightsModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'CreatorInsightsModal.jsx must exist');

    const modalContent = fs.readFileSync(modalPath, 'utf8');
    assert.ok(modalContent.includes('useCreatorInsights'), 'Must consume useCreatorInsights hook');
    assert.ok(modalContent.includes('Total Views'), 'Must display total views');
    assert.ok(modalContent.includes('Reactions'), 'Must display total reactions');
    assert.ok(modalContent.includes('Comments'), 'Must display total comments');
    assert.ok(modalContent.includes('Connections'), 'Must display total network connections');
    assert.ok(modalContent.includes('Top Performing Content'), 'Must display top performing content list');
    assert.ok(modalContent.includes('role="dialog"'), 'Must have accessible dialog semantics');

    const apiContent = fs.readFileSync(path.resolve('src/services/communityApi.js'), 'utf8');
    assert.ok(apiContent.includes('/community/posts/creator/insights'), 'communityApi must have getCreatorInsights endpoint');

    const hookContent = fs.readFileSync(path.resolve('src/hooks/useCommunity.js'), 'utf8');
    assert.ok(hookContent.includes('useCreatorInsights'), 'useCommunity must export useCreatorInsights hook');
  });

  await t.test('Phase 6 Reels Discovery: verifies latest vs trending tab discovery in ReelsPage and ReelsViewer', () => {
    const reelsPageContent = fs.readFileSync(path.resolve('src/pages/community/ReelsPage.jsx'), 'utf8');
    assert.ok(reelsPageContent.includes("searchParams.get('tab') === 'trending'"), 'ReelsPage must inspect tab parameter');
    assert.ok(reelsPageContent.includes('reels_trending'), 'ReelsPage must map trending tab to reels_trending filter');
    assert.ok(reelsPageContent.includes('useCommunityVideoFeed({ filter: videoFilter })'), 'ReelsPage must pass filter to video feed hook');

    const viewerContent = fs.readFileSync(path.resolve('src/components/community/reels/ReelsViewer.jsx'), 'utf8');
    assert.ok(viewerContent.includes('onChangeTab'), 'ReelsViewer must accept onChangeTab prop');
    assert.ok(viewerContent.includes('Latest'), 'ReelsViewer must render Latest tab');
    assert.ok(viewerContent.includes('Trending'), 'ReelsViewer must render Trending tab');

    const apiContent = fs.readFileSync(path.resolve('src/services/communityApi.js'), 'utf8');
    assert.ok(apiContent.includes("getVideoFeed: async ({ cursor = '', limit = 10, filter = 'video' } = {})"), 'getVideoFeed must accept filter parameter');
  });

  await t.test('Phase 10 Saved Content: verifies library categorization (All, Posts, Reels, Resources) and search', () => {
    const savedContent = fs.readFileSync(path.resolve('src/pages/community/SavedPostsPage.jsx'), 'utf8');
    assert.ok(savedContent.includes("activeCategory === 'all'"), 'SavedPostsPage must support all category');
    assert.ok(savedContent.includes("activeCategory === 'posts'"), 'SavedPostsPage must support posts category');
    assert.ok(savedContent.includes("activeCategory === 'reels'"), 'SavedPostsPage must support reels category');
    assert.ok(savedContent.includes("activeCategory === 'resources'"), 'SavedPostsPage must support resources category');
    assert.ok(savedContent.includes('searchQuery'), 'SavedPostsPage must support in-library search');
  });

  await t.test('Phase 4 Feed Experience: verifies subtle view tracking count in PostActions metadata', () => {
    const actionsContent = fs.readFileSync(path.resolve('src/components/community/feed/PostCard/PostActions.jsx'), 'utf8');
    assert.ok(actionsContent.includes('stats?.views'), 'PostActions must inspect stats.views');
    assert.ok(actionsContent.includes('viewCount > 0'), 'PostActions must guard view count display when > 0');
    assert.ok(actionsContent.includes('view'), 'PostActions must label view count cleanly');
  });

  await t.test('Phase 1 & 8 Header & Profile Integration: verifies CommunityHeader insights trigger and PublicProfilePage community link', () => {
    const headerContent = fs.readFileSync(path.resolve('src/components/community/header/CommunityHeader.jsx'), 'utf8');
    assert.ok(headerContent.includes('onOpenInsights'), 'CommunityHeader must accept onOpenInsights prop');
    assert.ok(headerContent.includes('Creator Insights'), 'CommunityHeader must render accessible insights trigger');

    const profileContent = fs.readFileSync(path.resolve('src/pages/profile/PublicProfilePage.jsx'), 'utf8');
    assert.ok(profileContent.includes('Community Presence'), 'PublicProfilePage must render Community Presence card');
    assert.ok(profileContent.includes('/community?feed=all'), 'PublicProfilePage must link to community feed');
  });
});
