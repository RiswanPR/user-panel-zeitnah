import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getConversationDraft,
  setConversationDraft,
  clearConversationDraft,
  hasConversationDraft,
} from './messagingDrafts.js';

// Mock localStorage for node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

test('Messaging Tier 1 — Draft Isolation & Persistence', async (t) => {
  localStorage.clear();

  await t.test('returns empty string when no draft exists', () => {
    assert.equal(getConversationDraft('conv-123'), '');
    assert.equal(hasConversationDraft('conv-123'), false);
  });

  await t.test('saves draft isolated by conversationId', () => {
    setConversationDraft('conv-1', "I'll send you the updated blueprints tomorrow");
    setConversationDraft('conv-2', 'Let us review the course syllabus');

    assert.equal(getConversationDraft('conv-1'), "I'll send you the updated blueprints tomorrow");
    assert.equal(getConversationDraft('conv-2'), 'Let us review the course syllabus');
    assert.equal(hasConversationDraft('conv-1'), true);
    assert.equal(hasConversationDraft('conv-2'), true);
  });

  await t.test('clearing a draft for one conversation does not leak or clear another', () => {
    clearConversationDraft('conv-1');

    assert.equal(getConversationDraft('conv-1'), '');
    assert.equal(hasConversationDraft('conv-1'), false);
    assert.equal(getConversationDraft('conv-2'), 'Let us review the course syllabus');
    assert.equal(hasConversationDraft('conv-2'), true);
  });

  await t.test('handles empty or blank draft values properly', () => {
    setConversationDraft('conv-3', '   ');
    assert.equal(getConversationDraft('conv-3'), '');
    assert.equal(hasConversationDraft('conv-3'), false);
  });
});

test('Messaging Tier 1 — Authoritative Reactions Enum', () => {
  const ALLOWED_REACTIONS = ['👍', '❤️', '👏', '🎯'];
  assert.equal(ALLOWED_REACTIONS.length, 4);
  assert.deepEqual(ALLOWED_REACTIONS, ['👍', '❤️', '👏', '🎯']);
  assert.equal(ALLOWED_REACTIONS.includes('👍'), true);
  assert.equal(ALLOWED_REACTIONS.includes('❤️'), true);
  assert.equal(ALLOWED_REACTIONS.includes('👏'), true);
  assert.equal(ALLOWED_REACTIONS.includes('🎯'), true);
  assert.equal(ALLOWED_REACTIONS.includes('😂'), false); // Disallowed
});

test('Messaging Tier 1 — Client URL Extraction & Safe Previewing', () => {
  function extractUrlMetadata(text) {
    if (!text) return null;
    const match = text.match(/https?:\/\/[^\s]+/i);
    if (!match) return null;
    try {
      const parsed = new URL(match[0]);
      return {
        rawUrl: match[0],
        hostname: parsed.hostname,
        pathname: parsed.pathname.length > 20 ? `${parsed.pathname.slice(0, 20)}…` : parsed.pathname,
      };
    } catch {
      return null;
    }
  }

  const textWithUrl = 'Please check the design at https://zeitnah.io/courses/infra-101 and review.';
  const res = extractUrlMetadata(textWithUrl);
  assert.notEqual(res, null);
  assert.equal(res.hostname, 'zeitnah.io');
  assert.equal(res.rawUrl, 'https://zeitnah.io/courses/infra-101');

  const textWithoutUrl = 'Let us schedule a call at 3 PM.';
  assert.equal(extractUrlMetadata(textWithoutUrl), null);
});

test('Messaging Tier 1 — Presence State Formatting', () => {
  function formatPresenceStatus(isOnline, lastSeenAt, isTyping = false) {
    if (isTyping) return 'Typing…';
    if (isOnline) return '● Active now';
    if (!lastSeenAt) return 'Offline';

    const diffMs = Date.now() - new Date(lastSeenAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Active just now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    if (diffHours < 24) return `Active today`;
    return 'Offline';
  }

  assert.equal(formatPresenceStatus(false, null, true), 'Typing…');
  assert.equal(formatPresenceStatus(true, null, false), '● Active now');
  assert.equal(formatPresenceStatus(false, null, false), 'Offline');

  const fiveMinsAgo = new Date(Date.now() - 5 * 60000).toISOString();
  assert.equal(formatPresenceStatus(false, fiveMinsAgo, false), 'Active 5m ago');

  const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
  assert.equal(formatPresenceStatus(false, twoHoursAgo, false), 'Active today');
});

test('Messaging Tier 1 — Quick Filters & Unread Matching', () => {
  const conversations = [
    { id: '1', type: 'DIRECT', unreadCount: 3, isArchived: false },
    { id: '2', type: 'DIRECT', unreadCount: 0, isArchived: false },
    { id: '3', type: 'GROUP', unreadCount: 1, isArchived: false },
    { id: '4', type: 'GROUP', unreadCount: 0, isArchived: false },
    { id: '5', type: 'MESSAGE_REQUEST', unreadCount: 2, isArchived: false },
    { id: '6', type: 'DIRECT', unreadCount: 0, isArchived: true },
  ];

  // Filter: unread
  const unreadOnly = conversations.filter((c) => !c.isArchived && c.unreadCount > 0);
  assert.equal(unreadOnly.length, 3);
  assert.deepEqual(unreadOnly.map((c) => c.id), ['1', '3', '5']);

  // Filter: direct
  const directOnly = conversations.filter((c) => !c.isArchived && (c.type === 'DIRECT' || c.type === 'MESSAGE_REQUEST'));
  assert.equal(directOnly.length, 3);
  assert.deepEqual(directOnly.map((c) => c.id), ['1', '2', '5']);

  // Filter: groups
  const groupsOnly = conversations.filter((c) => !c.isArchived && c.type === 'GROUP');
  assert.equal(groupsOnly.length, 2);
  assert.deepEqual(groupsOnly.map((c) => c.id), ['3', '4']);
});
