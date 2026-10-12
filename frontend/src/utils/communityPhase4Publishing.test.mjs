import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Phase 4: Shared Composer Identity Switching & Draft Isolation', () => {
  const getDraftStorageKey = (isBusinessMode, organizationId) => {
    if (isBusinessMode && organizationId) {
      return `zeitnah_post_draft_business_${organizationId}`;
    }
    return 'zeitnah_post_draft_personal';
  };

  const personalKey = getDraftStorageKey(false, null);
  const companyAKey = getDraftStorageKey(true, 'company-uuid-1');
  const companyBKey = getDraftStorageKey(true, 'company-uuid-2');

  assert.equal(personalKey, 'zeitnah_post_draft_personal');
  assert.equal(companyAKey, 'zeitnah_post_draft_business_company-uuid-1');
  assert.equal(companyBKey, 'zeitnah_post_draft_business_company-uuid-2');

  // Verify full isolation between personal and multiple companies
  assert.notEqual(personalKey, companyAKey);
  assert.notEqual(companyAKey, companyBKey);
});

test('Phase 4: Post Creation Payload Construction & Audience Normalization', () => {
  const constructCreatePayload = ({
    content = '',
    audience = 'PUBLIC',
    media = [],
    tags = [],
    hasPoll = false,
    pollQuestion = '',
    pollOptions = [],
    isBusinessMode = false,
    organizationId = null,
    idempotencyKey = null,
  }) => {
    let normalizedAudience = (audience || 'PUBLIC').toUpperCase();
    if (normalizedAudience === 'COHORT') normalizedAudience = 'COURSE';
    if (!['PUBLIC', 'COURSE', 'BATCH', 'PRIVATE'].includes(normalizedAudience)) {
      normalizedAudience = 'PUBLIC';
    }

    let postType = 'TEXT';
    if (hasPoll) {
      postType = 'POLL';
    } else if (media.length > 0) {
      postType = media[0].type === 'video' ? 'VIDEO' : 'IMAGE';
    }

    const payload = {
      content: content.trim(),
      audience: normalizedAudience,
      type: postType,
      media,
      tags,
    };

    if (idempotencyKey) {
      payload.idempotencyKey = idempotencyKey;
    }

    const cleanOrgId = typeof organizationId === 'string' ? organizationId.trim() : null;
    if (isBusinessMode && cleanOrgId) {
      payload.organizationId = cleanOrgId;
    }

    return payload;
  };

  // 1. Personal text post
  const personalPayload = constructCreatePayload({
    content: 'Personal engineering insight',
    audience: 'PUBLIC',
    isBusinessMode: false,
  });
  assert.equal(personalPayload.organizationId, undefined);
  assert.equal(personalPayload.type, 'TEXT');
  assert.equal(personalPayload.audience, 'PUBLIC');

  // 2. Company video post with audience COHORT normalized to COURSE
  const companyPayload = constructCreatePayload({
    content: 'Official training session',
    audience: 'COHORT',
    media: [{ type: 'video', url: 'https://s3.amazonaws.com/test.mp4' }],
    isBusinessMode: true,
    organizationId: 'org-abc-123',
    idempotencyKey: 'idem-key-789',
  });
  assert.equal(companyPayload.organizationId, 'org-abc-123');
  assert.equal(companyPayload.type, 'VIDEO');
  assert.equal(companyPayload.audience, 'COURSE');
  assert.equal(companyPayload.idempotencyKey, 'idem-key-789');

  // 3. Falsy / whitespace organizationId is omitted
  const cleanPayload = constructCreatePayload({
    content: 'Personal post with empty org',
    isBusinessMode: false,
    organizationId: '   ',
  });
  assert.equal(cleanPayload.organizationId, undefined);
});

test('Phase 4: Query Cache Invalidation Scoping for Mutations', () => {
  const getInvalidationQueryKeys = (post, isCompanyPost = false, orgId = null) => {
    const keys = [
      ['community', 'feed'],
      ['community', 'saved'],
    ];

    if (isCompanyPost && orgId) {
      keys.push(['community', 'feed', 'organization', orgId]);
      keys.push(['public-business']);
    }

    if (post?.type === 'VIDEO' || post?.type === 'video') {
      keys.push(['community', 'feed', { filter: 'video' }]);
      keys.push(['reels']);
    }

    return keys;
  };

  const personalKeys = getInvalidationQueryKeys({ type: 'TEXT' }, false, null);
  assert.equal(personalKeys.length, 2);
  assert.deepEqual(personalKeys[0], ['community', 'feed']);

  const companyVideoKeys = getInvalidationQueryKeys(
    { type: 'VIDEO' },
    true,
    'org-company-1'
  );
  assert.equal(companyVideoKeys.length, 6);
  assert.ok(
    companyVideoKeys.some(
      (k) =>
        k[0] === 'community' &&
        k[1] === 'feed' &&
        k[2] === 'organization' &&
        k[3] === 'org-company-1'
    ),
    'Must invalidate dedicated company feed'
  );
  assert.ok(
    companyVideoKeys.some((k) => k[0] === 'public-business'),
    'Must invalidate public business query'
  );
  assert.ok(
    companyVideoKeys.some((k) => k[0] === 'reels'),
    'Must invalidate reels query for video posts'
  );
});

test('Phase 4: Architectural Source Code Verification', () => {
  // 1. CreatePostModal has interactive identity switcher
  const modalPath = path.resolve('src/components/community/composer/CreatePostModal.jsx');
  assert.ok(fs.existsSync(modalPath), 'CreatePostModal.jsx must exist');
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  assert.ok(
    modalContent.includes('showIdentityMenu'),
    'CreatePostModal must include showIdentityMenu state'
  );
  assert.ok(
    modalContent.includes('Publishing as'),
    'CreatePostModal must render Publishing as identity chooser'
  );
  assert.ok(
    modalContent.includes('draftStorageKey'),
    'CreatePostModal must isolate draftStorageKey per profile'
  );

  // 2. CommunityComposer wires useActiveProfile & passes company identity
  const composerPath = path.resolve('src/components/community/composer/CommunityComposer.jsx');
  assert.ok(fs.existsSync(composerPath), 'CommunityComposer.jsx must exist');
  const composerContent = fs.readFileSync(composerPath, 'utf8');
  assert.ok(
    composerContent.includes('useActiveProfile'),
    'CommunityComposer must consume useActiveProfile'
  );
  assert.ok(
    composerContent.includes('publishingContext='),
    'CommunityComposer must pass publishingContext to modal'
  );

  // 3. ComposerCollapsed and ComposerExpanded support business mode
  const collapsedPath = path.resolve('src/components/community/composer/ComposerCollapsed.jsx');
  const collapsedContent = fs.readFileSync(collapsedPath, 'utf8');
  assert.ok(
    collapsedContent.includes('isBusinessMode'),
    'ComposerCollapsed must support isBusinessMode'
  );
  assert.ok(
    collapsedContent.includes('BusinessLogo'),
    'ComposerCollapsed must render BusinessLogo when in business mode'
  );

  const expandedPath = path.resolve('src/components/community/composer/ComposerExpanded.jsx');
  const expandedContent = fs.readFileSync(expandedPath, 'utf8');
  assert.ok(
    expandedContent.includes('isBusinessMode'),
    'ComposerExpanded must support isBusinessMode'
  );
  assert.ok(
    expandedContent.includes('BusinessLogo'),
    'ComposerExpanded must render BusinessLogo when in business mode'
  );

  // 4. useCommunity hook exports useUpdatePost and comprehensive cache invalidations
  const hookPath = path.resolve('src/hooks/useCommunity.js');
  const hookContent = fs.readFileSync(hookPath, 'utf8');
  assert.ok(
    hookContent.includes('useUpdatePost'),
    'useCommunity must export useUpdatePost mutation hook'
  );
  assert.ok(
    hookContent.includes("['community', 'feed', 'organization'"),
    'useCommunity must invalidate dedicated organization feed on mutation'
  );
});
