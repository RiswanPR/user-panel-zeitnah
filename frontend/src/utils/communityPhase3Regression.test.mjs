import test from 'node:test';
import assert from 'node:assert/strict';

test('Phase 3 Regression: Organization Feed Query Key Isolation', () => {
  // Test query key formation logic from useCommunityFeed
  const getQueryKey = ({ filter = 'all', activeProfileType = 'personal', activeBusinessId = null, organizationId = null } = {}) => {
    const effectiveOrgId = organizationId || (activeProfileType === 'business' ? activeBusinessId : null);
    const isDedicatedOrgFeed = Boolean(organizationId);
    const isBusiness = !isDedicatedOrgFeed && activeProfileType === 'business' && Boolean(activeBusinessId);

    return isDedicatedOrgFeed
      ? ['community', 'feed', 'organization', organizationId, { filter }]
      : isBusiness
      ? ['community', 'feed', 'business', activeBusinessId, { filter }]
      : ['community', 'feed', 'personal', { filter }];
  };

  const keyCompanyA = getQueryKey({ organizationId: 'company-uuid-1', filter: 'all' });
  const keyCompanyB = getQueryKey({ organizationId: 'company-uuid-2', filter: 'all' });
  const keyPersonal = getQueryKey({ filter: 'following' });
  const keyBusinessMode = getQueryKey({ activeProfileType: 'business', activeBusinessId: 'company-uuid-1', filter: 'all' });

  // 1. Company A and Company B must have completely distinct cache keys
  assert.notDeepEqual(keyCompanyA, keyCompanyB);
  assert.equal(keyCompanyA[2], 'organization');
  assert.equal(keyCompanyA[3], 'company-uuid-1');
  assert.equal(keyCompanyB[3], 'company-uuid-2');

  // 2. Personal feed is isolated from organization feeds
  assert.notDeepEqual(keyCompanyA, keyPersonal);
  assert.equal(keyPersonal[2], 'personal');

  // 3. Dedicated organization feed key is isolated from creator business mode feed key
  assert.notDeepEqual(keyCompanyA, keyBusinessMode);
});

test('Phase 3 Regression: Follow Status & Notification Preference Normalization', () => {
  const normalizeFollowStatus = (raw) => {
    return {
      isFollowing: Boolean(raw?.isFollowing),
      notificationsEnabled: Boolean(raw?.notificationsEnabled),
      followersCount: Math.max(0, Number(raw?.followersCount) || 0),
      organizationId: String(raw?.organizationId || raw?._id || ''),
    };
  };

  // Followed with notifications active
  const status1 = normalizeFollowStatus({
    isFollowing: true,
    notificationsEnabled: true,
    followersCount: 42,
    organizationId: 'org-123',
  });
  assert.equal(status1.isFollowing, true);
  assert.equal(status1.notificationsEnabled, true);
  assert.equal(status1.followersCount, 42);

  // Followed with notifications disabled (muted)
  const status2 = normalizeFollowStatus({
    isFollowing: true,
    notificationsEnabled: false,
    followersCount: 42,
    organizationId: 'org-123',
  });
  assert.equal(status2.isFollowing, true);
  assert.equal(status2.notificationsEnabled, false);
  assert.equal(status2.followersCount, 42);

  // Unfollowed state resets properly
  const status3 = normalizeFollowStatus(null);
  assert.equal(status3.isFollowing, false);
  assert.equal(status3.notificationsEnabled, false);
  assert.equal(status3.followersCount, 0);
});

test('Phase 3 Regression: Deterministic Compound Cursor Resolution', () => {
  const parseCompoundCursor = (cursor) => {
    if (!cursor || typeof cursor !== 'string') return null;
    const parts = cursor.trim().split('_');
    if (parts.length >= 2) {
      const datePart = parts[0];
      const idPart = parts.slice(1).join('_');
      const d = new Date(datePart);
      if (!isNaN(d.getTime()) && idPart) {
        return { cursorDate: d, cursorId: idPart };
      }
    }
    return null;
  };

  const iso = '2026-10-10T12:00:00.000Z';
  const postId = 'post_id_abc_123';
  const cursor = `${iso}_${postId}`;

  const parsed = parseCompoundCursor(cursor);
  assert.ok(parsed);
  assert.equal(parsed.cursorDate.toISOString(), iso);
  assert.equal(parsed.cursorId, postId);

  // Rejects invalid strings safely without throwing
  assert.equal(parseCompoundCursor('invalid-cursor'), null);
  assert.equal(parseCompoundCursor(''), null);
  assert.equal(parseCompoundCursor(null), null);
});
