/**
 * ZEITNAH MESSAGING DRAFT PERSISTENCE
 * Manages conversation-specific drafts isolated by conversation ID.
 * Persists across conversation switches and page refresh.
 * Automatically cleared when a message is sent.
 */

const DRAFT_PREFIX = 'zeitnah_msg_draft_';

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function getConversationDraft(conversationId) {
  if (!conversationId) return '';
  const storage = getStorage();
  if (!storage) return '';
  try {
    return storage.getItem(`${DRAFT_PREFIX}${conversationId}`) || '';
  } catch {
    return '';
  }
}

export function setConversationDraft(conversationId, text) {
  if (!conversationId) return;
  const storage = getStorage();
  if (!storage) return;
  try {
    if (!text || !text.trim()) {
      storage.removeItem(`${DRAFT_PREFIX}${conversationId}`);
    } else {
      storage.setItem(`${DRAFT_PREFIX}${conversationId}`, text);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('zeitnah-draft-updated', {
          detail: { conversationId, text: text || '' },
        }),
      );
    }
  } catch {
    // Gracefully handle storage quota or private browsing limits
  }
}

export function clearConversationDraft(conversationId) {
  if (!conversationId) return;
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${DRAFT_PREFIX}${conversationId}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('zeitnah-draft-updated', {
          detail: { conversationId, text: '' },
        }),
      );
    }
  } catch {
    // Ignore
  }
}

export function hasConversationDraft(conversationId) {
  const draft = getConversationDraft(conversationId);
  return Boolean(draft && draft.trim().length > 0);
}
