import test from 'node:test';
import assert from 'node:assert/strict';

test('Messaging Mobile Overhaul — Navigation State & Bottom Nav Suppression', async (t) => {
  function shouldSuppressBottomNav(pathname, search) {
    if (!pathname.startsWith('/messages')) return false;
    const searchParams = new URLSearchParams(search);
    const hasConversationParam = Boolean(searchParams.get('c'));
    const isDirectPath = pathname.replace(/\/+$/, '').length > '/messages'.length;
    return hasConversationParam || isDirectPath;
  }

  await t.test('keeps bottom nav visible on mobile inbox root /messages', () => {
    assert.equal(shouldSuppressBottomNav('/messages', ''), false);
    assert.equal(shouldSuppressBottomNav('/messages/', ''), false);
  });

  await t.test('suppresses bottom nav when inside active conversation via query param', () => {
    assert.equal(shouldSuppressBottomNav('/messages', '?c=conv_abc123'), true);
    assert.equal(shouldSuppressBottomNav('/messages', '?c=64f123456789abcdef012345&m=msg_99'), true);
  });

  await t.test('suppresses bottom nav when inside active conversation via pathname', () => {
    assert.equal(shouldSuppressBottomNav('/messages/conv_abc123', ''), true);
  });

  await t.test('does not suppress bottom nav on unrelated routes', () => {
    assert.equal(shouldSuppressBottomNav('/network', ''), false);
    assert.equal(shouldSuppressBottomNav('/courses', ''), false);
    assert.equal(shouldSuppressBottomNav('/jobs', ''), false);
  });
});

test('Messaging Mobile Overhaul — Short Message Density & Grouping Logic', async (t) => {
  function isShortMessage(msg) {
    if (!msg || !msg.body) return false;
    if (msg.replyTo) return false;
    if (msg.attachments && msg.attachments.length > 0) return false;
    if (msg.body.includes('\n')) return false;
    if (msg.body.length > 35) return false;
    if (/https?:\/\/[^\s]+/i.test(msg.body)) return false;
    return true;
  }

  await t.test('identifies short single-word messages as compact', () => {
    assert.equal(isShortMessage({ body: 'k' }), true);
    assert.equal(isShortMessage({ body: 'ok' }), true);
    assert.equal(isShortMessage({ body: 'hi' }), true);
    assert.equal(isShortMessage({ body: 'Sounds good!' }), true);
    assert.equal(isShortMessage({ body: '👍' }), true);
  });

  await t.test('does not classify long messages as compact', () => {
    const longMsg = 'This is a longer message that explains the architectural details of the system.';
    assert.equal(isShortMessage({ body: longMsg }), false);
  });

  await t.test('does not classify multiline or attachment messages as compact', () => {
    assert.equal(isShortMessage({ body: 'Hello\nWorld' }), false);
    assert.equal(isShortMessage({ body: 'Look here', attachments: [{ url: 'test.jpg' }] }), false);
    assert.equal(isShortMessage({ body: 'See https://example.com' }), false);
    assert.equal(isShortMessage({ body: 'Ok', replyTo: { id: 'root1' } }), false);
  });

  function getGroupingClasses(isMe, isNextSameSender, isPrevSameSender) {
    if (isMe) {
      return `${!isPrevSameSender ? 'rounded-tr-2xl' : 'rounded-tr-sm'} ${
        !isNextSameSender ? 'rounded-br-2xl' : 'rounded-br-sm'
      } rounded-l-2xl`;
    }
    return `${!isPrevSameSender ? 'rounded-tl-2xl' : 'rounded-tl-sm'} ${
      !isNextSameSender ? 'rounded-bl-2xl' : 'rounded-bl-sm'
    } rounded-r-2xl`;
  }

  await t.test('applies connected corner radii for grouped consecutive messages', () => {
    // Middle message of a sequence sent by me
    const midMe = getGroupingClasses(true, true, true);
    assert.ok(midMe.includes('rounded-tr-sm'));
    assert.ok(midMe.includes('rounded-br-sm'));

    // First message of a sequence sent by me
    const firstMe = getGroupingClasses(true, true, false);
    assert.ok(firstMe.includes('rounded-tr-2xl'));
    assert.ok(firstMe.includes('rounded-br-sm'));

    // Last message of a sequence sent by me
    const lastMe = getGroupingClasses(true, false, true);
    assert.ok(lastMe.includes('rounded-tr-sm'));
    assert.ok(lastMe.includes('rounded-br-2xl'));

    // Standalone message sent by peer
    const standalonePeer = getGroupingClasses(false, false, false);
    assert.ok(standalonePeer.includes('rounded-tl-2xl'));
    assert.ok(standalonePeer.includes('rounded-bl-2xl'));
  });
});

test('Messaging Mobile Overhaul — Touch Gestures & Scroll-Safe Long Press', async (t) => {
  const LONG_PRESS_MS = 420;
  const SCROLL_CANCEL_DIST_PX = 10;

  function shouldCancelLongPress(startX, startY, currentX, currentY) {
    const diffX = Math.abs(currentX - startX);
    const diffY = Math.abs(currentY - startY);
    return diffX > SCROLL_CANCEL_DIST_PX || diffY > SCROLL_CANCEL_DIST_PX;
  }

  await t.test('cancels long press if user scrolls vertically more than 10px', () => {
    assert.equal(shouldCancelLongPress(100, 200, 100, 215), true); // 15px scroll down
    assert.equal(shouldCancelLongPress(100, 200, 100, 185), true); // 15px scroll up
  });

  await t.test('maintains long press if movement is below 10px threshold (natural thumb jitter)', () => {
    assert.equal(shouldCancelLongPress(100, 200, 102, 204), false); // 2px X, 4px Y
    assert.equal(shouldCancelLongPress(100, 200, 100, 200), false); // 0px
  });

  await t.test('long press duration is strictly within ergonomic 400-500ms range', () => {
    assert.ok(LONG_PRESS_MS >= 400 && LONG_PRESS_MS <= 500);
  });
});

test('Messaging Mobile Overhaul — Reaction Set & Local Toggle Reconcile', async (t) => {
  const AUTHORITATIVE_REACTIONS = ['👍', '❤️', '👏', '🎯'];

  function toggleLocalReaction(reactions, currentUserId, emoji) {
    if (!AUTHORITATIVE_REACTIONS.includes(emoji)) {
      throw new Error(`Unsupported emoji: ${emoji}`);
    }
    const existingIndex = reactions.findIndex((r) => r.emoji === emoji);
    if (existingIndex === -1) {
      return [...reactions, { emoji, count: 1, users: [currentUserId] }];
    }
    const reaction = reactions[existingIndex];
    const userIndex = reaction.users.indexOf(currentUserId);
    if (userIndex > -1) {
      // Remove reaction
      if (reaction.count <= 1) {
        return reactions.filter((_, idx) => idx !== existingIndex);
      }
      return reactions.map((r, idx) =>
        idx === existingIndex
          ? {
              ...r,
              count: r.count - 1,
              users: r.users.filter((u) => u !== currentUserId),
            }
          : r,
      );
    } else {
      // Add reaction
      return reactions.map((r, idx) =>
        idx === existingIndex
          ? {
              ...r,
              count: r.count + 1,
              users: [...r.users, currentUserId],
            }
          : r,
      );
    }
  }

  await t.test('verifies exact authoritative reaction set without unsupported emojis', () => {
    assert.deepEqual(AUTHORITATIVE_REACTIONS, ['👍', '❤️', '👏', '🎯']);
    assert.throws(() => toggleLocalReaction([], 'user_1', '😂'), /Unsupported emoji/);
  });

  await t.test('adds, updates, and removes user reaction cleanly', () => {
    let reactions = [];
    reactions = toggleLocalReaction(reactions, 'user_1', '👍');
    assert.equal(reactions.length, 1);
    assert.equal(reactions[0].count, 1);
    assert.deepEqual(reactions[0].users, ['user_1']);

    // Another user reacts
    reactions = toggleLocalReaction(reactions, 'user_2', '👍');
    assert.equal(reactions[0].count, 2);

    // First user removes reaction
    reactions = toggleLocalReaction(reactions, 'user_1', '👍');
    assert.equal(reactions[0].count, 1);
    assert.deepEqual(reactions[0].users, ['user_2']);

    // Second user removes reaction -> removed from list
    reactions = toggleLocalReaction(reactions, 'user_2', '👍');
    assert.equal(reactions.length, 0);
  });
});

test('Messaging Mobile Overhaul — Microcopy Sanitization', async (t) => {
  function sanitizePlaceholder(placeholder, isMobile) {
    if (isMobile) {
      // Strip any desktop keyboard shortcut microcopy
      return placeholder
        .replace(/\(Shift\+Enter for newline\)/gi, '')
        .replace(/\(Enter\)/gi, '')
        .trim();
    }
    return placeholder;
  }

  await t.test('removes desktop microcopy on mobile views', () => {
    const raw = 'Write a message... (Shift+Enter for newline)';
    assert.equal(sanitizePlaceholder(raw, true), 'Write a message...');

    const threadRaw = 'Reply to thread… (Enter)';
    assert.equal(sanitizePlaceholder(threadRaw, true), 'Reply to thread…');
  });

  await t.test('keyboard Enter key handler respects mobile vs desktop', () => {
    function handleEnterKey(isMobile, shiftKey) {
      if (isMobile) {
        // Mobile keyboards Enter inserts newline
        return 'insert_newline';
      }
      if (!shiftKey) {
        return 'submit_message';
      }
      return 'insert_newline';
    }

    assert.equal(handleEnterKey(true, false), 'insert_newline');
    assert.equal(handleEnterKey(true, true), 'insert_newline');
    assert.equal(handleEnterKey(false, false), 'submit_message');
    assert.equal(handleEnterKey(false, true), 'insert_newline');
  });
});

test('Messaging Signature Social — Pure Emoji Message Detection', async (t) => {
  function isPureEmojiMessage(text) {
    if (!text) return false;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 12) return false;
    const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d|\ufe0f){1,3}$/u;
    return emojiRegex.test(trimmed);
  }

  await t.test('detects single emoji messages', () => {
    assert.equal(isPureEmojiMessage('👍'), true);
    assert.equal(isPureEmojiMessage('❤️'), true);
    assert.equal(isPureEmojiMessage('🔥'), true);
    assert.equal(isPureEmojiMessage('🎉'), true);
  });

  await t.test('detects 2 and 3 emoji messages', () => {
    assert.equal(isPureEmojiMessage('👍👍'), true);
    assert.equal(isPureEmojiMessage('🔥🚀💡'), true);
  });

  await t.test('rejects messages with text or more than 3 emojis', () => {
    assert.equal(isPureEmojiMessage('Great! 👍'), false);
    assert.equal(isPureEmojiMessage('hello world'), false);
    assert.equal(isPureEmojiMessage('👍👍👍👍'), false);
    assert.equal(isPureEmojiMessage(''), false);
  });
});

test('Messaging Signature Social — Double-Tap Reaction & Long-Press Model', async (t) => {
  function evaluateTapAction(lastTapTime, lastTapMsgId, currentTapTime, currentMsgId) {
    const isDoubleTap =
      lastTapMsgId === currentMsgId &&
      currentTapTime - lastTapTime < 320;

    if (isDoubleTap) {
      return { action: 'QUICK_REACTION_HEART', emoji: '❤️' };
    }
    return { action: 'START_LONG_PRESS_TIMER', durationMs: 420 };
  }

  await t.test('triggers quick heart reaction on fast double tap (<320ms)', () => {
    const res = evaluateTapAction(1000, 'msg_1', 1200, 'msg_1');
    assert.equal(res.action, 'QUICK_REACTION_HEART');
    assert.equal(res.emoji, '❤️');
  });

  await t.test('initiates long press timer on single or separated taps', () => {
    const res = evaluateTapAction(1000, 'msg_1', 1500, 'msg_1'); // 500ms apart
    assert.equal(res.action, 'START_LONG_PRESS_TIMER');
    assert.equal(res.durationMs, 420);
  });

  await t.test('initiates long press timer when tapping different messages in rapid succession', () => {
    const res = evaluateTapAction(1000, 'msg_1', 1100, 'msg_2'); // different message
    assert.equal(res.action, 'START_LONG_PRESS_TIMER');
  });
});

test('Messaging Signature Social — Multi-Image Grid Presentation Layouts', async (t) => {
  function getImageGridLayout(imageCount) {
    if (imageCount <= 0) return null;
    if (imageCount === 1) return { layout: 'SINGLE_FULL_ASPECT', maxCols: 1, hasOverflowCount: false };
    if (imageCount === 2) return { layout: 'TWO_COL_EQUAL', maxCols: 2, hasOverflowCount: false };
    if (imageCount === 3) return { layout: 'THREE_COL_EQUAL', maxCols: 3, hasOverflowCount: false };
    return {
      layout: 'TWO_BY_TWO_GRID',
      maxCols: 2,
      hasOverflowCount: imageCount > 4,
      overflowNumber: imageCount > 4 ? imageCount - 3 : 0,
    };
  }

  await t.test('resolves correct visual grid layout based on attachment count', () => {
    assert.equal(getImageGridLayout(1).layout, 'SINGLE_FULL_ASPECT');
    assert.equal(getImageGridLayout(2).layout, 'TWO_COL_EQUAL');
    assert.equal(getImageGridLayout(3).layout, 'THREE_COL_EQUAL');
    assert.equal(getImageGridLayout(4).layout, 'TWO_BY_TWO_GRID');
    assert.equal(getImageGridLayout(4).hasOverflowCount, false);

    const sixImages = getImageGridLayout(6);
    assert.equal(sixImages.layout, 'TWO_BY_TWO_GRID');
    assert.equal(sixImages.hasOverflowCount, true);
    assert.equal(sixImages.overflowNumber, 3); // +3 overlay on 4th tile
  });
});
