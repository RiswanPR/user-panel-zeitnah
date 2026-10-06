import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Phase 4.1: Community Production Hardening, Reel UX & Profile Integration Tests', async (t) => {
  await t.test('Layout Architecture & Footer Isolation: verifies MainLayout isolates Reels route and suppresses footer', () => {
    const mainLayoutPath = path.resolve('src/layouts/MainLayout.jsx');
    assert.ok(fs.existsSync(mainLayoutPath), 'MainLayout.jsx must exist');

    const content = fs.readFileSync(mainLayoutPath, 'utf8');

    // 1. isReelsActive flag
    assert.ok(
      content.includes('const isReelsActive = location.pathname.startsWith("/community/reels");'),
      'MainLayout must compute isReelsActive based on /community/reels pathname'
    );

    // 2. Footer suppression on reels route
    assert.ok(
      content.includes('!isReelsActive && (') && content.includes('<Footer />'),
      'MainLayout must suppress <Footer /> when isReelsActive is true'
    );

    // 3. Main bottom padding removal on reels route
    assert.ok(
      content.includes('isMessagesActiveConversation || isReelsActive') && content.includes("? 'pb-0'"),
      'MainLayout must remove main bottom padding (pb-0) on active reels route'
    );

    // 4. Zero padding & full width wrapper on reels route
    assert.ok(
      content.includes("isReelsActive") && content.includes("'w-full h-full p-0 max-w-none'"),
      'MainLayout must render full-width zero-padding container without max-width constriction on reels'
    );

    // 5. Bypass PageTransition transform on reels route
    assert.ok(
      content.includes('isReelsActive ? (') && content.includes('children || <Outlet />'),
      'MainLayout must bypass PageTransition transform wrapper when isReelsActive to preserve fixed viewport'
    );
  });

  await t.test('Reel Viewport & Safe-Area Header: verifies ReelsViewer top header and currentUserId propagation', () => {
    const viewerPath = path.resolve('src/components/community/reels/ReelsViewer.jsx');
    assert.ok(fs.existsSync(viewerPath), 'ReelsViewer.jsx must exist');

    const content = fs.readFileSync(viewerPath, 'utf8');

    // 1. Safe-area top padding
    assert.ok(
      content.includes('env(safe-area-inset-top'),
      'ReelsViewer must include safe-area-inset-top padding in top header'
    );

    // 2. Clear accessible Back action
    assert.ok(
      content.includes('aria-label="Back to Zeitnah Community"'),
      'ReelsViewer must provide accessible Back button'
    );
    assert.ok(
      content.includes('Community'),
      'ReelsViewer must display Community back indicator'
    );

    // 3. Current user context and prop passing to ReelItem
    assert.ok(
      content.includes('AuthContext'),
      'ReelsViewer must import AuthContext'
    );
    assert.ok(
      content.includes('currentUserId={currentUserId}'),
      'ReelsViewer must pass currentUserId to ReelItem'
    );
  });

  await t.test('Reel Creator Identity Layer & RelationshipAction: verifies ReelItem creator overlay and actions', () => {
    const itemPath = path.resolve('src/components/community/reels/ReelItem.jsx');
    assert.ok(fs.existsSync(itemPath), 'ReelItem.jsx must exist');

    const content = fs.readFileSync(itemPath, 'utf8');

    // 1. Canonical RelationshipAction import & usage
    assert.ok(
      content.includes("import RelationshipAction from '../../network/RelationshipAction'"),
      'ReelItem must import canonical RelationshipAction component'
    );
    assert.ok(
      content.includes('<RelationshipAction'),
      'ReelItem must render RelationshipAction'
    );
    assert.ok(
      content.includes('variant="compact"'),
      'RelationshipAction must use compact variant for Reel overlay'
    );
    assert.ok(
      content.includes('canConnect'),
      'RelationshipAction must be guarded by canConnect (not own reel)'
    );

    // 2. Canonical profile navigation
    assert.ok(
      content.includes('getCanonicalProfileUrl(author)'),
      'ReelItem must use getCanonicalProfileUrl helper for profile link'
    );
    assert.ok(
      content.includes('aria-label={`View ${authorName}\'s public profile`}'),
      'ReelItem must have accessible creator profile link label'
    );

    // 3. Creator Name / Handle / Role hierarchy
    assert.ok(
      content.includes('authorName'),
      'ReelItem must render authorName with high emphasis'
    );
    assert.ok(
      content.includes('authorHandle'),
      'ReelItem must render authorHandle with secondary emphasis'
    );
    assert.ok(
      content.includes('author.primaryRole'),
      'ReelItem must display authoritative primaryRole badge when available'
    );

    // 4. Multiline Expandable Caption
    assert.ok(
      content.includes('whitespace-pre-line break-words'),
      'ReelItem caption must support multiline plain-text rendering'
    );
    assert.ok(
      content.includes('isCaptionExpanded ?'),
      'ReelItem must support expand/collapse toggle for captions'
    );

    // 5. Action rail touch targets (>= 44px)
    assert.ok(
      content.includes('min-h-[44px] min-w-[44px]'),
      'ReelItem action rail buttons must meet accessible minimum 44px touch targets'
    );

    // 6. Safe area bottom padding
    assert.ok(
      content.includes('env(safe-area-inset-bottom'),
      'ReelItem must account for safe-area-inset-bottom in bottom overlay'
    );
  });

  await t.test('Story Rail Empty Space & Vertical Rhythm: verifies StoryRail placement and snug padding', () => {
    const homePath = path.resolve('src/pages/community/CommunityHome.jsx');
    const homeContent = fs.readFileSync(homePath, 'utf8');

    // 1. StoryRail placed inside primary feed column above composer
    const storyRailIndex = homeContent.indexOf('<StoryRail');
    const composerIndex = homeContent.indexOf('<CommunityComposerEntry');
    assert.ok(storyRailIndex !== -1, 'CommunityHome must render StoryRail');
    assert.ok(composerIndex !== -1, 'CommunityHome must render CommunityComposerEntry');
    assert.ok(
      storyRailIndex < composerIndex,
      'StoryRail must appear before CommunityComposerEntry in primary feed column'
    );

    // 2. StoryRail is inside the 620px feed column container
    const feedColIndex = homeContent.indexOf('max-w-[620px] mx-auto space-y-3.5');
    assert.ok(feedColIndex !== -1, 'Feed column must exist with space-y-3.5 spacing');
    assert.ok(
      feedColIndex < storyRailIndex,
      'StoryRail must be nested inside max-w-[620px] primary column, eliminating 1400px empty horizontal container'
    );

    // 3. StoryRail snug padding
    const railPath = path.resolve('src/components/community/stories/StoryRail.jsx');
    const railContent = fs.readFileSync(railPath, 'utf8');
    assert.ok(
      railContent.includes('p-2.5 sm:p-3'),
      'StoryRail must have compact p-2.5 sm:p-3 padding hugging content height'
    );
  });

  await t.test('Profile Integration: verifies PublicProfilePage Community Presence card navigation', () => {
    const profilePath = path.resolve('src/pages/profile/PublicProfilePage.jsx');
    const content = fs.readFileSync(profilePath, 'utf8');

    assert.ok(
      content.includes('Community Presence'),
      'PublicProfilePage must feature Community Presence section'
    );
    assert.ok(
      content.includes('/community?feed=all'),
      'PublicProfilePage must link to Community Posts'
    );
    assert.ok(
      content.includes('/community/reels'),
      'PublicProfilePage must link to Community Reels'
    );
  });

  await t.test('Feed to Reel Route Flow: verifies CommunityHome handleOpenReel navigates directly to /community/reels/:postId', () => {
    const homePath = path.resolve('src/pages/community/CommunityHome.jsx');
    const content = fs.readFileSync(homePath, 'utf8');

    assert.ok(
      content.includes('navigate(`/community/reels/${postId}`)'),
      'CommunityHome handleOpenReel must navigate to canonical reels route'
    );
  });
});
