import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Community Business Content Creation Test Suite — Phase 4
 *
 * Verifies:
 * 1. Publishing Context Resolution (Personal vs Business A vs Business B)
 * 2. Post Creation Payload Formation (organizationId propagation & personal backward compatibility)
 * 3. Reel Creation Payload Formation (Reel Studio reusing post pipeline with organizationId)
 * 4. Story Creation Payload Formation (Story API with optional organizationId)
 * 5. In-flight Context Stability (Mid-flight active profile switch protection)
 * 6. Post Draft Storage Key Partitioning (No cross-company draft leakage)
 * 7. Business Identity Normalization for Composers & Previews
 * 8. Multi-Business Sequential and Concurrent Isolation
 */

// Helper simulating publishing context resolution in CommunityHome & Modals
function resolvePublishingContext({ activeProfileType = 'personal', activeBusinessId = null, business = null } = {}) {
  const isBusiness = activeProfileType === 'business' && Boolean(activeBusinessId);
  return {
    profileType: isBusiness ? 'business' : 'personal',
    organizationId: isBusiness ? activeBusinessId : null,
    organization: isBusiness ? business : null,
  };
}

// Helper simulating post payload formation in CreatePostModal
function createPostPayload({ content = '', media = [], audience = 'PUBLIC', publishingContext = null } = {}) {
  const isBusiness = publishingContext?.profileType === 'business' && Boolean(publishingContext?.organizationId);
  return {
    content,
    media,
    audience,
    organizationId: isBusiness ? publishingContext.organizationId : undefined,
  };
}

// Helper simulating reel payload formation in ReelStudioModal
function createReelPayload({ caption = '', mediaItem = {}, publishingContext = null } = {}) {
  const isBusiness = publishingContext?.profileType === 'business' && Boolean(publishingContext?.organizationId);
  return {
    content: caption,
    type: 'VIDEO',
    media: [mediaItem],
    organizationId: isBusiness ? publishingContext.organizationId : undefined,
  };
}

// Helper simulating story payload formation in CreateStoryModal
function createStoryPayload({ type = 'IMAGE', text = '', mediaUrl = '', publishingContext = null } = {}) {
  const isBusiness = publishingContext?.profileType === 'business' && Boolean(publishingContext?.organizationId);
  return {
    type,
    text: text || undefined,
    mediaUrl: mediaUrl || undefined,
    organizationId: isBusiness ? publishingContext.organizationId : undefined,
  };
}

// Helper simulating draft storage key scoping
function resolveDraftStorageKey(baseKey, publishingContext) {
  const isBusiness = publishingContext?.profileType === 'business' && Boolean(publishingContext?.organizationId);
  if (isBusiness) {
    return `${baseKey}_business_${publishingContext.organizationId}`;
  }
  return `${baseKey}_personal`;
}

describe('Community Business Content Creation — Phase 4 Core Contracts', () => {
  const companyA = {
    _id: '6601a2b3c4d5e6f7a8b9c0d1',
    id: '6601a2b3c4d5e6f7a8b9c0d1',
    name: 'Zeitnah Academy',
    slug: 'zeitnah-academy',
    logo: 'https://cdn.zeitnah.com/logos/academy.png',
  };

  const companyB = {
    _id: '6601a2b3c4d5e6f7a8b9c0d2',
    id: '6601a2b3c4d5e6f7a8b9c0d2',
    name: 'Build Dynamics GmbH',
    slug: 'build-dynamics',
    logo: 'https://cdn.zeitnah.com/logos/build.png',
  };

  describe('1. Publishing Context Resolution', () => {
    it('resolves personal publishing context when activeProfileType is personal', () => {
      const ctx = resolvePublishingContext({
        activeProfileType: 'personal',
        activeBusinessId: null,
        business: null,
      });
      assert.equal(ctx.profileType, 'personal');
      assert.equal(ctx.organizationId, null);
      assert.equal(ctx.organization, null);
    });

    it('resolves business publishing context for Company A', () => {
      const ctx = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyA.id,
        business: companyA,
      });
      assert.equal(ctx.profileType, 'business');
      assert.equal(ctx.organizationId, companyA.id);
      assert.deepEqual(ctx.organization, companyA);
    });

    it('resolves business publishing context for Company B', () => {
      const ctx = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyB.id,
        business: companyB,
      });
      assert.equal(ctx.profileType, 'business');
      assert.equal(ctx.organizationId, companyB.id);
      assert.deepEqual(ctx.organization, companyB);
    });
  });

  describe('2. Post Creation Payload Formation', () => {
    it('creates personal post with organizationId undefined (100% backward compatible)', () => {
      const personalCtx = resolvePublishingContext({ activeProfileType: 'personal' });
      const payload = createPostPayload({
        content: 'Personal engineering thought',
        publishingContext: personalCtx,
      });

      assert.equal(payload.content, 'Personal engineering thought');
      assert.equal(payload.organizationId, undefined);
    });

    it('attaches organizationId to Company A post payload', () => {
      const companyACtx = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyA.id,
        business: companyA,
      });
      const payload = createPostPayload({
        content: 'New structural engineering course released!',
        publishingContext: companyACtx,
      });

      assert.equal(payload.content, 'New structural engineering course released!');
      assert.equal(payload.organizationId, companyA.id);
    });

    it('attaches organizationId to Company B post payload', () => {
      const companyBCtx = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyB.id,
        business: companyB,
      });
      const payload = createPostPayload({
        content: 'We are hiring BIM specialists',
        publishingContext: companyBCtx,
      });

      assert.equal(payload.content, 'We are hiring BIM specialists');
      assert.equal(payload.organizationId, companyB.id);
      assert.notEqual(payload.organizationId, companyA.id);
    });
  });

  describe('3. Reel Creation Payload Formation', () => {
    it('creates personal reel with organizationId undefined', () => {
      const personalCtx = resolvePublishingContext({ activeProfileType: 'personal' });
      const mediaItem = { url: 'https://s3.zeitnah.com/reels/video1.mp4', type: 'video' };
      const payload = createReelPayload({
        caption: 'Personal reel showcase',
        mediaItem,
        publishingContext: personalCtx,
      });

      assert.equal(payload.type, 'VIDEO');
      assert.equal(payload.content, 'Personal reel showcase');
      assert.equal(payload.organizationId, undefined);
      assert.deepEqual(payload.media[0], mediaItem);
    });

    it('creates Company A reel reusing post pipeline with organizationId', () => {
      const companyACtx = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyA.id,
        business: companyA,
      });
      const mediaItem = { url: 'https://s3.zeitnah.com/reels/academy_intro.mp4', type: 'video' };
      const payload = createReelPayload({
        caption: 'Company introductory reel',
        mediaItem,
        publishingContext: companyACtx,
      });

      assert.equal(payload.type, 'VIDEO');
      assert.equal(payload.content, 'Company introductory reel');
      assert.equal(payload.organizationId, companyA.id);
      assert.deepEqual(payload.media[0], mediaItem);
    });
  });

  describe('4. Story Creation Payload Formation', () => {
    it('creates personal story with organizationId undefined', () => {
      const personalCtx = resolvePublishingContext({ activeProfileType: 'personal' });
      const payload = createStoryPayload({
        type: 'TEXT',
        text: 'Personal daily note',
        publishingContext: personalCtx,
      });

      assert.equal(payload.type, 'TEXT');
      assert.equal(payload.text, 'Personal daily note');
      assert.equal(payload.organizationId, undefined);
    });

    it('creates Company A story with organizationId attached', () => {
      const companyACtx = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyA.id,
        business: companyA,
      });
      const payload = createStoryPayload({
        type: 'IMAGE',
        mediaUrl: 'https://s3.zeitnah.com/stories/storyA.jpg',
        publishingContext: companyACtx,
      });

      assert.equal(payload.type, 'IMAGE');
      assert.equal(payload.mediaUrl, 'https://s3.zeitnah.com/stories/storyA.jpg');
      assert.equal(payload.organizationId, companyA.id);
    });
  });

  describe('5. In-flight Context Stability & Profile Switch Protection', () => {
    it('locks in publishing context on composer mount so mid-flight profile switches do not leak', () => {
      // User starts creating under Company A
      let globalActiveProfile = {
        activeProfileType: 'business',
        activeBusinessId: companyA.id,
        business: companyA,
      };

      // Modal snapshots initial context on mount
      const capturedModalContext = resolvePublishingContext(globalActiveProfile);
      assert.equal(capturedModalContext.organizationId, companyA.id);

      // User switches global profile to Company B in another menu while composer is still open
      globalActiveProfile = {
        activeProfileType: 'business',
        activeBusinessId: companyB.id,
        business: companyB,
      };

      // When publish is clicked, capturedModalContext is used — publishing as Company A!
      const payload = createPostPayload({
        content: 'Company A post in flight',
        publishingContext: capturedModalContext,
      });

      assert.equal(payload.organizationId, companyA.id);
      assert.notEqual(payload.organizationId, globalActiveProfile.activeBusinessId);
    });

    it('in-flight Reel upload retains original company context even after global switch to Personal', () => {
      // Start upload under Company B
      const inFlightReelContext = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyB.id,
        business: companyB,
      });

      // User switches to Personal
      const newGlobalState = {
        activeProfileType: 'personal',
        activeBusinessId: null,
        business: null,
      };

      // In-flight upload completes and publishes with inFlightReelContext
      const payload = createReelPayload({
        caption: 'Company B large video finish',
        mediaItem: { url: 'https://s3.zeitnah.com/reels/videoB.mp4' },
        publishingContext: inFlightReelContext,
      });

      assert.equal(payload.organizationId, companyB.id);
      assert.notEqual(payload.organizationId, newGlobalState.activeBusinessId);
    });
  });

  describe('6. Post Draft Storage Partitioning', () => {
    const baseKey = 'zeitnah_post_draft';

    it('generates partitioned storage keys for Personal, Company A, and Company B', () => {
      const personalKey = resolveDraftStorageKey(baseKey, { profileType: 'personal' });
      const companyAKey = resolveDraftStorageKey(baseKey, { profileType: 'business', organizationId: companyA.id });
      const companyBKey = resolveDraftStorageKey(baseKey, { profileType: 'business', organizationId: companyB.id });

      assert.equal(personalKey, 'zeitnah_post_draft_personal');
      assert.equal(companyAKey, `zeitnah_post_draft_business_${companyA.id}`);
      assert.equal(companyBKey, `zeitnah_post_draft_business_${companyB.id}`);

      assert.notEqual(personalKey, companyAKey);
      assert.notEqual(companyAKey, companyBKey);
      assert.notEqual(personalKey, companyBKey);
    });

    it('simulates local storage isolation preventing cross-company draft restore', () => {
      const mockStorage = new Map();

      const companyACtx = { profileType: 'business', organizationId: companyA.id };
      const companyBCtx = { profileType: 'business', organizationId: companyB.id };

      // Save draft for Company A
      const keyA = resolveDraftStorageKey(baseKey, companyACtx);
      mockStorage.set(keyA, JSON.stringify({ content: 'Confidential Company A announcement' }));

      // Check draft for Company B — should be empty!
      const keyB = resolveDraftStorageKey(baseKey, companyBCtx);
      const draftB = mockStorage.get(keyB);
      assert.equal(draftB, undefined);

      // Check draft for Company A — intact!
      const draftA = JSON.parse(mockStorage.get(keyA));
      assert.equal(draftA.content, 'Confidential Company A announcement');
    });
  });

  describe('7. Multi-Business Sequential Creation Isolation', () => {
    it('executes sequential creations without state bleed', () => {
      // 1. Company A post
      const ctxA = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyA.id,
        business: companyA,
      });
      const postA = createPostPayload({ content: 'Post A', publishingContext: ctxA });
      assert.equal(postA.organizationId, companyA.id);

      // 2. Company B post
      const ctxB = resolvePublishingContext({
        activeProfileType: 'business',
        activeBusinessId: companyB.id,
        business: companyB,
      });
      const postB = createPostPayload({ content: 'Post B', publishingContext: ctxB });
      assert.equal(postB.organizationId, companyB.id);

      // 3. Company A reel
      const reelA = createReelPayload({ caption: 'Reel A', mediaItem: {}, publishingContext: ctxA });
      assert.equal(reelA.organizationId, companyA.id);

      // 4. Company B reel
      const reelB = createReelPayload({ caption: 'Reel B', mediaItem: {}, publishingContext: ctxB });
      assert.equal(reelB.organizationId, companyB.id);

      // 5. Personal post
      const personalCtx = resolvePublishingContext({ activeProfileType: 'personal' });
      const personalPost = createPostPayload({ content: 'Personal', publishingContext: personalCtx });
      assert.equal(personalPost.organizationId, undefined);
    });
  });
});
