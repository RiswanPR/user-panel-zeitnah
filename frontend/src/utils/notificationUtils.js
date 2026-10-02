/**
 * @file notificationUtils.js
 * Authoritative notification utility functions for deduplication, stable sorting,
 * routing resolution, actor extraction, formatting, and date grouping.
 */

import { getUploadUrl } from './courseUi.js';

/**
 * Safely extracts notification ID
 */
export function getNotificationId(item) {
  if (!item || typeof item !== 'object') return '';
  return String(item._id || item.id || '');
}

/**
 * Deduplicates and sorts notifications deterministically.
 * Primary sort: createdAt DESC
 * Tie-breaker: _id DESC
 *
 * @param {Array} items
 * @returns {Array}
 */
export function deduplicateAndSortNotifications(items) {
  if (!Array.isArray(items)) return [];

  const map = new Map();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const id = getNotificationId(item);
    if (!id) continue;

    // If duplicate ID exists, keep the one with newer updatedAt or readAt state
    if (map.has(id)) {
      const existing = map.get(id);
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const newTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      if (newTime >= existingTime) {
        map.set(id, { ...existing, ...item });
      }
    } else {
      map.set(id, item);
    }
  }

  const unique = Array.from(map.values());

  unique.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();

    if (timeA !== timeB) {
      return timeB - timeA; // Newest first
    }

    // Deterministic tie-breaker
    const idA = getNotificationId(a);
    const idB = getNotificationId(b);
    return idB.localeCompare(idA);
  });

  return unique;
}

/**
 * Merges existing notifications with incoming batch (e.g. pagination or realtime)
 * with strict deduplication and stable sort order.
 *
 * @param {Array} existingList
 * @param {Array|Object} incoming
 * @returns {Array}
 */
export function mergeNotifications(existingList = [], incoming = []) {
  const incomingArray = Array.isArray(incoming) ? incoming : (incoming ? [incoming] : []);
  return deduplicateAndSortNotifications([...existingList, ...incomingArray]);
}

/**
 * Extracts actor information safely from populated or raw notification.
 * Handles both populated `actorId` object and legacy `actor` object.
 *
 * @param {Object} notif
 * @returns {{ name: string, avatarUrl: string|null, initials: string, role: string }}
 */
export function extractNotificationActor(notif) {
  if (!notif || typeof notif !== 'object') {
    return { name: 'Zeitnah', avatarUrl: null, initials: 'Z', role: 'System' };
  }

  const actorObj =
    typeof notif.actorId === 'object' && notif.actorId !== null
      ? notif.actorId
      : typeof notif.actor === 'object' && notif.actor !== null
      ? notif.actor
      : null;

  const rawName = actorObj?.name || actorObj?.fullName || notif.metadata?.actorName || '';
  const cleanName = String(rawName).trim() || 'Zeitnah';

  const rawAvatar = actorObj?.avatar || actorObj?.profileImage || notif.metadata?.actorAvatar || null;
  const avatarUrl = rawAvatar ? getUploadUrl(rawAvatar) : null;

  const role = actorObj?.role || actorObj?.primaryRole || notif.metadata?.actorRole || 'System';

  // Compute initials
  const initials = cleanName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'Z';

  return {
    name: cleanName,
    avatarUrl,
    initials,
    role,
  };
}

/**
 * Authoritative Notification Routing Resolver.
 * Normalizes legacy routes, validates targets, and handles external links safely.
 *
 * @param {Object} notif
 * @returns {{ url: string, isExternal: boolean, isNavigable: boolean }}
 */
export function resolveNotificationRoute(notif) {
  if (!notif || typeof notif !== 'object') {
    return { url: '/notifications', isExternal: false, isNavigable: false };
  }

  // 1. Direct explicit links from actionUrl / targetUrl / metadata
  let rawUrl =
    notif.actionUrl ||
    notif.targetUrl ||
    notif.metadata?.cta?.url ||
    notif.metadata?.actionUrl ||
    '';

  // 2. Synthesize route if rawUrl is empty based on type/entity
  if (!rawUrl && notif.type) {
    const typeUpper = String(notif.type).toUpperCase();
    if (typeUpper === 'MESSAGE' || typeUpper === 'MESSAGE_REQUEST') {
      const convId = notif.entityId || notif.metadata?.conversationId;
      rawUrl = convId ? `/messages?c=${convId}` : '/messages';
    } else if (typeUpper === 'OPPORTUNITY') {
      rawUrl = '/opportunities/inbox';
    } else if (typeUpper === 'VERIFICATION_UPDATE') {
      rawUrl = '/profile/verification';
    } else if (typeUpper.startsWith('CONNECTION') || typeUpper === 'FOLLOW') {
      rawUrl = '/network';
    } else if (typeUpper === 'ANNOUNCEMENT' && notif.entityId) {
      rawUrl = `/notifications`;
    }
  }

  if (!rawUrl) {
    return { url: '/notifications', isExternal: false, isNavigable: false };
  }

  // Check for external URLs (http / https)
  if (/^https?:\/\//i.test(rawUrl)) {
    return { url: rawUrl, isExternal: true, isNavigable: true };
  }

  // Normalize internal URLs:
  // Convert legacy /network/profile/:username -> /u/:username
  let normalizedUrl = rawUrl.replace(/^\/network\/profile\//i, '/u/');

  // Ensure leading slash
  if (!normalizedUrl.startsWith('/')) {
    normalizedUrl = `/${normalizedUrl}`;
  }

  return {
    url: normalizedUrl,
    isExternal: false,
    isNavigable: true,
  };
}

/**
 * Format relative time consistently
 * Examples: Just now, 2m ago, 18m ago, 1h ago, Yesterday, Oct 1
 *
 * @param {string|Date} dateValue
 * @returns {string}
 */
export function formatNotificationTime(dateValue) {
  if (!dateValue) return 'Recently';

  const date = new Date(dateValue);
  const time = date.getTime();
  if (isNaN(time)) return 'Recently';

  const now = Date.now();
  const diffMs = Math.max(0, now - time);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Groups a sorted array of notifications into date buckets:
 * "Today", "Yesterday", and "Earlier".
 * Preserves the exact sequence and never drops items.
 *
 * @param {Array} items
 * @returns {Array<{ label: string, items: Array }>}
 */
export function groupNotificationsByDate(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const item of items) {
    if (!item) continue;
    const date = new Date(item.createdAt || 0);
    const itemDay = new Date(date);
    itemDay.setHours(0, 0, 0, 0);

    if (itemDay.getTime() >= today.getTime()) {
      groups.today.push(item);
    } else if (itemDay.getTime() >= yesterday.getTime()) {
      groups.yesterday.push(item);
    } else {
      groups.earlier.push(item);
    }
  }

  const result = [];
  if (groups.today.length > 0) {
    result.push({ label: 'Today', items: groups.today });
  }
  if (groups.yesterday.length > 0) {
    result.push({ label: 'Yesterday', items: groups.yesterday });
  }
  if (groups.earlier.length > 0) {
    result.push({ label: 'Earlier', items: groups.earlier });
  }

  return result;
}

/**
 * Evaluates visual presentation metadata for a notification.
 *
 * @param {Object} notif
 * @returns {Object}
 */
export function getNotificationPresentation(notif = {}) {
  const prioUpper = (notif.priority || 'NORMAL').toUpperCase();
  const isCritical = prioUpper === 'CRITICAL' || notif.category === 'security';
  const isHigh = prioUpper === 'HIGH' || prioUpper === 'IMPORTANT';
  const isUnread = notif.isRead === false || (notif.readAt === null && notif.isRead !== true);

  const category = (notif.category || 'system').toLowerCase();
  const type = String(notif.type || '').toUpperCase();

  let categoryLabel = 'System';
  let iconCategory = 'system';

  if (category === 'announcements' || type === 'ANNOUNCEMENT') {
    categoryLabel = isCritical ? 'Critical Alert' : 'Announcement';
    iconCategory = 'announcement';
  } else if (category === 'system' || category === 'security') {
    categoryLabel = isCritical ? 'Critical Alert' : 'System';
    iconCategory = 'system';
  } else if (category === 'social' || category === 'connections' || type.includes('CONNECTION') || type === 'FOLLOW') {
    categoryLabel = 'Network';
    iconCategory = 'social';
  } else if (category === 'learning' || category === 'course' || type.includes('COURSE') || type.includes('LESSON')) {
    categoryLabel = 'Learning';
    iconCategory = 'learning';
  } else if (category === 'achievement' || category === 'leaderboard' || type.includes('ACHIEVEMENT')) {
    categoryLabel = 'Achievement';
    iconCategory = 'achievement';
  } else if (category === 'spaces' || category === 'community' || category === 'discussions' || type.includes('DISCUSSION') || type.includes('SPACE')) {
    categoryLabel = 'Spaces';
    iconCategory = 'community';
  } else if (category === 'opportunity' || type === 'OPPORTUNITY') {
    categoryLabel = 'Career Opportunity';
    iconCategory = 'opportunity';
  } else if (type === 'MESSAGE' || type === 'MESSAGE_REQUEST') {
    categoryLabel = 'Message';
    iconCategory = 'message';
  } else if (type === 'VERIFICATION_UPDATE' || category === 'identity') {
    categoryLabel = 'Verification';
    iconCategory = 'identity';
  }

  // Fallback for title & message
  const title = notif.title?.trim() || 'Notification update';
  const message = notif.message?.trim() || 'You have a new activity update on Zeitnah.';

  return {
    title,
    message,
    categoryLabel,
    iconCategory,
    isCritical,
    isHigh,
    isUnread,
    priorityBadge: isCritical ? 'Critical' : isHigh ? 'Important' : null,
  };
}
