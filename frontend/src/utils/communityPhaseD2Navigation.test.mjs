import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveNotificationRoute } from './notificationUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '..');

test('Phase D.2: Community Notification Deep-Links & Navigation Verification', async (t) => {
  // ── 1. Reaction Notification Destination ──
  await t.test('1. Reaction notification routes to target post without openComments', () => {
    const notif = {
      type: 'COMMUNITY_REACTION',
      actionUrl: '/community#post-alpha-1',
    };
    const route = resolveNotificationRoute(notif);
    assert.equal(route.url, '/community?post=post-alpha-1#post-alpha-1');
    assert.equal(route.isNavigable, true);
    assert.equal(route.isExternal, false);
    assert.ok(!route.url.includes('openComments'), 'Reaction must not request openComments');
  });

  // ── 2. Comment & Reply Destinations with openComments ──
  await t.test('2. Comment and reply notifications route to post and request opening comment drawer', () => {
    // Comment on standard feed post
    const commentNotif = {
      type: 'COMMUNITY_COMMENT',
      actionUrl: '/community#post-beta-2',
    };
    const commentRoute = resolveNotificationRoute(commentNotif);
    assert.equal(commentRoute.url, '/community?post=post-beta-2&openComments=true#post-beta-2');
    assert.ok(commentRoute.url.includes('openComments=true'), 'Comment must request openComments=true');

    // Reply notification using entity metadata
    const replyNotif = {
      type: 'COMMUNITY_COMMENT',
      category: 'community',
      metadata: { postId: 'post-gamma-3', openComments: true },
    };
    const replyRoute = resolveNotificationRoute(replyNotif);
    assert.equal(replyRoute.url, '/community?post=post-gamma-3&openComments=true#post-gamma-3');

    // Video Reel comment notification
    const reelCommentNotif = {
      type: 'COMMUNITY_COMMENT',
      actionUrl: '/community/reels/reel-999',
    };
    const reelRoute = resolveNotificationRoute(reelCommentNotif);
    assert.equal(reelRoute.url, '/community/reels/reel-999?openComments=true');
  });

  // ── 3. Repost and Quote Destinations ──
  await t.test('3. Repost and quote notifications resolve to canonical or quoted post from metadata', () => {
    // Repost targeting canonical original post
    const repostNotif = {
      type: 'COMMUNITY_REPOST',
      category: 'community',
      actionUrl: '/community',
      metadata: { originalPostId: 'canon-post-100' },
    };
    const repostRoute = resolveNotificationRoute(repostNotif);
    assert.equal(repostRoute.url, '/community?post=canon-post-100#canon-post-100');
    assert.ok(!repostRoute.url.includes('openComments'), 'Repost should not request openComments');

    // Repost with organization context
    const orgRepostNotif = {
      type: 'COMMUNITY_REPOST',
      category: 'community',
      metadata: { canonicalPostId: 'canon-post-100', organizationId: 'org-apple-99' },
    };
    const orgRepostRoute = resolveNotificationRoute(orgRepostNotif);
    assert.equal(orgRepostRoute.url, '/community?organizationId=org-apple-99&post=canon-post-100#canon-post-100');

    // Quote targeting quoted post
    const quoteNotif = {
      type: 'COMMUNITY_QUOTE',
      category: 'community',
      actionUrl: '/community',
      metadata: { quotedPostId: 'quoted-post-200', quotePostId: 'quote-new-300' },
    };
    const quoteRoute = resolveNotificationRoute(quoteNotif);
    assert.equal(quoteRoute.url, '/community?post=quoted-post-200#quoted-post-200');

    // Quote with organization context
    const orgQuoteNotif = {
      type: 'COMMUNITY_QUOTE',
      category: 'community',
      metadata: { quotedPostId: 'quoted-post-200', organizationId: 'org-meta-88' },
    };
    const orgQuoteRoute = resolveNotificationRoute(orgQuoteNotif);
    assert.equal(orgQuoteRoute.url, '/community?organizationId=org-meta-88&post=quoted-post-200#quoted-post-200');

    // Legacy repost notification without metadata falling back to idempotencyKey
    const legacyRepost = {
      type: 'COMMUNITY_REPOST',
      category: 'community',
      actionUrl: '/community',
      idempotencyKey: 'repost:canon-post-555:user-quoter',
    };
    const legacyRepostRoute = resolveNotificationRoute(legacyRepost);
    assert.equal(legacyRepostRoute.url, '/community?post=canon-post-555#canon-post-555');

    // Legacy quote notification without metadata falling back to idempotencyKey
    const legacyQuote = {
      type: 'COMMUNITY_QUOTE',
      category: 'community',
      actionUrl: '/community',
      idempotencyKey: 'quote:quote-new-777:user-quoter',
    };
    const legacyQuoteRoute = resolveNotificationRoute(legacyQuote);
    assert.equal(legacyQuoteRoute.url, '/community?post=quote-new-777#quote-new-777');

    // Legacy notification with zero metadata and zero idempotencyKey falls back safely
    const bareRepost = {
      type: 'COMMUNITY_REPOST',
      category: 'community',
      actionUrl: '/community',
    };
    const bareRepostRoute = resolveNotificationRoute(bareRepost);
    assert.equal(bareRepostRoute.url, '/community');
    assert.equal(bareRepostRoute.isNavigable, true);
  });

  // ── 4. Company Post Navigation ──
  await t.test('4. Company post notification includes organizationId and post context', () => {
    const companyNotif = {
      type: 'company_post',
      category: 'community',
      actionUrl: '/community?organizationId=org-spacex-1',
      metadata: {
        organizationId: 'org-spacex-1',
        postId: 'post-launch-42',
      },
    };
    const route = resolveNotificationRoute(companyNotif);
    assert.equal(
      route.url,
      '/community?organizationId=org-spacex-1&post=post-launch-42#post-launch-42'
    );
    assert.ok(route.url.includes('organizationId=org-spacex-1'));
    assert.ok(route.url.includes('post=post-launch-42'));
  });

  // ── 5. Unrelated Notification Routing Preservation ──
  await t.test('5. Unrelated notification routing remains untouched', () => {
    // Messages
    assert.equal(
      resolveNotificationRoute({ type: 'MESSAGE', entityId: 'c-123' }).url,
      '/messages?c=c-123'
    );
    // Profile
    assert.equal(
      resolveNotificationRoute({ actionUrl: '/network/profile/sarah' }).url,
      '/u/sarah'
    );
    // External link
    const ext = resolveNotificationRoute({ actionUrl: 'https://zeitnah.app/terms' });
    assert.equal(ext.url, 'https://zeitnah.app/terms');
    assert.equal(ext.isExternal, true);
    // Announcements
    assert.equal(
      resolveNotificationRoute({ type: 'ANNOUNCEMENT', entityId: 'ann-1' }).url,
      '/notifications'
    );
    // Opportunities
    assert.equal(
      resolveNotificationRoute({ type: 'OPPORTUNITY' }).url,
      '/opportunities/inbox'
    );
  });

  // ── 6. Missing or Malformed Post IDs ──
  await t.test('6. Missing or malformed post IDs safely fallback to /community without crashing', () => {
    const malformed1 = resolveNotificationRoute({ type: 'COMMUNITY_COMMENT' });
    assert.equal(malformed1.url, '/community');

    const malformed2 = resolveNotificationRoute({ type: 'COMMUNITY_REACTION', actionUrl: '/community#' });
    assert.equal(malformed2.url, '/community');

    const malformed3 = resolveNotificationRoute({
      type: 'COMMUNITY_REPOST',
      metadata: { originalPostId: '' },
    });
    assert.equal(malformed3.url, '/community');
  });

  // ── 7. URL Encoding and Query Parameter Preservation ──
  await t.test('7. Special characters in post IDs and organization IDs are safely encoded', () => {
    const notifSpecial = {
      type: 'COMMUNITY_COMMENT',
      metadata: {
        postId: 'uuid-1234/test?special=1&hash=#abc',
        organizationId: 'org name & co',
      },
    };
    const route = resolveNotificationRoute(notifSpecial);
    assert.ok(route.url.includes('organizationId=org+name+%26+co') || route.url.includes('organizationId=org%20name%20%26%20co'));
    assert.ok(route.url.includes('post=uuid-1234%2Ftest%3Fspecial%3D1%26hash%3D%23abc'));
  });

  // ── 8. Static Inspection of CommunityHome Deep-Link Handling ──
  await t.test('8. CommunityHome inspects route parameters, handles consumed state, and avoids loop reopening', () => {
    const homeContent = fs.readFileSync(path.join(frontendSrc, 'pages/community/CommunityHome.jsx'), 'utf8');

    // Captures setSearchParams
    assert.ok(
      homeContent.includes('const [searchParams, setSearchParams] = useSearchParams()'),
      'Must destructure setSearchParams to normalize consumed query state'
    );

    // Reads target post ID and openComments
    assert.ok(homeContent.includes("searchParams.get('post') || searchParams.get('postId')"), 'Must read post or postId');
    assert.ok(homeContent.includes("searchParams.get('openComments') === 'true'"), 'Must parse openComments');
    assert.ok(homeContent.includes("searchParams.get('organizationId')"), 'Must support organizationId parameter');

    // Passes organizationId to feed hook
    assert.ok(homeContent.includes('organizationId: urlOrgId'), 'Must pass organizationId to useCommunityFeed');

    // Uses useRef to track handled state to prevent infinite loops and re-open on close
    assert.ok(homeContent.includes('handledTargetPostIdRef = useRef(null)'), 'Must track handledTargetPostIdRef');
    assert.ok(homeContent.includes('handledTargetPostIdRef.current = targetPostId'), 'Must mark target post as handled');

    // Cleans up query params with replace: true to preserve browser history
    assert.ok(homeContent.includes("newParams.delete('post')"), 'Must clean up post param');
    assert.ok(homeContent.includes("newParams.delete('openComments')"), 'Must clean up openComments param');
    assert.ok(homeContent.includes("setSearchParams(newParams, { replace: true })"), 'Must use replace: true to maintain back/forward history');

    // Provides fallback feedback banner for filtered/inaccessible posts
    assert.ok(homeContent.includes('targetPostNotice'), 'Must provide targetPostNotice state');
    assert.ok(homeContent.includes('The linked post was not found in this filtered view'), 'Must offer filtered view guidance');
    assert.ok(homeContent.includes('View all posts'), 'Must offer button to switch to all posts');
  });

  // ── 9. Static Inspection of PostCard DOM Target Stability ──
  await t.test('9. PostCard attaches safe DOM identifiers and supports highlight styling', () => {
    const postCardContent = fs.readFileSync(
      path.join(frontendSrc, 'components/community/feed/PostCard/index.jsx'),
      'utf8'
    );

    // Binds id and data-post-id
    assert.ok(postCardContent.includes('id={elementId}'), 'Must bind elementId to motion.article');
    assert.ok(postCardContent.includes('data-post-id={postId}'), 'Must bind data-post-id');
    assert.ok(postCardContent.includes('<div id={rawId} className="sr-only" aria-hidden="true" />'), 'Must support alias raw id for hash compatibility');

    // Receives and styles isHighlighted
    assert.ok(postCardContent.includes('isHighlighted'), 'Must accept isHighlighted prop');
    assert.ok(postCardContent.includes('border-brand-mint'), 'Must style highlighted post card with brand-mint border');
  });
});
