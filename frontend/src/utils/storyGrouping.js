/**
 * storyGrouping.js — Normalized Story Grouping & Ordering Utility
 *
 * Implements Phase 5 core architecture:
 * - One user = Exactly one Story rail item
 * - Groups multiple stories per user (Map<userId, Story[]>)
 * - Sorts stories chronologically (oldest -> newest) for sequential playback
 * - Sorts user groups: unseen stories first, then newest latestStoryAt
 * - Filters out expired, deleted, or duplicate stories defensively
 */

export function groupStoriesByUser(
  stories = [],
  currentUserId = null,
  viewedStoryIds = new Set(),
  knownOrganizations = []
) {
  if (!Array.isArray(stories) || stories.length === 0) {
    return {
      currentUserGroup: null,
      userGroups: [],
      allGroups: [],
    };
  }

  // Build lookup index for known organizations (e.g. from active user businesses or populated stories)
  const knownOrgMap = new Map();
  if (Array.isArray(knownOrganizations)) {
    for (const item of knownOrganizations) {
      if (item && (item.id || item._id)) {
        knownOrgMap.set(String(item.id || item._id), item);
      }
    }
  }
  for (const s of stories) {
    if (s?.organization && typeof s.organization === 'object') {
      const oId = String(s.organizationId || s.organization._id || s.organization.id || '');
      if (oId && !knownOrgMap.has(oId)) {
        knownOrgMap.set(oId, s.organization);
      }
    }
  }

  const now = new Date();
  const seenStoryIds = new Set();
  const userMap = new Map();

  for (const story of stories) {
    if (!story || story.isDeleted) continue;

    const storyId = String(story._id || story.id || '');
    if (!storyId || seenStoryIds.has(storyId)) continue;

    // Filter out expired stories
    if (story.expiresAt) {
      const expDate = new Date(story.expiresAt);
      if (!isNaN(expDate.getTime()) && expDate <= now) {
        continue;
      }
    }

    seenStoryIds.add(storyId);

    const rawOrgId =
      story.organizationId && typeof story.organizationId === 'object'
        ? (story.organizationId._id || story.organizationId.id)
        : story.organizationId;
    const directOrg =
      story.organization && typeof story.organization === 'object'
        ? story.organization
        : (story.organizationId && typeof story.organizationId === 'object'
            ? story.organizationId
            : null);
    const orgId = rawOrgId || directOrg?._id || directOrg?.id;
    const isBusinessStory = Boolean(directOrg || rawOrgId);
    const resolvedOrg = directOrg || (orgId ? knownOrgMap.get(String(orgId)) : null);

    if (resolvedOrg && !story.organization) {
      story.organization = resolvedOrg;
    }

    const author = story.author || {};
    const authorId = isBusinessStory && orgId
      ? `org_${orgId}`
      : String(author._id || author.id || story.authorId || '');
    if (!authorId) continue;

    if (!userMap.has(authorId)) {
      const isCurrentUser = isBusinessStory
        ? false
        : Boolean(currentUserId && String(currentUserId) === authorId);
      userMap.set(authorId, {
        userId: authorId,
        username: isBusinessStory && resolvedOrg?.slug ? resolvedOrg.slug : (author.username || ''),
        displayName: isBusinessStory && resolvedOrg?.name ? resolvedOrg.name : (author.name || author.displayName || 'Zeitnah Member'),
        avatar: isBusinessStory && resolvedOrg?.logo ? resolvedOrg.logo : (author.avatar || author.profileImage || author.avatarUrl || author.profilePicture || ''),
        role: isBusinessStory ? 'company' : (author.role || 'student'),
        verified: isBusinessStory ? Boolean(resolvedOrg?.isVerified) : !!author.verified,
        isBusiness: isBusinessStory,
        organization: resolvedOrg || null,
        organizationId: isBusinessStory && orgId ? String(orgId) : null,
        isCurrentUser,
        stories: [],
        latestStoryAt: new Date(0),
        hasUnseenStories: false,
      });
    }

    const group = userMap.get(authorId);
    if (isBusinessStory && resolvedOrg) {
      if (!group.organization) group.organization = resolvedOrg;
      if (resolvedOrg.name && (!group.displayName || group.displayName === 'Zeitnah Member' || group.displayName === author.name)) {
        group.displayName = resolvedOrg.name;
      }
      if (resolvedOrg.slug && (!group.username || group.username === author.username)) {
        group.username = resolvedOrg.slug;
      }
      if (resolvedOrg.logo && (!group.avatar || group.avatar === author.avatar)) {
        group.avatar = resolvedOrg.logo;
      }
      if (resolvedOrg.isVerified !== undefined) {
        group.verified = Boolean(resolvedOrg.isVerified);
      }
    }
    group.stories.push(story);

    const storyDate = new Date(story.createdAt || 0);
    if (storyDate > group.latestStoryAt) {
      group.latestStoryAt = storyDate;
    }
  }

  // Finalize each user group: sort stories oldest -> newest and calculate hasUnseenStories
  const allGroups = [];
  let currentUserGroup = null;

  for (const group of userMap.values()) {
    if (group.stories.length === 0) continue;

    // Sort stories within user group from OLDEST to NEWEST (chronological playback)
    group.stories.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    // Determine if user has any unseen stories
    group.hasUnseenStories = group.stories.some((s) => {
      const sId = String(s._id || s.id || '');
      const isSeenLocally = viewedStoryIds instanceof Set ? viewedStoryIds.has(sId) : false;
      const isSeenOnRecord = Boolean(
        s.isViewed ||
        (Array.isArray(s.views) && currentUserId && s.views.some((v) => String(v.userId || v) === String(currentUserId)))
      );
      return !isSeenLocally && !isSeenOnRecord;
    });

    if (group.isCurrentUser) {
      currentUserGroup = group;
    } else {
      allGroups.push(group);
    }
  }

  // Sort other user groups:
  // 1. Users with unseen stories come first
  // 2. Then ordered by latestStoryAt descending (newest activity first)
  allGroups.sort((a, b) => {
    if (a.hasUnseenStories && !b.hasUnseenStories) return -1;
    if (!a.hasUnseenStories && b.hasUnseenStories) return 1;
    return b.latestStoryAt.getTime() - a.latestStoryAt.getTime();
  });

  return {
    currentUserGroup,
    userGroups: allGroups,
    allGroups: currentUserGroup ? [currentUserGroup, ...allGroups] : allGroups,
  };
}
