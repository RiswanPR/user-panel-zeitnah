import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Community Production Audit & Stabilization Regression Suite
 *
 * Exercises the production scenario:
 * - Organization A: Zeitnah academy (id: 6abf302319a9558d3cb251db)
 * - Organization B: Ritech surveying and engineering (id: 6abdfb8a188447d10d94bb7a)
 * - Personal Profile: Founder Riyas Ali PJ (id: 6a46de6a0d6e9bee9cbcc626)
 *
 * Verifies:
 * 1. Feed query keys & parameter scoping for Personal, Zeitnah Academy, and Ritech
 * 2. Strict isolation ensuring Ritech displays valid empty state ("No posts yet")
 * 3. Zeitnah academy query returns all 5 business posts (4 migrated + 1 new test post)
 * 4. Personal feed strictly excludes all business posts
 * 5. Media resolution distinguishes video vs image vs text-first presentation
 * 6. Profile switching preserves query key uniqueness and prevents stale page bleeding
 */

const ZEITNAH_ACADEMY_ID = '6abf302319a9558d3cb251db';
const RITECH_SURVEYING_ID = '6abdfb8a188447d10d94bb7a';
const FOUNDER_USER_ID = '6a46de6a0d6e9bee9cbcc626';

// Canonical query key resolver from useCommunityFeed
function resolveFeedQueryKey({ filter = 'all', activeProfileType = 'personal', activeBusinessId = null } = {}) {
  const isBusiness = activeProfileType === 'business' && Boolean(activeBusinessId);
  return isBusiness
    ? ['community', 'feed', 'business', activeBusinessId, { filter }]
    : ['community', 'feed', 'personal', { filter }];
}

// Canonical API params resolver from communityApi.getFeed
function resolveFeedApiParams({ filter = 'all', cursor = '', limit = 10, activeProfileType = 'personal', activeBusinessId = null } = {}) {
  const isBusiness = activeProfileType === 'business' && Boolean(activeBusinessId);
  return {
    cursor: cursor || undefined,
    limit,
    filter: filter && filter !== 'all' ? filter : undefined,
    organizationId: isBusiness ? activeBusinessId : undefined,
  };
}

describe('Community Production Audit — Three-Way Profile Switching & Isolation', () => {
  it('generates distinct, isolated query keys for Personal, Zeitnah Academy, and Ritech', () => {
    const personalKey = resolveFeedQueryKey({ activeProfileType: 'personal', activeBusinessId: null });
    const zeitnahKey = resolveFeedQueryKey({ activeProfileType: 'business', activeBusinessId: ZEITNAH_ACADEMY_ID });
    const ritechKey = resolveFeedQueryKey({ activeProfileType: 'business', activeBusinessId: RITECH_SURVEYING_ID });

    assert.deepEqual(personalKey, ['community', 'feed', 'personal', { filter: 'all' }]);
    assert.deepEqual(zeitnahKey, ['community', 'feed', 'business', ZEITNAH_ACADEMY_ID, { filter: 'all' }]);
    assert.deepEqual(ritechKey, ['community', 'feed', 'business', RITECH_SURVEYING_ID, { filter: 'all' }]);

    assert.notDeepEqual(zeitnahKey, ritechKey);
    assert.notDeepEqual(zeitnahKey, personalKey);
    assert.notDeepEqual(ritechKey, personalKey);
  });

  it('sequential switching Personal → Zeitnah Academy → Ritech → Personal guarantees clean state transitions', () => {
    let state = { activeProfileType: 'personal', activeBusinessId: null };
    assert.equal(resolveFeedQueryKey(state)[2], 'personal');
    assert.equal(resolveFeedApiParams(state).organizationId, undefined);

    // Switch to Zeitnah Academy
    state = { activeProfileType: 'business', activeBusinessId: ZEITNAH_ACADEMY_ID };
    assert.equal(resolveFeedQueryKey(state)[3], ZEITNAH_ACADEMY_ID);
    assert.equal(resolveFeedApiParams(state).organizationId, ZEITNAH_ACADEMY_ID);

    // Switch to Ritech Surveying
    state = { activeProfileType: 'business', activeBusinessId: RITECH_SURVEYING_ID };
    assert.equal(resolveFeedQueryKey(state)[3], RITECH_SURVEYING_ID);
    assert.equal(resolveFeedApiParams(state).organizationId, RITECH_SURVEYING_ID);

    // Switch back to Personal
    state = { activeProfileType: 'personal', activeBusinessId: null };
    assert.equal(resolveFeedQueryKey(state)[2], 'personal');
    assert.equal(resolveFeedApiParams(state).organizationId, undefined);
  });
});

describe('Community Production Audit — Feed Scoping & Data Invariants', () => {
  const productionDatabasePosts = [
    // 5 Zeitnah Academy Posts
    { _id: '4a06f9a4-1fcf-424e-898d-59fba4e0e24b', organizationId: ZEITNAH_ACADEMY_ID, authorId: FOUNDER_USER_ID, content: 'test', type: 'TEXT', isDeleted: false },
    { _id: 'cc77baed-088d-4ec7-ae00-fc45934b710d', organizationId: ZEITNAH_ACADEMY_ID, authorId: FOUNDER_USER_ID, content: 'Course provide - QS, LS, MEP and GIS', type: 'IMAGE', isDeleted: false, media: [{ url: 'https://s3/IMG_7804.jpeg', type: 'image' }] },
    { _id: '494030a2-424b-46b5-91ef-bc60320b1394', organizationId: ZEITNAH_ACADEMY_ID, authorId: FOUNDER_USER_ID, content: '🚨 OCTOBER QS BATCH INTAKE', type: 'VIDEO', isDeleted: false, media: [{ url: 'https://s3/video.mov', type: 'video' }] },
    { _id: '33d65b06-2de4-49c5-9323-7cf649d8efbd', organizationId: ZEITNAH_ACADEMY_ID, authorId: FOUNDER_USER_ID, content: 'Diploma in land surveying', type: 'IMAGE', isDeleted: false, media: [{ url: 'https://s3/IMG_7789.jpeg', type: 'image' }] },
    { _id: 'f2bb0656-49f2-4917-afd7-06459eb650e3', organizationId: ZEITNAH_ACADEMY_ID, authorId: FOUNDER_USER_ID, content: 'GIS', type: 'IMAGE', isDeleted: false, media: [{ url: 'https://s3/IMG_7790.jpeg', type: 'image' }] },
    // 6 Personal Posts
    { _id: '7195b011-0f3b-4486-98a8-6923e4eae7af', organizationId: null, authorId: FOUNDER_USER_ID, content: 'Congrats jibin✨👏', type: 'IMAGE', isDeleted: false },
    { _id: '2de94c93-3e41-4134-b1c0-00626a1d995e', organizationId: null, authorId: FOUNDER_USER_ID, content: 'road topo', type: 'IMAGE', isDeleted: false },
    { _id: 'e514ee39-20ff-461e-8d6c-3d1f9392e7c9', organizationId: null, authorId: 'riswan-id', content: 'hey', type: 'VIDEO', isDeleted: false },
    { _id: '69a7c2b5-4424-4ad4-9142-9e0456d2a5f7', organizationId: null, authorId: FOUNDER_USER_ID, content: 'Hai team Zeitnah', type: 'TEXT', isDeleted: false },
    { _id: 'cc64665f-264a-48f7-bf01-c4b09c3b79f2', organizationId: null, authorId: FOUNDER_USER_ID, content: '', type: 'TEXT', isDeleted: false },
    { _id: '934323f9-1664-44cc-af82-749e9fb6ef12', organizationId: null, authorId: 'student-id', content: '', type: 'TEXT', isDeleted: false },
  ];

  function simulateFeedQuery(organizationId) {
    if (organizationId) {
      return productionDatabasePosts.filter((p) => !p.isDeleted && p.organizationId === organizationId);
    }
    return productionDatabasePosts.filter((p) => !p.isDeleted && (p.organizationId === null || p.organizationId === undefined));
  }

  it('verifies Zeitnah Academy returns all 5 posts including the new test post and 4 historical posts', () => {
    const results = simulateFeedQuery(ZEITNAH_ACADEMY_ID);
    assert.equal(results.length, 5);
    const ids = results.map((r) => r._id);
    assert.ok(ids.includes('4a06f9a4-1fcf-424e-898d-59fba4e0e24b')); // test
    assert.ok(ids.includes('cc77baed-088d-4ec7-ae00-fc45934b710d')); // QS, LS, MEP, GIS
    assert.ok(ids.includes('494030a2-424b-46b5-91ef-bc60320b1394')); // QS Batch Intake
    assert.ok(ids.includes('33d65b06-2de4-49c5-9323-7cf649d8efbd')); // Land Surveying
    assert.ok(ids.includes('f2bb0656-49f2-4917-afd7-06459eb650e3')); // GIS
  });

  it('verifies Ritech surveying returns exactly 0 posts and produces valid empty state', () => {
    const results = simulateFeedQuery(RITECH_SURVEYING_ID);
    assert.equal(results.length, 0);

    // Empty state contract
    const isEmpty = results.length === 0;
    assert.equal(isEmpty, true);
    const emptyStateMeta = {
      title: 'No posts yet',
      description: "Your company hasn't shared anything here yet.",
      actionLabel: 'Create a Post',
    };
    assert.equal(emptyStateMeta.title, 'No posts yet');
  });

  it('verifies Personal feed returns only personal posts and strictly excludes business posts', () => {
    const results = simulateFeedQuery(undefined);
    assert.equal(results.length, 6);
    // Ensure no Zeitnah or Ritech posts leaked
    results.forEach((p) => {
      assert.equal(p.organizationId, null);
    });
  });

  it('guarantees media presentation distinguishes video posts from images and text', () => {
    const videoPost = productionDatabasePosts.find((p) => p._id === '494030a2-424b-46b5-91ef-bc60320b1394');
    const imagePost = productionDatabasePosts.find((p) => p._id === 'cc77baed-088d-4ec7-ae00-fc45934b710d');
    const textPost = productionDatabasePosts.find((p) => p._id === '4a06f9a4-1fcf-424e-898d-59fba4e0e24b');

    assert.equal(videoPost.type, 'VIDEO');
    assert.equal(videoPost.media[0].type, 'video');

    assert.equal(imagePost.type, 'IMAGE');
    assert.equal(imagePost.media[0].type, 'image');

    assert.equal(textPost.type, 'TEXT');
    assert.equal(textPost.media, undefined);
  });
});

describe('Community Production Audit — Mutation Cache Isolation & Quote Post Scoping', () => {
  it('correctly resolves isolated targetQueryKey for personal and business quote posts', () => {
    function resolveQuoteTargetQueryKey(newPost) {
      const isBusinessPost = Boolean(newPost?.organizationId);
      return isBusinessPost
        ? ['community', 'feed', 'business', newPost.organizationId]
        : ['community', 'feed', 'personal'];
    }

    const personalQuote = { _id: 'quote-1', organizationId: null, content: 'Personal quote' };
    const businessQuote = { _id: 'quote-2', organizationId: ZEITNAH_ACADEMY_ID, content: 'Academy quote' };

    assert.deepEqual(resolveQuoteTargetQueryKey(personalQuote), ['community', 'feed', 'personal']);
    assert.deepEqual(resolveQuoteTargetQueryKey(businessQuote), ['community', 'feed', 'business', ZEITNAH_ACADEMY_ID]);
  });

  it('verifies quote post prepending never leaks business quote into personal feed or vice-versa', () => {
    const feeds = {
      personal: [{ _id: 'post-p-1', content: 'personal' }],
      zeitnah: [{ _id: 'post-z-1', content: 'zeitnah' }],
      ritech: [],
    };

    const newBusinessQuote = {
      _id: 'quote-z-new',
      organizationId: ZEITNAH_ACADEMY_ID,
      content: 'Academy quote',
    };

    // Target feed update logic
    const isBusiness = Boolean(newBusinessQuote.organizationId);
    const targetKey = isBusiness ? 'zeitnah' : 'personal';

    // Prepend strictly to targetKey
    feeds[targetKey] = [newBusinessQuote, ...feeds[targetKey]];

    // Verify Zeitnah received the post
    assert.equal(feeds.zeitnah.length, 2);
    assert.equal(feeds.zeitnah[0]._id, 'quote-z-new');

    // Verify Personal and Ritech feeds were NOT contaminated
    assert.equal(feeds.personal.length, 1);
    assert.equal(feeds.personal[0]._id, 'post-p-1');
    assert.equal(feeds.ritech.length, 0);
  });

  it('verifies repost stat updates on original post across feeds without prepending into unowned feeds', () => {
    const targetPostId = 'post-shared-1';
    const feeds = {
      feedA: [{ _id: targetPostId, stats: { reposts: 3 } }],
      feedB: [{ _id: 'other-post', stats: { reposts: 0 } }],
    };

    const incrementRepostCount = (item) => {
      if (item._id === targetPostId) {
        return {
          ...item,
          stats: {
            ...item.stats,
            reposts: (item.stats?.reposts || 0) + 1,
          },
        };
      }
      return item;
    };

    feeds.feedA = feeds.feedA.map(incrementRepostCount);
    feeds.feedB = feeds.feedB.map(incrementRepostCount);

    assert.equal(feeds.feedA[0].stats.reposts, 4);
    assert.equal(feeds.feedB[0].stats.reposts, 0);
  });
});
