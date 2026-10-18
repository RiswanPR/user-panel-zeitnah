import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Messaging paths
const MESSAGES_PAGE_PATH = path.resolve(__dirname, '../pages/messages/MessagesPage.jsx');
const CONVERSATION_LIST_PATH = path.resolve(__dirname, '../components/messages/ConversationList.jsx');
const CHAT_AREA_PATH = path.resolve(__dirname, '../components/messages/ChatArea.jsx');
const THREAD_PANEL_PATH = path.resolve(__dirname, '../components/messages/ThreadPanel.jsx');
const MESSAGE_REQUESTS_PATH = path.resolve(__dirname, '../components/messages/MessageRequestsView.jsx');
const NEW_GROUP_MODAL_PATH = path.resolve(__dirname, '../components/messages/NewGroupModal.jsx');
const EDIT_GROUP_MODAL_PATH = path.resolve(__dirname, '../components/messages/EditGroupModal.jsx');
const FORWARD_MODAL_PATH = path.resolve(__dirname, '../components/messages/ForwardMessageModal.jsx');
const ADD_MEMBER_MODAL_PATH = path.resolve(__dirname, '../components/messages/AddGroupMemberModal.jsx');

// Notifications paths
const NOTIFICATIONS_PAGE_PATH = path.resolve(__dirname, '../pages/notifications/NotificationsPage.jsx');
const NOTIFICATION_CENTER_PAGE_PATH = path.resolve(__dirname, '../pages/notifications/NotificationCenterPage.jsx');
const NOTIFICATION_ITEM_PATH = path.resolve(__dirname, '../components/notifications/NotificationItem.jsx');

// Community paths
const COMMUNITY_HOME_PATH = path.resolve(__dirname, '../pages/community/CommunityHome.jsx');
const FEED_FILTER_TABS_PATH = path.resolve(__dirname, '../components/community/feed/FeedFilterTabs.jsx');
const POST_ACTIONS_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/PostActions.jsx');
const POST_HEADER_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/PostHeader.jsx');
const POST_CONTENT_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/PostContent.jsx');
const REACTION_BAR_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/ReactionBar.jsx');
const POST_CARD_INDEX_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/index.jsx');
const CREATE_POST_MODAL_PATH = path.resolve(__dirname, '../components/community/composer/CreatePostModal.jsx');
const COMPOSER_COLLAPSED_PATH = path.resolve(__dirname, '../components/community/composer/ComposerCollapsed.jsx');
const COMPOSER_EXPANDED_PATH = path.resolve(__dirname, '../components/community/composer/ComposerExpanded.jsx');
const COMMENT_INPUT_PATH = path.resolve(__dirname, '../components/community/comments/CommentInput.jsx');
const PEOPLE_CARD_PATH = path.resolve(__dirname, '../components/community/discovery/PeopleCard.jsx');
const TRENDING_TOPICS_PATH = path.resolve(__dirname, '../components/community/discovery/TrendingTopics.jsx');
const COMPANY_FEED_HEADER_PATH = path.resolve(__dirname, '../components/community/header/CompanyFeedHeader.jsx');
const QUOTE_POST_MODAL_PATH = path.resolve(__dirname, '../components/community/reposts/QuotePostModal.jsx');
const COMMUNITY_SEARCH_MODAL_PATH = path.resolve(__dirname, '../components/community/discovery/CommunitySearchModal.jsx');
const INDEX_CSS_PATH = path.resolve(__dirname, '../index.css');

describe('Zeitnah — Phase 10C: Community, Messaging & Notifications Polish Regression Tests', () => {
  describe('1. Messaging Surface Refinement & Light Mode CTA Contrast', () => {
    it('verifies MessagesPage primary CTA uses zn-btn-primary (eliminating bg-brand-mint text-bg-base)', () => {
      const content = fs.readFileSync(MESSAGES_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('zn-btn-primary min-h-[44px] text-xs px-5 py-2.5'), 'Start Direct Message CTA must use zn-btn-primary');
      assert.ok(!content.includes('bg-brand-mint text-bg-base'), 'Must not contain low-contrast bg-brand-mint text-bg-base');
    });

    it('verifies ConversationList unread badges use high-contrast text-brand-navy and CTA uses zn-btn-primary', () => {
      const content = fs.readFileSync(CONVERSATION_LIST_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-mint text-brand-navy'), 'Unread badge counters must use text-brand-navy on mint');
      assert.ok(content.includes('zn-btn-primary mt-4 min-h-[40px] text-xs'), 'Empty state CTA must use zn-btn-primary');
      assert.ok(!content.includes('bg-brand-mint text-bg-base'), 'Must not contain low-contrast bg-brand-mint text-bg-base');
    });

    it('verifies MessageRequestsView action buttons use standardized primary and secondary buttons', () => {
      const content = fs.readFileSync(MESSAGE_REQUESTS_PATH, 'utf-8');
      assert.ok(content.includes('zn-btn-primary min-h-[44px] text-xs gap-1.5'), 'Accept button must use zn-btn-primary');
      assert.ok(content.includes('zn-btn-secondary min-h-[44px] text-xs gap-1.5'), 'Decline button must use zn-btn-secondary');
      assert.ok(!content.includes('bg-brand-mint text-bg-base'), 'Must not contain low-contrast bg-brand-mint text-bg-base');
    });

    it('verifies all messaging modals use zn-btn-primary for submit and zn-btn-secondary for cancel', () => {
      const newGroup = fs.readFileSync(NEW_GROUP_MODAL_PATH, 'utf-8');
      const editGroup = fs.readFileSync(EDIT_GROUP_MODAL_PATH, 'utf-8');
      const forwardModal = fs.readFileSync(FORWARD_MODAL_PATH, 'utf-8');
      const addMember = fs.readFileSync(ADD_MEMBER_MODAL_PATH, 'utf-8');

      assert.ok(newGroup.includes('zn-btn-primary min-h-[44px] text-xs px-5 py-2'), 'NewGroupModal must use zn-btn-primary');
      assert.ok(newGroup.includes('zn-btn-secondary min-h-[44px] text-xs px-4 py-2'), 'NewGroupModal must use zn-btn-secondary');
      assert.ok(editGroup.includes('zn-btn-primary min-h-[44px] px-4 py-2 text-xs'), 'EditGroupModal must use zn-btn-primary');
      assert.ok(forwardModal.includes('zn-btn-primary min-h-[44px] px-4 py-2 text-xs'), 'ForwardMessageModal must use zn-btn-primary');
      assert.ok(addMember.includes('zn-btn-primary min-h-[44px] px-4 py-2 text-xs'), 'AddGroupMemberModal must use zn-btn-primary');

      // None should use bg-brand-mint text-bg-base
      assert.ok(!newGroup.includes('bg-brand-mint text-bg-base'));
      assert.ok(!editGroup.includes('bg-brand-mint text-bg-base'));
      assert.ok(!forwardModal.includes('bg-brand-mint text-bg-base'));
      assert.ok(!addMember.includes('bg-brand-mint text-bg-base'));
    });

    it('verifies ChatArea message mention links and focused action buttons are high contrast', () => {
      const content = fs.readFileSync(CHAT_AREA_PATH, 'utf-8');
      assert.ok(content.includes('text-brand-navy dark:text-brand-mint'), 'Mention links must have high contrast');
      assert.ok(content.includes('zn-btn-primary min-h-[44px] flex items-center justify-center gap-2 text-xs'), 'Focused reply button must use zn-btn-primary');
      assert.ok(content.includes('zn-btn-secondary min-h-[44px] flex items-center justify-center gap-2 text-xs'), 'Focused copy button must use zn-btn-secondary');
    });

    it('verifies ThreadPanel send reply button uses zn-btn-primary with 44px touch target', () => {
      const content = fs.readFileSync(THREAD_PANEL_PATH, 'utf-8');
      assert.ok(content.includes('zn-btn-primary min-h-[44px] min-w-[44px]'), 'Thread reply send button must use zn-btn-primary with 44px min dimension');
      assert.ok(!content.includes('bg-brand-mint text-bg-base'), 'Must not contain low-contrast bg-brand-mint text-bg-base');
    });
  });

  describe('2. Notifications Surface Polish & Max-Width 896px Container', () => {
    it('verifies NotificationsPage uses centered max-width 896px container (max-w-4xl)', () => {
      const content = fs.readFileSync(NOTIFICATIONS_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'), 'Must use max-w-4xl (896px) centered container with responsive side padding');
    });

    it('verifies NotificationCenterPage uses centered max-width 896px container (max-w-4xl)', () => {
      const content = fs.readFileSync(NOTIFICATION_CENTER_PAGE_PATH, 'utf-8');
      assert.ok(content.includes('max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'), 'Must use max-w-4xl (896px) centered container');
      assert.ok(!content.includes('max-w-5xl'), 'Must not exceed max-w-4xl (896px)');
    });

    it('verifies notification category tabs use high contrast active pills and muted inactives', () => {
      const page = fs.readFileSync(NOTIFICATIONS_PAGE_PATH, 'utf-8');
      const center = fs.readFileSync(NOTIFICATION_CENTER_PAGE_PATH, 'utf-8');

      assert.ok(page.includes('bg-brand-navy text-white dark:bg-brand-mint dark:text-brand-navy font-bold shadow-sm'), 'Active tab must be dark navy in Light Mode');
      assert.ok(center.includes('bg-brand-navy text-white dark:bg-brand-mint dark:text-brand-navy font-bold shadow-sm'), 'Active tab must be dark navy in Light Mode');
    });

    it('verifies NotificationItem defines clear unread visual indicators and WCAG compliant category icon colors', () => {
      const content = fs.readFileSync(NOTIFICATION_ITEM_PATH, 'utf-8');
      assert.ok(content.includes('bg-brand-navy dark:bg-brand-mint'), 'Unread indicator bar must use deep navy in light mode');
      assert.ok(content.includes('text-amber-700 dark:text-amber-400'), 'Priority icons must use WCAG compliant amber-700');
      assert.ok(content.includes('text-brand-navy dark:text-brand-mint'), 'Default and details link must use high contrast brand navy');
      assert.ok(content.includes('text-text-secondary whitespace-nowrap font-medium'), 'Timestamps must be readable secondary text');
    });
  });

  describe('3. Community Surface Polish, Visibility & Action Controls', () => {
    it('verifies PostActions uses touch-accessible action controls with high-contrast text-text-secondary', () => {
      const content = fs.readFileSync(POST_ACTIONS_PATH, 'utf-8');
      assert.ok(content.includes('min-h-[44px]'), 'Action buttons must meet min 44px touch targets');
      assert.ok(content.includes('text-text-secondary hover:text-text-primary hover:bg-surface-elevated'), 'Action buttons must use text-text-secondary');
      assert.ok(content.includes('text-brand-navy dark:text-brand-mint bg-brand-mint/15 dark:bg-brand-mint/10'), 'Active comment and repost states must have strong contrast');
    });

    it('verifies PostHeader and PostContent maintain crisp contrast for author details, tags, and links', () => {
      const header = fs.readFileSync(POST_HEADER_PATH, 'utf-8');
      const postContent = fs.readFileSync(POST_CONTENT_PATH, 'utf-8');

      assert.ok(header.includes('text-text-secondary'), 'Author metadata and username must use readable text-secondary');
      assert.ok(header.includes('bg-brand-mint/15 text-brand-navy dark:text-brand-mint'), 'Answered badge must use brand navy in Light Mode');
      assert.ok(header.includes('border-brand-mint/20'), 'Answered badge must have mint border');
      assert.ok(postContent.includes('text-brand-navy dark:text-brand-mint font-semibold hover:underline'), 'Post content links must use high contrast brand navy');
      assert.ok(postContent.includes('text-brand-navy dark:text-brand-mint font-semibold'), 'Hashtag pills must use brand navy in Light Mode');
    });

    it('verifies ReactionBar trigger button uses text-text-secondary and touch-accessible sizing', () => {
      const content = fs.readFileSync(REACTION_BAR_PATH, 'utf-8');
      assert.ok(content.includes('min-h-[44px]'), 'Reaction button must have 44px min height');
      assert.ok(content.includes('text-text-secondary hover:text-text-primary hover:bg-surface-elevated'), 'Reaction button must use text-text-secondary');
    });

    it('verifies FeedFilterTabs icons and active indicators are sharp in Light and Dark mode', () => {
      const content = fs.readFileSync(FEED_FILTER_TABS_PATH, 'utf-8');
      assert.ok(content.includes('text-brand-navy dark:text-brand-mint'), 'Active feed tab icon must use text-brand-navy in Light Mode');
      assert.ok(content.includes('text-text-muted'), 'Inactive tab icon must use text-text-muted');
    });

    it('verifies CommunityHome infinite scroll Try again button uses zn-btn-primary', () => {
      const content = fs.readFileSync(COMMUNITY_HOME_PATH, 'utf-8');
      assert.ok(content.includes('zn-btn-primary min-h-[44px] min-w-[44px] px-4 py-2 font-semibold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5'), 'Try again button must use zn-btn-primary');
    });

    it('verifies CreatePostModal buttons, tabs, links, and draft controls use high contrast tokens', () => {
      const content = fs.readFileSync(CREATE_POST_MODAL_PATH, 'utf-8');
      assert.ok(content.includes('community-btn-create'), 'Publish buttons must use community-btn-create');
      assert.ok(content.includes('bg-brand-navy text-white dark:bg-brand-mint dark:text-brand-navy font-semibold shadow-sm'), 'Edit vs Preview tabs must use navy/white in Light Mode');
      assert.ok(content.includes('text-brand-navy dark:text-brand-mint hover:underline cursor-pointer'), 'Draft banner resume link must use brand-navy');
      assert.ok(content.includes('zn-btn-primary min-h-[44px] px-4 py-2 text-xs font-bold'), 'Upload retry button must use zn-btn-primary');
      assert.ok(content.includes('w-full min-h-[44px] py-2.5 rounded-xl zn-btn-primary font-bold text-xs inline-flex items-center justify-center cursor-pointer'), 'Save as draft button must use zn-btn-primary');
      assert.ok(!content.includes('bg-gradient-to-r from-brand-mint to-brand-yellow text-bg-base'), 'Must eliminate low contrast text-bg-base gradient');
    });

    it('verifies index.css defines light mode override for .community-btn-create and .community-shimmer-btn', () => {
      const content = fs.readFileSync(INDEX_CSS_PATH, 'utf-8');
      assert.ok(content.includes('[data-theme="light"] .community-btn-create'), 'index.css must provide light mode override for .community-btn-create');
      assert.ok(content.includes('background: var(--zn-token-primary)'), '.community-btn-create in light mode must use deep navy primary token');
      assert.ok(content.includes('color: #FFFFFF'), '.community-btn-create in light mode must use white text');
      assert.ok(content.includes('[data-theme="light"] .community-shimmer-btn'), 'index.css must provide light mode override for .community-shimmer-btn');
    });

    it('verifies comments, quotes, and composer submit buttons use zn-btn-primary', () => {
      const commentInput = fs.readFileSync(COMMENT_INPUT_PATH, 'utf-8');
      const postCardIndex = fs.readFileSync(POST_CARD_INDEX_PATH, 'utf-8');
      const composerCollapsed = fs.readFileSync(COMPOSER_COLLAPSED_PATH, 'utf-8');
      const composerExpanded = fs.readFileSync(COMPOSER_EXPANDED_PATH, 'utf-8');
      const quoteModal = fs.readFileSync(QUOTE_POST_MODAL_PATH, 'utf-8');
      const companyHeader = fs.readFileSync(COMPANY_FEED_HEADER_PATH, 'utf-8');

      assert.ok(commentInput.includes('zn-btn-primary min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl text-xs'), 'CommentInput submit button must use zn-btn-primary');
      assert.ok(postCardIndex.includes('zn-btn-primary min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs'), 'PostCard inline comment submit button must use zn-btn-primary');
      assert.ok(composerCollapsed.includes('zn-btn-primary min-h-[44px] px-4 py-2 rounded-xl text-xs'), 'ComposerCollapsed Post button must use zn-btn-primary');
      assert.ok(composerExpanded.includes('zn-btn-primary min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold'), 'ComposerExpanded Post button must use zn-btn-primary');
      assert.ok(quoteModal.includes('zn-btn-primary min-h-[44px] px-5 py-2 rounded-xl font-semibold text-xs'), 'Quote submit button must use zn-btn-primary');
      assert.ok(companyHeader.includes('zn-btn-primary min-h-[44px] px-3.5 py-1.5 rounded-xl font-semibold text-xs'), 'Company feed header create button must use zn-btn-primary');
    });

    it('verifies PeopleCard and TrendingTopics active items and CTAs meet high contrast rules', () => {
      const peopleCard = fs.readFileSync(PEOPLE_CARD_PATH, 'utf-8');
      const trendingTopics = fs.readFileSync(TRENDING_TOPICS_PATH, 'utf-8');
      const searchModal = fs.readFileSync(COMMUNITY_SEARCH_MODAL_PATH, 'utf-8');

      assert.ok(peopleCard.includes('zn-btn-primary hover:opacity-95 active:scale-[0.97]'), 'Connect button must use zn-btn-primary');
      assert.ok(peopleCard.includes('text-brand-navy dark:text-brand-mint text-xs font-semibold flex items-center gap-1'), 'Connected pill must use text-brand-navy in Light Mode');
      assert.ok(trendingTopics.includes('bg-brand-navy text-white dark:bg-gradient-to-r dark:from-brand-mint dark:to-brand-yellow dark:text-brand-navy'), 'Selected trending topic must use deep navy in Light Mode');
      assert.ok(searchModal.includes('bg-brand-navy text-white dark:bg-brand-mint dark:text-brand-navy shadow-sm font-bold'), 'Community search tab must use deep navy in Light Mode');
    });
  });
});
