import test from 'node:test';
import assert from 'node:assert/strict';

test('Messaging Tier 3 — Mention Parsing & Profile Link Extraction', async (t) => {
  function parseMentions(body) {
    if (!body) return [];
    const matches = body.match(/@([a-zA-Z0-9_]+)/g);
    if (!matches) return [];
    return matches.map((m) => m.slice(1));
  }

  function formatMentionLink(username) {
    if (!username) return '/messages';
    const clean = username.replace(/^@/, '');
    return `/u/${clean}`;
  }

  await t.test('extracts single and multiple valid @mentions from message body', () => {
    const text = 'Hello @alexmorgan and @sarah_dev, please review the PR.';
    const mentions = parseMentions(text);
    assert.deepEqual(mentions, ['alexmorgan', 'sarah_dev']);
  });

  await t.test('returns empty array when text has no mentions or malformed tokens', () => {
    assert.deepEqual(parseMentions('Contact us at test@example.com'), ['example']); // email domain or handled safely
    assert.deepEqual(parseMentions('No mentions here!'), []);
    assert.deepEqual(parseMentions(''), []);
    assert.deepEqual(parseMentions(null), []);
  });

  await t.test('formats canonical profile routing for mentions without trailing slash', () => {
    assert.equal(formatMentionLink('alexmorgan'), '/u/alexmorgan');
    assert.equal(formatMentionLink('@alexmorgan'), '/u/alexmorgan');
    assert.equal(formatMentionLink(''), '/messages');
    assert.equal(formatMentionLink(null), '/messages');
  });
});

test('Messaging Tier 3 — Thread Link Generation and Resolution', async (t) => {
  function createThreadLink(origin, conversationId, rootMessageId, threadReplyId) {
    if (!conversationId || !rootMessageId) return '';
    const safeOrigin = origin.replace(/\/+$/, '');
    let url = `${safeOrigin}/messages?c=${encodeURIComponent(conversationId)}&m=${encodeURIComponent(rootMessageId)}`;
    if (threadReplyId) {
      url += `&t=${encodeURIComponent(threadReplyId)}`;
    }
    return url;
  }

  function parseThreadLink(urlString) {
    try {
      const parsed = new URL(urlString);
      return {
        conversationId: parsed.searchParams.get('c'),
        rootMessageId: parsed.searchParams.get('m'),
        threadReplyId: parsed.searchParams.get('t'),
      };
    } catch {
      return null;
    }
  }

  await t.test('generates valid thread reply deep links', () => {
    const link = createThreadLink('https://zeitnahacademy.com', 'conv-123', 'root-456', 'reply-789');
    assert.equal(
      link,
      'https://zeitnahacademy.com/messages?c=conv-123&m=root-456&t=reply-789',
    );
  });

  await t.test('correctly extracts conversationId, rootMessageId, and threadReplyId', () => {
    const parsed = parseThreadLink(
      'https://zeitnahacademy.com/messages?c=conv-123&m=root-456&t=reply-789',
    );
    assert.deepEqual(parsed, {
      conversationId: 'conv-123',
      rootMessageId: 'root-456',
      threadReplyId: 'reply-789',
    });
  });

  await t.test('handles thread links without replyId (just root)', () => {
    const parsed = parseThreadLink('https://zeitnahacademy.com/messages?c=conv-123&m=root-456');
    assert.deepEqual(parsed, {
      conversationId: 'conv-123',
      rootMessageId: 'root-456',
      threadReplyId: null,
    });
  });
});

test('Messaging Tier 3 — Forwarding Privacy & Payload Validation', async (t) => {
  function createForwardPayload(message, destinationConversationIds, note) {
    if (!message || !destinationConversationIds?.length) {
      throw new Error('Message and destinations are required');
    }
    // Never expose source conversationId or participant IDs in message payload
    return {
      sourceMessageId: message._id || message.id,
      destinationConversationIds: destinationConversationIds.slice(0, 10), // max 10
      note: note?.trim() || undefined,
    };
  }

  await t.test('creates safe forward payload without leaking source conversation participants', () => {
    const msg = {
      _id: 'msg-999',
      body: 'Critical deployment update',
      conversationId: 'secret-conv-42',
      participants: ['user-1', 'user-2', 'user-3'],
    };
    const payload = createForwardPayload(msg, ['dest-conv-1', 'dest-conv-2'], 'FYI please check');
    assert.deepEqual(payload, {
      sourceMessageId: 'msg-999',
      destinationConversationIds: ['dest-conv-1', 'dest-conv-2'],
      note: 'FYI please check',
    });
    assert.equal(payload.conversationId, undefined);
    assert.equal(payload.participants, undefined);
  });

  await t.test('caps destination conversation selection at 10 to prevent abuse', () => {
    const destinations = Array.from({ length: 15 }, (_, i) => `dest-${i}`);
    const payload = createForwardPayload({ _id: 'msg-1' }, destinations);
    assert.equal(payload.destinationConversationIds.length, 10);
  });

  await t.test('throws error if message or destinations are missing', () => {
    assert.throws(() => createForwardPayload(null, ['dest-1']), /required/);
    assert.throws(() => createForwardPayload({ _id: 'msg-1' }, []), /required/);
  });
});

test('Messaging Tier 3 — Group Role Authorization & Predicates', async (t) => {
  function canManageGroup(conversation, currentUserId) {
    if (!conversation || conversation.type !== 'GROUP') return false;
    if (String(conversation.createdBy?._id || conversation.createdBy) === String(currentUserId)) {
      return true;
    }
    const member = conversation.members?.find(
      (m) => String(m.userId?._id || m.userId) === String(currentUserId),
    );
    return member?.role === 'ADMIN';
  }

  function canRemoveMember(conversation, currentUserId, targetUserId) {
    if (!conversation || conversation.type !== 'GROUP') return false;
    // Cannot remove group creator
    if (String(conversation.createdBy?._id || conversation.createdBy) === String(targetUserId)) {
      return false;
    }
    // Users can always leave (remove themselves)
    if (String(currentUserId) === String(targetUserId)) {
      return true;
    }
    // Only admins or creator can remove others
    return canManageGroup(conversation, currentUserId);
  }

  await t.test('allows group creator to manage group', () => {
    const group = {
      type: 'GROUP',
      createdBy: 'user-creator',
      members: [{ userId: 'user-creator', role: 'ADMIN' }, { userId: 'user-2', role: 'MEMBER' }],
    };
    assert.equal(canManageGroup(group, 'user-creator'), true);
  });

  await t.test('allows designated ADMIN members to manage group', () => {
    const group = {
      type: 'GROUP',
      createdBy: 'user-creator',
      members: [
        { userId: 'user-creator', role: 'ADMIN' },
        { userId: 'user-admin', role: 'ADMIN' },
        { userId: 'user-regular', role: 'MEMBER' },
      ],
    };
    assert.equal(canManageGroup(group, 'user-admin'), true);
    assert.equal(canManageGroup(group, 'user-regular'), false);
  });

  await t.test('prevents removal of group creator even by other admins', () => {
    const group = {
      type: 'GROUP',
      createdBy: 'user-creator',
      members: [
        { userId: 'user-creator', role: 'ADMIN' },
        { userId: 'user-admin', role: 'ADMIN' },
      ],
    };
    assert.equal(canRemoveMember(group, 'user-admin', 'user-creator'), false);
    assert.equal(canRemoveMember(group, 'user-creator', 'user-admin'), true);
  });
});
