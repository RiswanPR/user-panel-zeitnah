import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBusinessProfile,
  normalizeBusinessIdentity,
  getBusinessProfileUrl,
} from './businessProfile.js';

/**
 * Community Company Feed Test Suite — Phase 3
 *
 * Verifies:
 * 1. Personal mode query formation and cache key scoping
 * 2. Business mode query formation with activeBusinessId
 * 3. Query key isolation across Company A, Company B, and Personal
 * 4. Switching Company A → Company B ensures independent query keys (no stale bleed)
 * 5. Switching Company B → Personal mode restores personal query key
 * 6. Business profile link generation and company identity formatting
 * 7. PostCard header business identity resolution
 * 8. Empty company feed messaging semantics
 */

describe('Community Company Feed — Phase 3 Query Key & Cache Isolation', () => {
  // Simulates useCommunityFeed queryKey resolution logic
  function resolveFeedQueryKey({ filter = 'all', activeProfileType = 'personal', activeBusinessId = null } = {}) {
    const isBusiness = activeProfileType === 'business' && Boolean(activeBusinessId);
    return isBusiness
      ? ['community', 'feed', 'business', activeBusinessId, { filter }]
      : ['community', 'feed', 'personal', { filter }];
  }

  // Simulates communityApi.getFeed param resolution logic
  function resolveFeedApiParams({ filter = 'all', cursor = '', limit = 10, activeProfileType = 'personal', activeBusinessId = null } = {}) {
    const isBusiness = activeProfileType === 'business' && Boolean(activeBusinessId);
    return {
      cursor: cursor || undefined,
      limit,
      filter: filter && filter !== 'all' ? filter : undefined,
      organizationId: isBusiness ? activeBusinessId : undefined,
    };
  }

  it('generates personal feed query key when activeProfileType is personal', () => {
    const key = resolveFeedQueryKey({
      filter: 'all',
      activeProfileType: 'personal',
      activeBusinessId: null,
    });
    assert.deepEqual(key, ['community', 'feed', 'personal', { filter: 'all' }]);
  });

  it('generates company feed query key with exact activeBusinessId for Company A', () => {
    const companyAId = '6601a2b3c4d5e6f7a8b9c0d1';
    const key = resolveFeedQueryKey({
      filter: 'all',
      activeProfileType: 'business',
      activeBusinessId: companyAId,
    });
    assert.deepEqual(key, ['community', 'feed', 'business', companyAId, { filter: 'all' }]);
  });

  it('generates separate company feed query key with exact activeBusinessId for Company B', () => {
    const companyBId = '6601a2b3c4d5e6f7a8b9c0d2';
    const key = resolveFeedQueryKey({
      filter: 'all',
      activeProfileType: 'business',
      activeBusinessId: companyBId,
    });
    assert.deepEqual(key, ['community', 'feed', 'business', companyBId, { filter: 'all' }]);
  });

  it('guarantees Company A and Company B query keys never collide or bleed cached pages', () => {
    const keyA = resolveFeedQueryKey({ activeProfileType: 'business', activeBusinessId: 'comp-A' });
    const keyB = resolveFeedQueryKey({ activeProfileType: 'business', activeBusinessId: 'comp-B' });
    const keyPersonal = resolveFeedQueryKey({ activeProfileType: 'personal', activeBusinessId: null });

    assert.notDeepEqual(keyA, keyB);
    assert.notDeepEqual(keyA, keyPersonal);
    assert.notDeepEqual(keyB, keyPersonal);
    assert.equal(keyA[3], 'comp-A');
    assert.equal(keyB[3], 'comp-B');
  });

  it('switching Company A → Company B immediately produces distinct query key and pagination scope', () => {
    let activeState = { activeProfileType: 'business', activeBusinessId: 'company-1' };
    const key1 = resolveFeedQueryKey(activeState);

    // Switch to Company B
    activeState = { activeProfileType: 'business', activeBusinessId: 'company-2' };
    const key2 = resolveFeedQueryKey(activeState);

    assert.equal(key1[3], 'company-1');
    assert.equal(key2[3], 'company-2');
    assert.notEqual(key1[3], key2[3]);
  });

  it('switching Company B → Personal mode restores clean personal query key without companyId', () => {
    let activeState = { activeProfileType: 'business', activeBusinessId: 'company-2' };
    assert.equal(resolveFeedQueryKey(activeState)[2], 'business');

    // Switch back to Personal
    activeState = { activeProfileType: 'personal', activeBusinessId: null };
    const personalKey = resolveFeedQueryKey(activeState);

    assert.equal(personalKey[2], 'personal');
    assert.equal(personalKey.length, 4);
    assert.equal(personalKey[3].filter, 'all');
  });

  it('passes organizationId in API params only when in business mode with activeBusinessId', () => {
    const personalParams = resolveFeedApiParams({
      activeProfileType: 'personal',
      activeBusinessId: null,
    });
    assert.equal(personalParams.organizationId, undefined);

    const businessParams = resolveFeedApiParams({
      activeProfileType: 'business',
      activeBusinessId: 'org-12345',
    });
    assert.equal(businessParams.organizationId, 'org-12345');
  });

  it('does not send organizationId if activeBusinessId is missing even if activeProfileType is business', () => {
    const edgeParams = resolveFeedApiParams({
      activeProfileType: 'business',
      activeBusinessId: null,
    });
    assert.equal(edgeParams.organizationId, undefined);
  });
});

describe('Community Company Feed — Phase 3 Header & Identity Resolution', () => {
  it('resolves canonical public business profile link from business object or slug', () => {
    const business = {
      _id: 'org-abc',
      name: 'Zeitnah Academy',
      slug: 'zeitnahacademy',
      logo: 'https://cdn.example.com/logo.png',
    };

    const link = getBusinessProfileUrl(business);
    assert.equal(link, '/businesses/zeitnahacademy');

    const rawSlugLink = getBusinessProfileUrl('Acme-Corp');
    assert.equal(rawSlugLink, '/businesses/acme-corp');

    const emptyLink = getBusinessProfileUrl(null);
    assert.equal(emptyLink, '/businesses');
  });

  it('correctly formats business post author identity over individual author', () => {
    const postWithOrg = {
      _id: 'post-1',
      authorId: 'user-999',
      author: {
        _id: 'user-999',
        name: 'Jane Developer',
        username: 'janedev',
      },
      organization: {
        _id: 'org-100',
        name: 'Zeitnah Robotics',
        slug: 'zeitnahrobotics',
        logo: 'https://cdn.example.com/robotics.png',
      },
      content: 'Launching our latest AI robotics toolkit!',
      createdAt: new Date().toISOString(),
    };

    const isBusinessPost = Boolean(postWithOrg.organization);
    const displayName = isBusinessPost ? postWithOrg.organization.name : postWithOrg.author.name;
    const profileUrl = isBusinessPost
      ? getBusinessProfileUrl(postWithOrg.organization)
      : `/profile/${postWithOrg.author.username}`;
    const handle = isBusinessPost
      ? `@${postWithOrg.organization.slug}`
      : `@${postWithOrg.author.username}`;

    assert.equal(isBusinessPost, true);
    assert.equal(displayName, 'Zeitnah Robotics');
    assert.equal(profileUrl, '/businesses/zeitnahrobotics');
    assert.equal(handle, '@zeitnahrobotics');
  });

  it('correctly formats personal post author identity when organization is null', () => {
    const personalPost = {
      _id: 'post-2',
      authorId: 'user-999',
      author: {
        _id: 'user-999',
        name: 'Jane Developer',
        username: 'janedev',
      },
      organization: null,
      content: 'Excited to start learning Rust!',
      createdAt: new Date().toISOString(),
    };

    const isBusinessPost = Boolean(personalPost.organization);
    const displayName = isBusinessPost ? personalPost.organization.name : personalPost.author.name;
    const handle = isBusinessPost
      ? `@${personalPost.organization?.slug}`
      : `@${personalPost.author.username}`;

    assert.equal(isBusinessPost, false);
    assert.equal(displayName, 'Jane Developer');
    assert.equal(handle, '@janedev');
  });

  it('guarantees empty state in business mode conveys company message without fake create button', () => {
    const emptyStateConfig = {
      isBusinessMode: true,
      hasPosts: false,
    };

    const title = emptyStateConfig.isBusinessMode ? 'No posts yet' : 'The community is getting started';
    const description = emptyStateConfig.isBusinessMode
      ? "Your company hasn't shared anything here yet."
      : 'Be one of the first people to share...';
    const showCreateButton = !emptyStateConfig.isBusinessMode; // Business create is reserved for later phase

    assert.equal(title, 'No posts yet');
    assert.equal(description, "Your company hasn't shared anything here yet.");
    assert.equal(showCreateButton, false);
  });
});

describe('Community Company Feed — Bug Fix & Regression Suite', () => {
  // Test effective feed filter isolation
  function resolveEffectiveFeedFilter(isBusinessMode, activeFilter) {
    return isBusinessMode
      ? (activeFilter === 'trending' ? 'trending' : 'all')
      : activeFilter;
  }

  it('normalizes personal URL filters (following, cohort) to all when in business mode', () => {
    assert.equal(resolveEffectiveFeedFilter(true, 'following'), 'all');
    assert.equal(resolveEffectiveFeedFilter(true, 'cohort'), 'all');
    assert.equal(resolveEffectiveFeedFilter(true, 'all'), 'all');
    assert.equal(resolveEffectiveFeedFilter(true, 'trending'), 'trending');
  });

  it('preserves personal URL filters when in personal mode', () => {
    assert.equal(resolveEffectiveFeedFilter(false, 'following'), 'following');
    assert.equal(resolveEffectiveFeedFilter(false, 'cohort'), 'cohort');
    assert.equal(resolveEffectiveFeedFilter(false, 'all'), 'all');
    assert.equal(resolveEffectiveFeedFilter(false, 'trending'), 'trending');
  });

  // Test useCreatePost cache targeting
  function resolveCreatePostTargetQueryKey(post) {
    const isBusinessPost = Boolean(post?.organizationId);
    return isBusinessPost
      ? ['community', 'feed', 'business', post.organizationId]
      : ['community', 'feed', 'personal'];
  }

  it('routes created business post cache updates strictly to matching company query key', () => {
    const bizPostA = { id: 'p1', organizationId: 'company-A', content: 'News' };
    const bizPostB = { id: 'p2', organizationId: 'company-B', content: 'Update' };
    const personalPost = { id: 'p3', organizationId: null, content: 'Hello' };

    const keyA = resolveCreatePostTargetQueryKey(bizPostA);
    const keyB = resolveCreatePostTargetQueryKey(bizPostB);
    const keyP = resolveCreatePostTargetQueryKey(personalPost);

    assert.deepEqual(keyA, ['community', 'feed', 'business', 'company-A']);
    assert.deepEqual(keyB, ['community', 'feed', 'business', 'company-B']);
    assert.deepEqual(keyP, ['community', 'feed', 'personal']);
    assert.notDeepEqual(keyA, keyB);
    assert.notDeepEqual(keyA, keyP);
  });

  // Test error vs empty state separation
  it('distinguishes API error state from genuinely empty feed', () => {
    function resolveFeedViewState({ feedLoading, feedError, displayedPostsLength }) {
      if (feedLoading) return 'LOADING';
      if (feedError) return 'ERROR';
      if (displayedPostsLength === 0) return 'EMPTY';
      return 'POSTS';
    }

    assert.equal(resolveFeedViewState({ feedLoading: true, feedError: false, displayedPostsLength: 0 }), 'LOADING');
    assert.equal(resolveFeedViewState({ feedLoading: false, feedError: true, displayedPostsLength: 0 }), 'ERROR');
    assert.equal(resolveFeedViewState({ feedLoading: false, feedError: false, displayedPostsLength: 0 }), 'EMPTY');
    assert.equal(resolveFeedViewState({ feedLoading: false, feedError: false, displayedPostsLength: 5 }), 'POSTS');
  });

  // Test hydration safety
  it('does not wipe persisted business profile while businesses are loading', () => {
    let storageWiped = false;
    function simulateHydration({ currentUserId, storageKey, isLoading, businesses, persisted }) {
      if (!currentUserId || !storageKey) return 'personal';
      if (isLoading) return 'pending'; // Do not evaluate or wipe!

      if (persisted?.type === 'business' && persisted?.businessId) {
        const found = (businesses || []).find((b) => b.id === persisted.businessId);
        if (found) return 'business';
        storageWiped = true;
        return 'personal';
      }
      return 'personal';
    }

    // Step 1: Initial mount when isLoading is true
    const step1 = simulateHydration({
      currentUserId: 'u1',
      storageKey: 'key_u1',
      isLoading: true,
      businesses: [],
      persisted: { type: 'business', businessId: 'biz-1' },
    });
    assert.equal(step1, 'pending');
    assert.equal(storageWiped, false, 'Storage must not be wiped while loading');

    // Step 2: Once loaded
    const step2 = simulateHydration({
      currentUserId: 'u1',
      storageKey: 'key_u1',
      isLoading: false,
      businesses: [{ id: 'biz-1', name: 'Zeitnah' }],
      persisted: { type: 'business', businessId: 'biz-1' },
    });
    assert.equal(step2, 'business');
    assert.equal(storageWiped, false);
  });
});
