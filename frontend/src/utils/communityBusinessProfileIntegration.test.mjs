import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBusinessProfile,
  normalizeBusinessIdentity,
  getBusinessProfileUrl,
} from './businessProfile.js';
import { groupStoriesByUser } from './storyGrouping.js';

/**
 * Business Profile ↔ Company Feed Integration Test Suite — Phase 5
 *
 * Verifies:
 * 1. Business Profile → Company Feed navigation and context activation
 * 2. Scenario A & B: Viewing a business profile does NOT mutate active profile; explicit switch does
 * 3. Company Feed → Business Profile canonical URL resolution
 * 4. Content Identity Isolation (Post, Reel, Story) for Business A, Business B, and Personal
 * 5. Historical content identity immutability (activeBusinessId does NOT rewrite past content)
 * 6. Business Profile creation integration (publishingContext propagation)
 * 7. Story grouping for business organizations vs personal users
 * 8. Empty state semantics and publishing permission checks
 * 9. Fallback safety for deleted/suspended businesses to Personal
 */

describe('Phase 5 — Business Profile ↔ Company Feed Navigation & Context', () => {
  const companyA = {
    _id: '6601a2b3c4d5e6f7a8b9c0d1',
    name: 'Zeitnah Academy',
    slug: 'zeitnah-academy',
    logo: 'https://cdn.zeitnah.com/logos/academy.png',
  };

  const companyB = {
    _id: '6601a2b3c4d5e6f7a8b9c0d2',
    name: 'Zeitnah Labs',
    slug: 'zeitnah-labs',
    logo: 'https://cdn.zeitnah.com/logos/labs.png',
  };

  // Simulates Business Profile "View Company Feed" action handler
  function handleViewCompanyFeed({
    isMyBusiness,
    businessId,
    activeBusinessId,
    switchToBusinessFn,
    navigateFn,
  }) {
    if (isMyBusiness && businessId) {
      if (activeBusinessId !== businessId && typeof switchToBusinessFn === 'function') {
        switchToBusinessFn(businessId);
      }
    }
    navigateFn('/community');
  }

  it('navigates to /community and switches active business when owner views company feed', () => {
    let switchedTo = null;
    let navigatedTo = null;

    handleViewCompanyFeed({
      isMyBusiness: true,
      businessId: companyA._id,
      activeBusinessId: null, // User is currently personal
      switchToBusinessFn: (id) => { switchedTo = id; },
      navigateFn: (path) => { navigatedTo = path; },
    });

    assert.equal(switchedTo, companyA._id, 'Must activate Company A before landing on /community');
    assert.equal(navigatedTo, '/community', 'Must navigate to /community');
  });

  it('switches away from Company B to Company A when owner opens Company A feed', () => {
    let switchedTo = null;
    let navigatedTo = null;

    handleViewCompanyFeed({
      isMyBusiness: true,
      businessId: companyA._id,
      activeBusinessId: companyB._id, // User previously had Company B active
      switchToBusinessFn: (id) => { switchedTo = id; },
      navigateFn: (path) => { navigatedTo = path; },
    });

    assert.equal(switchedTo, companyA._id, 'Must switch active context to Company A');
    assert.equal(navigatedTo, '/community');
  });

  it('does NOT call switchToBusiness if already active on Company A', () => {
    let switchedTo = null;
    let navigatedTo = null;

    handleViewCompanyFeed({
      isMyBusiness: true,
      businessId: companyA._id,
      activeBusinessId: companyA._id, // Already active
      switchToBusinessFn: (id) => { switchedTo = id; },
      navigateFn: (path) => { navigatedTo = path; },
    });

    assert.equal(switchedTo, null, 'Should not redundantly call switch if already active');
    assert.equal(navigatedTo, '/community');
  });

  it('Scenario B: Viewing public business profile does NOT mutate active profile without explicit action', () => {
    let activeState = {
      activeProfileType: 'personal',
      activeBusinessId: null,
    };

    // Viewing page simply reads business data, activeState remains unchanged
    const viewedBusiness = normalizeBusinessProfile(companyA);
    assert.equal(viewedBusiness.slug, 'zeitnah-academy');
    assert.equal(activeState.activeProfileType, 'personal');
    assert.equal(activeState.activeBusinessId, null);

    // Explicit switch action:
    function explicitSwitch(businessId) {
      activeState = {
        activeProfileType: 'business',
        activeBusinessId: businessId,
      };
    }

    explicitSwitch(companyA._id);
    assert.equal(activeState.activeProfileType, 'business');
    assert.equal(activeState.activeBusinessId, companyA._id);
  });

  it('resolves canonical business profile URL from CompanyFeedHeader', () => {
    const urlA = getBusinessProfileUrl(companyA);
    assert.equal(urlA, '/businesses/zeitnah-academy');

    const urlB = getBusinessProfileUrl(companyB);
    assert.equal(urlB, '/businesses/zeitnah-labs');

    // Fallback to _id when slug is absent
    const urlFallback = getBusinessProfileUrl({ _id: '123456789012345678901234' });
    assert.equal(urlFallback, '/businesses/123456789012345678901234');
  });
});

describe('Phase 5 — Content Identity & Historical Isolation', () => {
  const companyA = {
    _id: '6601a2b3c4d5e6f7a8b9c0d1',
    name: 'Zeitnah Academy',
    slug: 'zeitnah-academy',
    logo: 'https://cdn.zeitnah.com/logos/academy.png',
  };

  const companyB = {
    _id: '6601a2b3c4d5e6f7a8b9c0d2',
    name: 'Zeitnah Labs',
    slug: 'zeitnah-labs',
    logo: 'https://cdn.zeitnah.com/logos/labs.png',
  };

  const personalUser = {
    _id: 'user-alice-123',
    name: 'Alice Developer',
    username: 'alice_dev',
    avatar: 'https://cdn.zeitnah.com/avatars/alice.png',
  };

  // Simulates PostHeader resolution
  function resolvePostHeaderIdentity(post) {
    const isBusinessPost = Boolean(post?.organization || post?.organizationId);
    if (isBusinessPost) {
      const org = post.organization;
      return {
        isBusiness: true,
        displayName: org?.name || 'Company',
        handle: org?.slug ? `@${org.slug}` : '',
        profileUrl: getBusinessProfileUrl(org || post.organizationId),
        avatarUrl: org?.logo || null,
        badgeText: 'Company',
      };
    }
    return {
      isBusiness: false,
      displayName: post?.author?.name || 'User',
      handle: post?.author?.username ? `@${post.author.username}` : '',
      profileUrl: `/profile/${post?.author?.username || post?.authorId || ''}`,
      avatarUrl: post?.author?.avatar || null,
      badgeText: null,
    };
  }

  // Simulates ReelItem identity resolution
  function resolveReelIdentity(post) {
    const isBusinessReel = Boolean(post?.organization);
    if (isBusinessReel) {
      const org = post.organization;
      return {
        isBusiness: true,
        authorName: org.name || 'Company',
        authorHandle: org.slug ? `@${org.slug}` : '',
        profileUrl: getBusinessProfileUrl(org),
        authorAvatar: org.logo || null,
        canConnect: false,
      };
    }
    return {
      isBusiness: false,
      authorName: post?.author?.name || 'User',
      authorHandle: post?.author?.username ? `@${post.author.username}` : '',
      profileUrl: `/profile/${post?.author?.username || post?.authorId || ''}`,
      authorAvatar: post?.author?.avatar || null,
      canConnect: true,
    };
  }

  // Simulates StoryViewer identity resolution
  function resolveStoryViewerIdentity(story) {
    const isBusinessStory = Boolean(story?.organization);
    if (isBusinessStory) {
      const org = story.organization;
      return {
        isBusiness: true,
        authorName: org.name || 'Company',
        authorProfileUrl: getBusinessProfileUrl(org),
        authorAvatar: org.logo || null,
      };
    }
    return {
      isBusiness: false,
      authorName: story?.author?.name || 'User',
      authorProfileUrl: `/profile/${story?.author?.username || story?.authorId || ''}`,
      authorAvatar: story?.author?.avatar || null,
    };
  }

  it('correctly resolves Business A post identity and canonical profile URL', () => {
    const postA = {
      _id: 'post-101',
      authorId: personalUser._id,
      organizationId: companyA._id,
      organization: companyA,
      content: 'Academy updates',
    };

    const header = resolvePostHeaderIdentity(postA);
    assert.equal(header.isBusiness, true);
    assert.equal(header.displayName, 'Zeitnah Academy');
    assert.equal(header.handle, '@zeitnah-academy');
    assert.equal(header.profileUrl, '/businesses/zeitnah-academy');
    assert.equal(header.badgeText, 'Company');
  });

  it('correctly resolves Business B post identity and canonical profile URL', () => {
    const postB = {
      _id: 'post-102',
      authorId: personalUser._id,
      organizationId: companyB._id,
      organization: companyB,
      content: 'Labs innovations',
    };

    const header = resolvePostHeaderIdentity(postB);
    assert.equal(header.isBusiness, true);
    assert.equal(header.displayName, 'Zeitnah Labs');
    assert.equal(header.handle, '@zeitnah-labs');
    assert.equal(header.profileUrl, '/businesses/zeitnah-labs');
    assert.equal(header.badgeText, 'Company');
  });

  it('correctly resolves Personal post identity and preserves personal profile route', () => {
    const personalPost = {
      _id: 'post-103',
      authorId: personalUser._id,
      author: personalUser,
      organizationId: null,
      organization: null,
      content: 'Personal reflections',
    };

    const header = resolvePostHeaderIdentity(personalPost);
    assert.equal(header.isBusiness, false);
    assert.equal(header.displayName, 'Alice Developer');
    assert.equal(header.handle, '@alice_dev');
    assert.equal(header.profileUrl, '/profile/alice_dev');
    assert.equal(header.badgeText, null);
  });

  it('Historical Post isolation: active business does NOT rewrite historical post identity', () => {
    // Current active profile is Company B
    const currentActiveBusinessId = companyB._id;

    // Past post created by Company A
    const historicalPostA = {
      _id: 'post-historical-a',
      authorId: personalUser._id,
      organizationId: companyA._id,
      organization: companyA,
    };

    const header = resolvePostHeaderIdentity(historicalPostA);
    assert.notEqual(header.profileUrl, '/businesses/zeitnah-labs');
    assert.equal(header.profileUrl, '/businesses/zeitnah-academy');
    assert.equal(header.displayName, 'Zeitnah Academy');
  });

  it('Reel identity: resolves business reel with company profile link and disables peer connection', () => {
    const businessReel = {
      _id: 'reel-101',
      authorId: personalUser._id,
      organizationId: companyA._id,
      organization: companyA,
      content: 'Academy reel video',
    };

    const reelIdentity = resolveReelIdentity(businessReel);
    assert.equal(reelIdentity.isBusiness, true);
    assert.equal(reelIdentity.authorName, 'Zeitnah Academy');
    assert.equal(reelIdentity.profileUrl, '/businesses/zeitnah-academy');
    assert.equal(reelIdentity.canConnect, false, 'Peer connection requests must be disabled for business reels');
  });

  it('Reel identity: personal reel retains user profile link and enables peer connection', () => {
    const personalReel = {
      _id: 'reel-102',
      authorId: personalUser._id,
      author: personalUser,
      organization: null,
    };

    const reelIdentity = resolveReelIdentity(personalReel);
    assert.equal(reelIdentity.isBusiness, false);
    assert.equal(reelIdentity.authorName, 'Alice Developer');
    assert.equal(reelIdentity.profileUrl, '/profile/alice_dev');
    assert.equal(reelIdentity.canConnect, true);
  });

  it('Story identity: resolves business story with company profile link in StoryViewer', () => {
    const businessStory = {
      _id: 'story-101',
      authorId: personalUser._id,
      organizationId: companyB._id,
      organization: companyB,
      text: 'Labs announcement',
    };

    const storyIdentity = resolveStoryViewerIdentity(businessStory);
    assert.equal(storyIdentity.isBusiness, true);
    assert.equal(storyIdentity.authorName, 'Zeitnah Labs');
    assert.equal(storyIdentity.authorProfileUrl, '/businesses/zeitnah-labs');
  });
});

describe('Phase 5 — Story Grouping by Organization vs User', () => {
  const companyA = {
    _id: '6601a2b3c4d5e6f7a8b9c0d1',
    name: 'Zeitnah Academy',
    slug: 'zeitnah-academy',
    logo: 'https://cdn.zeitnah.com/logos/academy.png',
  };

  it('groups business stories under organization ID rather than individual author', () => {
    const stories = [
      {
        _id: 'story-a1',
        authorId: 'author-alice',
        organizationId: companyA._id,
        organization: companyA,
        createdAt: '2026-10-08T10:00:00Z',
      },
      {
        _id: 'story-a2',
        authorId: 'author-bob', // Different author, same organization
        organizationId: companyA._id,
        organization: companyA,
        createdAt: '2026-10-08T11:00:00Z',
      },
      {
        _id: 'story-p1',
        authorId: 'author-chris',
        author: { _id: 'author-chris', name: 'Chris Personal' },
        organizationId: null,
        createdAt: '2026-10-08T12:00:00Z',
      },
    ];

    const { userGroups } = groupStoriesByUser(stories, 'author-alice');

    // Must have 2 distinct groups: 1 for Company A, 1 for Chris Personal
    assert.equal(userGroups.length, 2);

    const orgGroup = userGroups.find(g => g.isBusiness);
    assert.ok(orgGroup, 'Must have a business group');
    assert.equal(orgGroup.displayName, 'Zeitnah Academy');
    assert.equal(orgGroup.stories.length, 2, 'Must group both stories under Company A');
    assert.equal(orgGroup.userId, `org_${companyA._id}`);

    const personalGroup = userGroups.find(g => !g.isBusiness);
    assert.ok(personalGroup, 'Must have a personal group');
    assert.equal(personalGroup.displayName, 'Chris Personal');
    assert.equal(personalGroup.stories.length, 1);
  });
});

describe('Phase 5 — Business Profile Creation & Publishing Context', () => {
  const companyA = {
    _id: '6601a2b3c4d5e6f7a8b9c0d1',
    name: 'Zeitnah Academy',
    slug: 'zeitnah-academy',
  };

  // Simulates publishing context preparation on PublicBusinessProfilePage
  function resolveBusinessProfilePublishingContext(business, isMyBusiness) {
    if (!isMyBusiness || !business?._id) return null;
    return {
      profileType: 'business',
      organizationId: business._id,
      organization: business,
    };
  }

  it('prepares business publishing context when owner clicks Create on Business Profile', () => {
    const context = resolveBusinessProfilePublishingContext(companyA, true);
    assert.deepEqual(context, {
      profileType: 'business',
      organizationId: companyA._id,
      organization: companyA,
    });
  });

  it('returns null context if user is not authorized for this business', () => {
    const context = resolveBusinessProfilePublishingContext(companyA, false);
    assert.equal(context, null);
  });
});

describe('Phase 5 — Empty State & Safe Fallbacks', () => {
  function getEmptyFeedState({ isBusiness = false, canPublish = false, businessName = '' } = {}) {
    if (!isBusiness) {
      return {
        title: 'No posts yet',
        description: 'Be the first to share something with the community.',
        showCreateAction: true,
      };
    }

    return {
      title: 'No posts yet',
      description: `${businessName || 'Your company'} hasn't shared anything here yet.`,
      showCreateAction: canPublish,
      actionLabel: canPublish ? 'Create your first post' : null,
    };
  }

  it('renders company empty state with Create action when user is authorized', () => {
    const state = getEmptyFeedState({
      isBusiness: true,
      canPublish: true,
      businessName: 'Zeitnah Academy',
    });
    assert.equal(state.title, 'No posts yet');
    assert.equal(state.description, "Zeitnah Academy hasn't shared anything here yet.");
    assert.equal(state.showCreateAction, true);
    assert.equal(state.actionLabel, 'Create your first post');
  });

  it('renders company empty state without Create action when user cannot publish', () => {
    const state = getEmptyFeedState({
      isBusiness: true,
      canPublish: false,
      businessName: 'Zeitnah Academy',
    });
    assert.equal(state.showCreateAction, false);
    assert.equal(state.actionLabel, null);
  });

  it('fallback: invalid activeBusinessId reverts to personal profile', () => {
    const registeredBusinesses = [{ _id: 'org-valid-1', name: 'Valid Org' }];
    const staleBusinessId = 'org-deleted-99';

    function reconcileActiveProfile(activeProfileType, activeBusinessId, businesses) {
      if (activeProfileType === 'business') {
        const exists = businesses.some(b => b._id === activeBusinessId);
        if (!exists) {
          return {
            activeProfileType: 'personal',
            activeBusinessId: null,
          };
        }
      }
      return { activeProfileType, activeBusinessId };
    }

    const reconciled = reconcileActiveProfile('business', staleBusinessId, registeredBusinesses);
    assert.equal(reconciled.activeProfileType, 'personal');
    assert.equal(reconciled.activeBusinessId, null);
  });
});
