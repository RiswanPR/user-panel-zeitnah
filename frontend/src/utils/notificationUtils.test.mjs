import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deduplicateAndSortNotifications,
  mergeNotifications,
  extractNotificationActor,
  resolveNotificationRoute,
  formatNotificationTime,
  groupNotificationsByDate,
  getNotificationPresentation,
  getNotificationId,
} from './notificationUtils.js';

describe('Notification Utilities — Deduplication, Ordering, Routing & Presentation', () => {
  it('extracts notification ID reliably from _id or id', () => {
    assert.equal(getNotificationId({ _id: 'abc1' }), 'abc1');
    assert.equal(getNotificationId({ id: 'abc2' }), 'abc2');
    assert.equal(getNotificationId({ _id: 'abc3', id: 'abc4' }), 'abc3');
    assert.equal(getNotificationId(null), '');
    assert.equal(getNotificationId(undefined), '');
  });

  it('deduplicates items by authoritative ID and sorts by newest first with _id tie-breaker', () => {
    const list = [
      { _id: 'notif_1', title: 'First', createdAt: '2026-10-01T10:00:00Z' },
      { _id: 'notif_2', title: 'Second', createdAt: '2026-10-02T12:00:00Z' },
      { _id: 'notif_1', title: 'First Updated', createdAt: '2026-10-01T10:00:00Z', isRead: true },
      { _id: 'notif_3', title: 'Third Same Time as Second', createdAt: '2026-10-02T12:00:00Z' },
    ];

    const result = deduplicateAndSortNotifications(list);
    assert.equal(result.length, 3);

    // notif_3 and notif_2 share timestamp: tie breaker notif_3 vs notif_2
    assert.equal(result[0]._id, 'notif_3');
    assert.equal(result[1]._id, 'notif_2');
    assert.equal(result[2]._id, 'notif_1');
    assert.equal(result[2].isRead, true); // Kept updated version
  });

  it('merges new items with existing list without duplicates or order jumping', () => {
    const existing = [
      { _id: 'item_1', title: 'Item 1', createdAt: '2026-10-01T08:00:00Z' },
      { _id: 'item_2', title: 'Item 2', createdAt: '2026-10-01T07:00:00Z' },
    ];

    const incoming = [
      { _id: 'item_3', title: 'Item 3 (Newest)', createdAt: '2026-10-01T09:00:00Z' },
      { _id: 'item_1', title: 'Item 1 (Updated)', createdAt: '2026-10-01T08:00:00Z', isRead: true },
    ];

    const merged = mergeNotifications(existing, incoming);
    assert.equal(merged.length, 3);
    assert.equal(merged[0]._id, 'item_3');
    assert.equal(merged[1]._id, 'item_1');
    assert.equal(merged[1].isRead, true);
    assert.equal(merged[2]._id, 'item_2');
  });

  it('extracts actor information safely from populated actorId, legacy actor, or metadata', () => {
    // 1. Populated actorId object
    const notifWithPopulatedActorId = {
      actorId: {
        _id: 'user_123',
        name: 'Ada Lovelace',
        avatar: 'avatars/ada.png',
        role: 'Engineer',
      },
    };
    const actor1 = extractNotificationActor(notifWithPopulatedActorId);
    assert.equal(actor1.name, 'Ada Lovelace');
    assert.equal(actor1.initials, 'AL');
    assert.equal(actor1.role, 'Engineer');

    // 2. Legacy actor object
    const notifWithLegacyActor = {
      actor: {
        name: 'Grace Hopper',
        avatar: 'avatars/grace.jpg',
      },
    };
    const actor2 = extractNotificationActor(notifWithLegacyActor);
    assert.equal(actor2.name, 'Grace Hopper');
    assert.equal(actor2.initials, 'GH');

    // 3. Fallback for system notification with no actor
    const actor3 = extractNotificationActor({ type: 'ANNOUNCEMENT' });
    assert.equal(actor3.name, 'Zeitnah');
    assert.equal(actor3.initials, 'Z');
    assert.equal(actor3.avatarUrl, null);
  });

  it('resolves notification routes correctly with normalization and fallbacks', () => {
    // 1. Legacy network profile route -> canonical /u/:username
    const notifProfile = {
      actionUrl: '/network/profile/johndoe',
    };
    const route1 = resolveNotificationRoute(notifProfile);
    assert.equal(route1.url, '/u/johndoe');
    assert.equal(route1.isExternal, false);
    assert.equal(route1.isNavigable, true);

    // 2. External URL
    const notifExternal = {
      actionUrl: 'https://example.com/resources',
    };
    const route2 = resolveNotificationRoute(notifExternal);
    assert.equal(route2.url, 'https://example.com/resources');
    assert.equal(route2.isExternal, true);
    assert.equal(route2.isNavigable, true);

    // 3. Message notification route synthesis
    const notifMessage = {
      type: 'MESSAGE',
      entityId: 'conv_888',
    };
    const route3 = resolveNotificationRoute(notifMessage);
    assert.equal(route3.url, '/messages?c=conv_888');

    // 4. Missing URL and type fallback
    const route4 = resolveNotificationRoute({});
    assert.equal(route4.url, '/notifications');
    assert.equal(route4.isNavigable, false);
  });

  it('formats relative timestamps accurately', () => {
    const now = Date.now();
    assert.equal(formatNotificationTime(new Date(now - 10 * 1000).toISOString()), 'Just now');
    assert.equal(formatNotificationTime(new Date(now - 5 * 60 * 1000).toISOString()), '5m ago');
    assert.equal(formatNotificationTime(new Date(now - 3 * 3600 * 1000).toISOString()), '3h ago');
    assert.equal(formatNotificationTime('invalid-date'), 'Recently');
    assert.equal(formatNotificationTime(null), 'Recently');
  });

  it('groups notifications into date buckets without losing any record', () => {
    const now = new Date();
    const todayNotif = { _id: '1', createdAt: now.toISOString() };

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayNotif = { _id: '2', createdAt: yesterday.toISOString() };

    const earlier = new Date(now);
    earlier.setDate(earlier.getDate() - 5);
    const earlierNotif = { _id: '3', createdAt: earlier.toISOString() };

    const groups = groupNotificationsByDate([todayNotif, yesterdayNotif, earlierNotif]);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].label, 'Today');
    assert.equal(groups[0].items.length, 1);
    assert.equal(groups[1].label, 'Yesterday');
    assert.equal(groups[1].items.length, 1);
    assert.equal(groups[2].label, 'Earlier');
    assert.equal(groups[2].items.length, 1);
  });

  it('determines visual presentation details, priority badges, and unread states', () => {
    const criticalNotif = {
      title: 'Security Alert',
      priority: 'CRITICAL',
      category: 'security',
      isRead: false,
    };
    const pres1 = getNotificationPresentation(criticalNotif);
    assert.equal(pres1.isCritical, true);
    assert.equal(pres1.priorityBadge, 'Critical');
    assert.equal(pres1.isUnread, true);

    const readNotif = {
      title: 'Course Update',
      priority: 'NORMAL',
      category: 'learning',
      isRead: true,
      readAt: new Date().toISOString(),
    };
    const pres2 = getNotificationPresentation(readNotif);
    assert.equal(pres2.isCritical, false);
    assert.equal(pres2.isUnread, false);
    assert.equal(pres2.categoryLabel, 'Learning');
  });

  it('safely handles malformed notifications without crashing or undefined references', () => {
    // Completely empty notification
    const pres = getNotificationPresentation({});
    assert.equal(pres.title, 'Notification update');
    assert.equal(pres.message, 'You have a new activity update on Zeitnah.');
    assert.equal(pres.categoryLabel, 'System');

    // Unknown category and type
    const presUnknown = getNotificationPresentation({ type: 'UNKNOWN_CUSTOM_TYPE', category: 'alien' });
    assert.equal(presUnknown.categoryLabel, 'System');

    // Route for malformed object
    const route = resolveNotificationRoute(null);
    assert.equal(route.url, '/notifications');
    assert.equal(route.isNavigable, false);

    // Actor for undefined
    const actor = extractNotificationActor(undefined);
    assert.equal(actor.name, 'Zeitnah');
    assert.equal(actor.initials, 'Z');
  });

  it('preserves deterministic pagination and prevents duplicates across page chunks', () => {
    // Page 1
    const page1 = [
      { _id: 'notif_10', createdAt: '2026-10-02T16:00:00Z' },
      { _id: 'notif_09', createdAt: '2026-10-02T15:00:00Z' },
      { _id: 'notif_08', createdAt: '2026-10-02T14:00:00Z' },
    ];

    // Page 2 fetched while new notification arrived at top
    const page2 = [
      { _id: 'notif_08', createdAt: '2026-10-02T14:00:00Z' }, // overlapping boundary
      { _id: 'notif_07', createdAt: '2026-10-02T13:00:00Z' },
      { _id: 'notif_06', createdAt: '2026-10-02T12:00:00Z' },
    ];

    const merged = mergeNotifications(page1, page2);
    assert.equal(merged.length, 5); // not 6
    assert.deepEqual(merged.map((n) => n._id), [
      'notif_10',
      'notif_09',
      'notif_08',
      'notif_07',
      'notif_06',
    ]);
  });
});
