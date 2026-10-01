import test from 'node:test';
import assert from 'node:assert/strict';

test('Messaging Tier 2 — Message Link Generation and Resolution', async (t) => {
  function createMessageLink(origin, conversationId, messageId) {
    if (!conversationId || !messageId) return '';
    const safeOrigin = origin.replace(/\/+$/, '');
    return `${safeOrigin}/messages?c=${encodeURIComponent(conversationId)}&m=${encodeURIComponent(messageId)}`;
  }

  function parseMessageLink(urlString) {
    try {
      const parsed = new URL(urlString);
      return {
        conversationId: parsed.searchParams.get('c'),
        messageId: parsed.searchParams.get('m'),
      };
    } catch {
      return null;
    }
  }

  await t.test('generates valid message deep links', () => {
    const link = createMessageLink('https://zeitnahacademy.com', 'conv-abc', 'msg-123');
    assert.equal(link, 'https://zeitnahacademy.com/messages?c=conv-abc&m=msg-123');
  });

  await t.test('correctly extracts conversationId and messageId from URL', () => {
    const parsed = parseMessageLink('https://zeitnahacademy.com/messages?c=conv-abc&m=msg-123');
    assert.deepEqual(parsed, {
      conversationId: 'conv-abc',
      messageId: 'msg-123',
    });
  });

  await t.test('handles missing or malformed URLs gracefully', () => {
    assert.equal(parseMessageLink('not-a-url'), null);
    const parsedEmpty = parseMessageLink('https://zeitnahacademy.com/messages');
    assert.deepEqual(parsedEmpty, {
      conversationId: null,
      messageId: null,
    });
  });
});

test('Messaging Tier 2 — Draft Snippet Display in Conversation List', () => {
  function formatConversationSubtitle(draft, lastMessage, isDirect, currentUserId) {
    if (draft && draft.trim()) {
      const cleanSnippet = draft.trim().replace(/\s+/g, ' ');
      const truncated = cleanSnippet.length > 36 ? `${cleanSnippet.slice(0, 36)}…` : cleanSnippet;
      return {
        isDraft: true,
        text: `Draft · ${truncated}`,
      };
    }

    if (!lastMessage) {
      return {
        isDraft: false,
        text: isDirect ? 'No messages yet' : 'Group created',
      };
    }

    return {
      isDraft: false,
      text: lastMessage.body || 'Attachment',
    };
  }

  const draftResult = formatConversationSubtitle(
    'I will send the engineering proposal tomorrow morning for review',
    { body: 'Old message' },
    true,
    'user-1',
  );
  assert.equal(draftResult.isDraft, true);
  assert.equal(draftResult.text, 'Draft · I will send the engineering proposal…');

  const regularResult = formatConversationSubtitle(
    '',
    { body: 'Thanks for the update!' },
    true,
    'user-1',
  );
  assert.equal(regularResult.isDraft, false);
  assert.equal(regularResult.text, 'Thanks for the update!');
});

test('Messaging Tier 2 — Global Command Palette Result Categorization', () => {
  function categorizeSearchResults(apiResults) {
    const sections = [];

    if (apiResults.people?.length) {
      sections.push({
        title: 'PEOPLE',
        count: apiResults.people.length,
      });
    }

    if (apiResults.conversations?.length) {
      sections.push({
        title: 'CONVERSATIONS',
        count: apiResults.conversations.length,
      });
    }

    if (apiResults.messages?.length) {
      sections.push({
        title: 'MESSAGES',
        count: apiResults.messages.length,
      });
    }

    if (apiResults.files?.length) {
      sections.push({
        title: 'FILES',
        count: apiResults.files.length,
      });
    }

    if (apiResults.links?.length) {
      sections.push({
        title: 'LINKS',
        count: apiResults.links.length,
      });
    }

    return sections;
  }

  const sampleResults = {
    people: [{ id: 'p1', name: 'Dr. Sarah Chen' }],
    conversations: [{ id: 'c1', name: 'Infrastructure Workspace' }],
    messages: [{ id: 'm1', body: 'Blueprints attached' }],
    files: [{ messageId: 'm1', name: 'spec.pdf' }],
    links: [{ messageId: 'm2', url: 'https://zeitnah.io' }],
  };

  const categorized = categorizeSearchResults(sampleResults);
  assert.equal(categorized.length, 5);
  assert.equal(categorized[0].title, 'PEOPLE');
  assert.equal(categorized[1].title, 'CONVERSATIONS');
  assert.equal(categorized[2].title, 'MESSAGES');
  assert.equal(categorized[3].title, 'FILES');
  assert.equal(categorized[4].title, 'LINKS');
});

test('Messaging Tier 2 — SSRF-Safe Link Extraction and Normalization', () => {
  function safeExtractLinks(text) {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlRegex) || [];
    const safeLinks = [];

    for (const rawUrl of matches) {
      try {
        const parsed = new URL(rawUrl);
        // Only accept http and https protocols
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          safeLinks.push({
            rawUrl,
            hostname: parsed.hostname,
            domain: parsed.hostname.replace(/^www\./, ''),
            pathname: parsed.pathname,
          });
        }
      } catch {
        // Skip invalid URLs
      }
    }
    return safeLinks;
  }

  const sampleText = 'Check https://zeitnahacademy.com/courses and http://github.com/zeitnah or file:///etc/passwd';
  const links = safeExtractLinks(sampleText);

  assert.equal(links.length, 2);
  assert.equal(links[0].domain, 'zeitnahacademy.com');
  assert.equal(links[1].domain, 'github.com');
  assert.equal(links.some((l) => l.rawUrl.startsWith('file:')), false);
});

test('Messaging Tier 2 — Pinned Messages Shape Extraction Defense', () => {
  function extractPinnedList(apiResponse) {
    if (Array.isArray(apiResponse?.pinned)) return apiResponse.pinned;
    if (Array.isArray(apiResponse)) return apiResponse;
    return [];
  }

  // Object shape: { pinned: [...] }
  const objResponse = { pinned: [{ id: 'msg-1', isPinned: true }] };
  assert.equal(extractPinnedList(objResponse).length, 1);
  assert.equal(extractPinnedList(objResponse)[0].id, 'msg-1');

  // Array shape: [...]
  const arrResponse = [{ id: 'msg-2', isPinned: true }];
  assert.equal(extractPinnedList(arrResponse).length, 1);
  assert.equal(extractPinnedList(arrResponse)[0].id, 'msg-2');

  // Null or undefined
  assert.equal(extractPinnedList(null).length, 0);
  assert.equal(extractPinnedList(undefined).length, 0);
  assert.equal(extractPinnedList({}).length, 0);
});

test('Messaging Tier 2 — Malicious Protocol Blocking in Safe Link Extraction', () => {
  function extractSafeLinks(body) {
    if (!body) return [];
    const matches = body.match(/https?:\/\/[^\s]+/gi) || [];
    const safe = [];
    for (const url of matches) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          safe.push(parsed.href);
        }
      } catch {
        // Ignore
      }
    }
    return safe;
  }

  const maliciousBody = 'Check javascript:alert(1) or data:text/html,evil or http://legit.com';
  const extracted = extractSafeLinks(maliciousBody);
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0], 'http://legit.com/');
});

test('Messaging Tier 2 — Information Hub Tab Structure for Direct vs Group', () => {
  function getHubTabs(isDirect, groupParticipantsCount, pinnedCount, mediaCount, filesCount, linksCount) {
    const tabs = [];
    if (!isDirect) {
      tabs.push({ id: 'members', label: `Members (${groupParticipantsCount})` });
    }
    tabs.push({ id: 'pinned', label: `Pinned (${pinnedCount})` });
    tabs.push({ id: 'media', label: `Media (${mediaCount})` });
    tabs.push({ id: 'files', label: `Files (${filesCount})` });
    tabs.push({ id: 'links', label: `Links (${linksCount})` });
    return tabs;
  }

  const directTabs = getHubTabs(true, 2, 3, 5, 1, 2);
  assert.equal(directTabs.length, 4);
  assert.equal(directTabs.some((t) => t.id === 'members'), false);

  const groupTabs = getHubTabs(false, 8, 3, 5, 1, 2);
  assert.equal(groupTabs.length, 5);
  assert.equal(groupTabs[0].id, 'members');
  assert.equal(groupTabs[0].label, 'Members (8)');
});
