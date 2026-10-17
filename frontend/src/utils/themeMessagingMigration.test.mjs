import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Messaging Pages & Views
const MESSAGES_PAGE_PATH = path.resolve(__dirname, '../pages/messages/MessagesPage.jsx');
const MESSAGE_REQUESTS_VIEW_PATH = path.resolve(__dirname, '../components/messages/MessageRequestsView.jsx');
const SAVED_MESSAGES_VIEW_PATH = path.resolve(__dirname, '../components/messages/SavedMessagesView.jsx');

// Messaging Core Components
const CONVERSATION_LIST_PATH = path.resolve(__dirname, '../components/messages/ConversationList.jsx');
const CHAT_AREA_PATH = path.resolve(__dirname, '../components/messages/ChatArea.jsx');
const CONTEXT_PANEL_PATH = path.resolve(__dirname, '../components/messages/ConversationContextPanel.jsx');
const THREAD_PANEL_PATH = path.resolve(__dirname, '../components/messages/ThreadPanel.jsx');
const MENTION_AUTOCOMPLETE_PATH = path.resolve(__dirname, '../components/messages/MentionAutocomplete.jsx');
const COMMAND_PALETTE_PATH = path.resolve(__dirname, '../components/messages/MessagingCommandPalette.jsx');

// Messaging Modals
const NEW_CONVERSATION_MODAL_PATH = path.resolve(__dirname, '../components/messages/NewConversationModal.jsx');
const NEW_GROUP_MODAL_PATH = path.resolve(__dirname, '../components/messages/NewGroupModal.jsx');
const ADD_GROUP_MEMBER_MODAL_PATH = path.resolve(__dirname, '../components/messages/AddGroupMemberModal.jsx');
const EDIT_GROUP_MODAL_PATH = path.resolve(__dirname, '../components/messages/EditGroupModal.jsx');
const CONFIRM_ACTION_MODAL_PATH = path.resolve(__dirname, '../components/messages/ConfirmActionModal.jsx');
const FORWARD_MESSAGE_MODAL_PATH = path.resolve(__dirname, '../components/messages/ForwardMessageModal.jsx');

describe('Zeitnah — Phase 5A: Messaging & Collaboration Theme Migration Unit Tests', () => {
  // ── TEST 1: MessagesPage Layout & Shell ──
  it('1. MessagesPage uses semantic background, card, and typography tokens', () => {
    const content = fs.readFileSync(MESSAGES_PAGE_PATH, 'utf8');

    assert.ok(content.includes('bg-bg-base'), 'MessagesPage canvas must use bg-bg-base');
    assert.ok(content.includes('bg-surface-card'), 'MessagesPage surfaces must use bg-surface-card');
    assert.ok(content.includes('border-border'), 'MessagesPage borders must use border-border');
    assert.ok(content.includes('text-text-primary'), 'MessagesPage typography must use text-text-primary');
    assert.ok(content.includes('min-h-[44px]'), 'MessagesPage interactive buttons must meet 44px touch targets');

    // Ensure no hardcoded dark canvas or borders
    assert.doesNotMatch(content, /bg-\[#070B14\]/, 'MessagesPage must not contain bg-[#070B14]');
    assert.doesNotMatch(content, /bg-\[#0C121E\]/, 'MessagesPage must not contain bg-[#0C121E]');
    assert.doesNotMatch(content, /border-white\/10/, 'MessagesPage must not contain border-white/10');
  });

  // ── TEST 2: ConversationList Component ──
  it('2. ConversationList adopts semantic tokens for header, search, tabs, items, and avatar rings', () => {
    const content = fs.readFileSync(CONVERSATION_LIST_PATH, 'utf8');

    assert.ok(content.includes('bg-surface-card'), 'ConversationList container must use bg-surface-card');
    assert.ok(content.includes('border-border'), 'ConversationList borders must use border-border');
    assert.ok(content.includes('bg-surface-elevated'), 'Search input and tabs must use bg-surface-elevated');
    assert.ok(content.includes('text-text-primary'), 'Primary typography must use text-text-primary');
    assert.ok(content.includes('text-text-secondary'), 'Secondary typography must use text-text-secondary');
    assert.ok(content.includes('text-text-muted'), 'Muted typography must use text-text-muted');
    assert.ok(content.includes('ring-offset-bg-base'), 'Avatar online ring must offset with ring-offset-bg-base');

    // Ensure no hardcoded surface or border classes
    assert.doesNotMatch(content, /bg-\[#070B14\]/, 'ConversationList must not contain bg-[#070B14]');
    assert.doesNotMatch(content, /bg-\[#0C121E\]/, 'ConversationList must not contain bg-[#0C121E]');
    assert.doesNotMatch(content, /border-white\/\[0\.08\]/, 'ConversationList must not contain border-white/[0.08]');
  });

  // ── TEST 3: ChatArea Message Bubbles & Media Lightbox ──
  it('3. ChatArea provides distinct incoming vs outgoing bubbles and preserves media viewer contrast', () => {
    const content = fs.readFileSync(CHAT_AREA_PATH, 'utf8');

    // Root and header
    assert.ok(content.includes('bg-bg-base'), 'ChatArea canvas must use bg-bg-base');
    assert.ok(content.includes('bg-surface-card/95') || content.includes('bg-surface-card'), 'ChatArea header must use bg-surface-card');
    assert.ok(content.includes('border-border'), 'ChatArea borders must use border-border');

    // Outgoing messages: brand mint gradient with high-contrast dark text
    assert.ok(content.includes('from-[#9FD5B2]'), 'Outgoing bubbles must use Zeitnah mint gradient');
    assert.ok(content.includes('text-[#07130E]'), 'Outgoing bubbles must maintain high-contrast text-[#07130E]');

    // Incoming messages: adaptive surface card with primary text
    assert.ok(content.includes('bg-surface-card border border-border text-text-primary'), 'Incoming bubbles must use semantic card tokens');

    // Media viewer lightbox: intentional dark backdrop scrim for viewing images/videos
    assert.ok(content.includes('bg-black/95'), 'Media lightbox must preserve dark scrim bg-black/95');
    assert.ok(content.includes('text-white'), 'Media lightbox controls must preserve text-white over dark scrim');

    // Sticky composer & action bar
    assert.ok(content.includes('bg-surface-card/95') || content.includes('bg-surface-card'), 'Composer container must use surface card');

    // Accessible touch targets
    assert.ok(content.includes('min-h-[44px]'), 'ChatArea interactive controls must meet 44px touch targets');
  });

  // ── TEST 4: ConversationContextPanel Hub & Collapsible Sections ──
  it('4. ConversationContextPanel uses semantic tokens for profile, hub tabs, and accordion sections', () => {
    const content = fs.readFileSync(CONTEXT_PANEL_PATH, 'utf8');

    assert.ok(content.includes('bg-surface-card'), 'Context panel container must use bg-surface-card');
    assert.ok(content.includes('border-border'), 'Context panel borders must use border-border');
    assert.ok(content.includes('bg-surface-elevated'), 'Context panel buttons and active tabs must use bg-surface-elevated');
    assert.ok(content.includes('text-text-primary'), 'Context panel title must use text-text-primary');
    assert.ok(content.includes('text-text-secondary'), 'Context panel subtitle must use text-text-secondary');
    assert.ok(content.includes('text-text-muted'), 'Context panel muted labels must use text-text-muted');

    // Ensure no hardcoded dark canvas
    assert.doesNotMatch(content, /bg-\[#0C121E\]/, 'Context panel must not contain bg-[#0C121E]');
    assert.doesNotMatch(content, /border-white\/10/, 'Context panel must not contain border-white/10');
  });

  // ── TEST 5: ThreadPanel Message Stream & Replies ──
  it('5. ThreadPanel adapts root message, replies, and composer to semantic theme tokens', () => {
    const content = fs.readFileSync(THREAD_PANEL_PATH, 'utf8');

    assert.ok(content.includes('bg-surface-card'), 'ThreadPanel container must use bg-surface-card');
    assert.ok(content.includes('border-border'), 'ThreadPanel borders must use border-border');
    assert.ok(content.includes('bg-surface-elevated'), 'ThreadPanel root message card must use bg-surface-elevated');
    assert.ok(content.includes('from-[#9FD5B2]'), 'ThreadPanel outgoing replies must use mint gradient');
    assert.ok(content.includes('text-[#07130E]'), 'ThreadPanel outgoing replies must use text-[#07130E]');
    assert.ok(content.includes('text-text-primary'), 'ThreadPanel replies must use text-text-primary');

    // Ensure no hardcoded dark canvas
    assert.doesNotMatch(content, /bg-\[#0C121E\]/, 'ThreadPanel must not contain bg-[#0C121E]');
    assert.doesNotMatch(content, /border-white\/10/, 'ThreadPanel must not contain border-white/10');
  });

  // ── TEST 6: MessageRequestsView & SavedMessagesView ──
  it('6. MessageRequestsView and SavedMessagesView adapt containers, request cards, and actions', () => {
    const requestsContent = fs.readFileSync(MESSAGE_REQUESTS_VIEW_PATH, 'utf8');
    const savedContent = fs.readFileSync(SAVED_MESSAGES_VIEW_PATH, 'utf8');

    // MessageRequestsView
    assert.ok(requestsContent.includes('bg-bg-base'), 'MessageRequestsView canvas must use bg-bg-base');
    assert.ok(requestsContent.includes('bg-surface-card'), 'MessageRequestsView cards must use bg-surface-card');
    assert.ok(requestsContent.includes('border-border'), 'MessageRequestsView borders must use border-border');
    assert.ok(requestsContent.includes('text-text-primary'), 'MessageRequestsView text must use text-text-primary');
    assert.ok(requestsContent.includes('min-h-[44px]'), 'MessageRequestsView buttons must have 44px touch targets');
    assert.doesNotMatch(requestsContent, /bg-\[#070B14\]/, 'MessageRequestsView must not contain bg-[#070B14]');

    // SavedMessagesView
    assert.ok(savedContent.includes('bg-surface-card'), 'SavedMessagesView container must use bg-surface-card');
    assert.ok(savedContent.includes('border-border'), 'SavedMessagesView borders must use border-border');
    assert.ok(savedContent.includes('bg-surface-elevated'), 'SavedMessagesView search must use bg-surface-elevated');
    assert.ok(savedContent.includes('text-text-primary'), 'SavedMessagesView text must use text-text-primary');
    assert.doesNotMatch(savedContent, /bg-\[#070B14\]/, 'SavedMessagesView must not contain bg-[#070B14]');
  });

  // ── TEST 7: MessagingCommandPalette ──
  it('7. MessagingCommandPalette uses semantic tokens for dialog, category tabs, and search results', () => {
    const content = fs.readFileSync(COMMAND_PALETTE_PATH, 'utf8');

    assert.ok(content.includes('bg-surface-card/95') || content.includes('bg-surface-card'), 'CommandPalette container must use bg-surface-card');
    assert.ok(content.includes('border-border'), 'CommandPalette borders must use border-border');
    assert.ok(content.includes('bg-surface-elevated'), 'Search input and active items must use bg-surface-elevated');
    assert.ok(content.includes('text-text-primary'), 'CommandPalette primary typography must use text-text-primary');
    assert.ok(content.includes('text-text-muted'), 'CommandPalette muted typography must use text-text-muted');

    // Ensure no hardcoded dark surfaces
    assert.doesNotMatch(content, /bg-\[#0C121E\]/, 'CommandPalette must not contain bg-[#0C121E]');
    assert.doesNotMatch(content, /border-white\/10/, 'CommandPalette must not contain border-white/10');
  });

  // ── TEST 8: Messaging Dialogs and Modals ──
  it('8. All messaging modals use semantic surface-card, border-border, and elevated form controls', () => {
    const modals = [
      { name: 'NewConversationModal', path: NEW_CONVERSATION_MODAL_PATH },
      { name: 'NewGroupModal', path: NEW_GROUP_MODAL_PATH },
      { name: 'AddGroupMemberModal', path: ADD_GROUP_MEMBER_MODAL_PATH },
      { name: 'EditGroupModal', path: EDIT_GROUP_MODAL_PATH },
      { name: 'ConfirmActionModal', path: CONFIRM_ACTION_MODAL_PATH },
      { name: 'ForwardMessageModal', path: FORWARD_MESSAGE_MODAL_PATH },
    ];

    for (const { name, path: modalPath } of modals) {
      const content = fs.readFileSync(modalPath, 'utf8');
      assert.ok(content.includes('bg-surface-card'), `${name} must use bg-surface-card`);
      assert.ok(content.includes('border-border'), `${name} must use border-border`);
      assert.ok(content.includes('text-text-primary'), `${name} must use text-text-primary`);
      assert.ok(content.includes('min-h-[44px]'), `${name} must have accessible 44px touch targets`);
      assert.doesNotMatch(content, /bg-\[#0C121E\]/, `${name} must not contain bg-[#0C121E]`);
      assert.doesNotMatch(content, /border-white\/10/, `${name} must not contain border-white/10`);
    }
  });

  // ── TEST 9: MentionAutocomplete Component ──
  it('9. MentionAutocomplete uses semantic popover surfaces, borders, and touch-accessible items', () => {
    const content = fs.readFileSync(MENTION_AUTOCOMPLETE_PATH, 'utf8');

    assert.ok(content.includes('bg-surface-card'), 'MentionAutocomplete popover must use bg-surface-card');
    assert.ok(content.includes('border-border'), 'MentionAutocomplete borders must use border-border');
    assert.ok(content.includes('bg-surface-elevated'), 'MentionAutocomplete avatar and header must use bg-surface-elevated');
    assert.ok(content.includes('text-text-primary'), 'MentionAutocomplete selected text must use text-text-primary');
    assert.ok(content.includes('bg-brand-mint/15'), 'MentionAutocomplete selected row must use bg-brand-mint/15');
    assert.ok(content.includes('min-h-[44px]'), 'MentionAutocomplete suggestion items must be min-h-[44px]');

    // Ensure hardcoded dark hex is removed
    assert.doesNotMatch(content, /bg-\[#12141c\]/, 'MentionAutocomplete must not contain bg-[#12141c]');
  });
});
