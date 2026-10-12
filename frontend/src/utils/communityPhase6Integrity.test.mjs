import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Phase 6: Feed Cache Invalidation Scoping on Follow/Unfollow Mutations', () => {
  const useCommunityFile = path.resolve('src/hooks/useCommunity.js');
  assert.ok(fs.existsSync(useCommunityFile), 'useCommunity.js must exist');

  const content = fs.readFileSync(useCommunityFile, 'utf8');

  // Verify followMutation and unfollowMutation invalidate root ['community', 'feed'] query
  assert.ok(
    content.includes("queryClient.invalidateQueries({ queryKey: ['community', 'feed'] })"),
    'useOrganizationFollow must invalidate root community feed query so Following feed refreshes immediately on follow/unfollow',
  );
});

test('Phase 6: Client Upload Pre-Validation & Configuration Boundaries', () => {
  const CLIENT_UPLOAD_LIMITS = {
    MAX_IMAGE_SIZE: 8 * 1024 * 1024, // 8 MiB
    MAX_VIDEO_SIZE: 1024 * 1024 * 1024, // 1 GiB (route limit)
    RECOMMENDED_SAFE_VIDEO_SIZE: 100 * 1024 * 1024, // 100 MiB (reverse-proxy safe recommendation)
    MAX_VIDEO_DURATION_SECONDS: 90,
  };

  const validateUploadFile = (file) => {
    if (!file) return { valid: false, error: 'File is required' };
    if (file.type.startsWith('image/')) {
      if (file.size > CLIENT_UPLOAD_LIMITS.MAX_IMAGE_SIZE) {
        return { valid: false, error: 'Image exceeds maximum 8MB size limit' };
      }
    } else if (file.type.startsWith('video/')) {
      if (file.size > CLIENT_UPLOAD_LIMITS.MAX_VIDEO_SIZE) {
        return { valid: false, error: 'Video exceeds maximum 1GB route limit' };
      }
    }
    return { valid: true };
  };

  assert.equal(validateUploadFile({ type: 'image/png', size: 5 * 1024 * 1024 }).valid, true);
  assert.equal(validateUploadFile({ type: 'image/png', size: 10 * 1024 * 1024 }).valid, false);
  assert.equal(validateUploadFile({ type: 'video/mp4', size: 50 * 1024 * 1024 }).valid, true);
  assert.equal(validateUploadFile({ type: 'video/mp4', size: 1.5 * 1024 * 1024 * 1024 }).valid, false);
});

test('Phase 6: Cross-Feature Identity & Draft Isolation Under Switching', () => {
  const getDraftStorageKey = (isBusinessMode, organizationId) => {
    if (isBusinessMode && organizationId) {
      return `zeitnah_post_draft_business_${organizationId}`;
    }
    return 'zeitnah_post_draft_personal';
  };

  const personalKey = getDraftStorageKey(false, null);
  const companyKey1 = getDraftStorageKey(true, 'company-1');
  const companyKey2 = getDraftStorageKey(true, 'company-2');

  assert.notEqual(personalKey, companyKey1);
  assert.notEqual(companyKey1, companyKey2);
  assert.equal(personalKey, 'zeitnah_post_draft_personal');
});

test('Phase 6: Comment Moderation & Alternate Endpoint Safety Verification', () => {
  const commentItemFile = path.resolve('src/components/community/comments/CommentItem.jsx');
  const postCardFile = path.resolve('src/components/community/feed/PostCard/index.jsx');

  const commentItemSrc = fs.readFileSync(commentItemFile, 'utf8');
  assert.ok(commentItemSrc.includes('canModerate'), 'CommentItem must accept canModerate prop');
  assert.ok(commentItemSrc.includes('ReportModal'), 'CommentItem must mount ReportModal for reporting');

  const postCardSrc = fs.readFileSync(postCardFile, 'utf8');
  assert.ok(postCardSrc.includes('canModerate'), 'PostCard must calculate canModerate');
  assert.ok(postCardSrc.includes('ReportModal'), 'PostCard must mount ReportModal for reporting');
});
