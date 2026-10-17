import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Community Pages
const COMMUNITY_HOME_PATH = path.resolve(__dirname, '../pages/community/CommunityHome.jsx');
const SAVED_POSTS_PATH = path.resolve(__dirname, '../pages/community/SavedPostsPage.jsx');
const MODERATOR_DASHBOARD_PATH = path.resolve(__dirname, '../pages/community/ModeratorDashboard.jsx');
const REELS_PAGE_PATH = path.resolve(__dirname, '../pages/community/ReelsPage.jsx');

// Feed & Post Cards
const FEED_FILTER_TABS_PATH = path.resolve(__dirname, '../components/community/feed/FeedFilterTabs.jsx');
const POST_CARD_INDEX_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/index.jsx');
const POST_HEADER_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/PostHeader.jsx');
const POST_CONTENT_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/PostContent.jsx');
const POST_ACTIONS_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/PostActions.jsx');
const REACTION_BAR_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/ReactionBar.jsx');
const POST_CARD_SKELETON_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/PostCardSkeleton.jsx');
const POST_MEDIA_PATH = path.resolve(__dirname, '../components/community/feed/PostCard/PostMedia.jsx');

// Header & Discovery
const COMMUNITY_HEADER_PATH = path.resolve(__dirname, '../components/community/header/CommunityHeader.jsx');
const COMPANY_FEED_HEADER_PATH = path.resolve(__dirname, '../components/community/header/CompanyFeedHeader.jsx');
const DISCOVERY_SIDEBAR_PATH = path.resolve(__dirname, '../components/community/discovery/DiscoverySidebar.jsx');
const TRENDING_TOPICS_PATH = path.resolve(__dirname, '../components/community/discovery/TrendingTopics.jsx');
const PEOPLE_CARD_PATH = path.resolve(__dirname, '../components/community/discovery/PeopleCard.jsx');
const DISCOVERY_LINKS_PATH = path.resolve(__dirname, '../components/community/discovery/DiscoveryLinks.jsx');
const COMMUNITY_SEARCH_MODAL_PATH = path.resolve(__dirname, '../components/community/discovery/CommunitySearchModal.jsx');
const MOBILE_DISCOVERY_DRAWER_PATH = path.resolve(__dirname, '../components/community/discovery/MobileDiscoveryDrawer.jsx');

// Comments & Reposts
const COMMENT_DRAWER_PATH = path.resolve(__dirname, '../components/community/comments/CommentDrawer.jsx');
const COMMENT_INPUT_PATH = path.resolve(__dirname, '../components/community/comments/CommentInput.jsx');
const COMMENT_ITEM_PATH = path.resolve(__dirname, '../components/community/comments/CommentItem.jsx');
const COMMENT_LIST_PATH = path.resolve(__dirname, '../components/community/comments/CommentList.jsx');
const COMMENT_SKELETON_PATH = path.resolve(__dirname, '../components/community/comments/CommentSkeleton.jsx');
const QUOTE_POST_MODAL_PATH = path.resolve(__dirname, '../components/community/reposts/QuotePostModal.jsx');
const QUOTED_POST_PATH = path.resolve(__dirname, '../components/community/reposts/QuotedPost.jsx');
const REPOST_MENU_PATH = path.resolve(__dirname, '../components/community/reposts/RepostMenu.jsx');

// Composer Ecosystem
const COMPOSER_ENTRY_PATH = path.resolve(__dirname, '../components/community/composer/CommunityComposerEntry.jsx');
const CREATE_ACTION_MODAL_PATH = path.resolve(__dirname, '../components/community/composer/CreateActionModal.jsx');
const CREATE_POST_MODAL_PATH = path.resolve(__dirname, '../components/community/composer/CreatePostModal.jsx');
const AUDIENCE_SELECTOR_PATH = path.resolve(__dirname, '../components/community/composer/PostAudienceSelector.jsx');
const POLL_BUILDER_PATH = path.resolve(__dirname, '../components/community/composer/PostPollBuilder.jsx');
const MEDIA_MANAGER_PATH = path.resolve(__dirname, '../components/community/composer/PostMediaManager.jsx');
const POST_PREVIEW_PATH = path.resolve(__dirname, '../components/community/composer/PostPreview.jsx');
const MENTION_POPUP_PATH = path.resolve(__dirname, '../components/community/composer/MentionAutocompletePopup.jsx');
const REEL_STUDIO_MODAL_PATH = path.resolve(__dirname, '../components/community/composer/ReelStudioModal.jsx');
const REEL_CAPTION_EDITOR_PATH = path.resolve(__dirname, '../components/community/composer/ReelCaptionEditor.jsx');
const REEL_TEXT_EDITOR_PATH = path.resolve(__dirname, '../components/community/composer/ReelTextEditor.jsx');
const REEL_TIMELINE_PATH = path.resolve(__dirname, '../components/community/composer/ReelTimeline.jsx');
const REEL_LAYER_PANEL_PATH = path.resolve(__dirname, '../components/community/composer/ReelLayerPanel.jsx');
const REEL_COVER_SELECTOR_PATH = path.resolve(__dirname, '../components/community/composer/ReelCoverSelector.jsx');
const REEL_AUDIO_PICKER_PATH = path.resolve(__dirname, '../components/community/composer/ReelAudioPicker.jsx');
const REEL_STICKER_PICKER_PATH = path.resolve(__dirname, '../components/community/composer/ReelStickerPicker.jsx');
const COMPOSER_COLLAPSED_PATH = path.resolve(__dirname, '../components/community/composer/ComposerCollapsed.jsx');
const COMPOSER_EXPANDED_PATH = path.resolve(__dirname, '../components/community/composer/ComposerExpanded.jsx');
const CREATOR_INSIGHTS_MODAL_PATH = path.resolve(__dirname, '../components/community/creator/CreatorInsightsModal.jsx');

// Stories & Reels
const STORY_RAIL_PATH = path.resolve(__dirname, '../components/community/stories/StoryRail.jsx');
const STORY_AVATAR_RING_PATH = path.resolve(__dirname, '../components/community/stories/StoryAvatarRing.jsx');
const CREATE_STORY_MODAL_PATH = path.resolve(__dirname, '../components/community/stories/CreateStoryModal.jsx');
const STORY_DISCARD_DIALOG_PATH = path.resolve(__dirname, '../components/community/stories/editor/StoryDiscardDialog.jsx');
const STORY_STICKER_PICKER_PATH = path.resolve(__dirname, '../components/community/stories/editor/StoryStickerPicker.jsx');
const STORY_VIEWER_PATH = path.resolve(__dirname, '../components/community/stories/StoryViewer.jsx');
const REELS_VIEWER_PATH = path.resolve(__dirname, '../components/community/reels/ReelsViewer.jsx');
const REEL_ITEM_PATH = path.resolve(__dirname, '../components/community/reels/ReelItem.jsx');

describe('Zeitnah — Phase 4C: Community and Feed Theme Migration Unit Tests', () => {
  // ── TEST 1: Community Pages ──
  it('1. Community Pages (CommunityHome, SavedPostsPage, ModeratorDashboard, ReelsPage) use semantic tokens', () => {
    const homeContent = fs.readFileSync(COMMUNITY_HOME_PATH, 'utf8');
    const savedContent = fs.readFileSync(SAVED_POSTS_PATH, 'utf8');
    const modContent = fs.readFileSync(MODERATOR_DASHBOARD_PATH, 'utf8');
    const reelsContent = fs.readFileSync(REELS_PAGE_PATH, 'utf8');

    // CommunityHome
    assert.ok(homeContent.includes('bg-surface-card'), 'CommunityHome must use bg-surface-card');
    assert.ok(homeContent.includes('border-border'), 'CommunityHome must use border-border');
    assert.ok(homeContent.includes('text-text-primary'), 'CommunityHome must use text-text-primary');
    assert.ok(homeContent.includes('min-h-[44px]'), 'CommunityHome retry button must have accessible min-h-[44px]');
    assert.doesNotMatch(homeContent, /bg-\[#070B14\]/, 'CommunityHome must not contain bg-[#070B14]');
    assert.doesNotMatch(homeContent, /bg-\[#0E1726\]/, 'CommunityHome must not contain bg-[#0E1726]');

    // SavedPostsPage
    assert.ok(savedContent.includes('text-text-primary'), 'SavedPostsPage must use text-text-primary');
    assert.ok(savedContent.includes('bg-surface-card'), 'SavedPostsPage must use bg-surface-card');
    assert.ok(savedContent.includes('bg-surface-elevated'), 'SavedPostsPage must use bg-surface-elevated');
    assert.ok(savedContent.includes('border-border'), 'SavedPostsPage must use border-border');
    assert.doesNotMatch(savedContent, /bg-\[#070B14\]/, 'SavedPostsPage must not contain bg-[#070B14]');

    // ModeratorDashboard
    assert.ok(modContent.includes('text-text-primary'), 'ModeratorDashboard must use text-text-primary');
    assert.ok(modContent.includes('bg-surface-card'), 'ModeratorDashboard must use bg-surface-card');
    assert.ok(modContent.includes('border-border'), 'ModeratorDashboard must use border-border');
    assert.doesNotMatch(modContent, /bg-\[#070B14\]/, 'ModeratorDashboard must not contain bg-[#070B14]');

    // ReelsPage
    assert.ok(reelsContent.includes('border-border'), 'ReelsPage loader must use border-border');
    assert.ok(reelsContent.includes('bg-black'), 'ReelsPage stage must use bg-black');
    assert.doesNotMatch(reelsContent, /bg-\[#05070D\]/, 'ReelsPage must not contain bg-[#05070D]');
  });

  // ── TEST 2: Feed & PostCard Ecosystem ──
  it('2. Feed components and PostCard subcomponents use semantic tokens and preserve media presentation', () => {
    const tabsContent = fs.readFileSync(FEED_FILTER_TABS_PATH, 'utf8');
    const postCardContent = fs.readFileSync(POST_CARD_INDEX_PATH, 'utf8');
    const headerContent = fs.readFileSync(POST_HEADER_PATH, 'utf8');
    const bodyContent = fs.readFileSync(POST_CONTENT_PATH, 'utf8');
    const actionsContent = fs.readFileSync(POST_ACTIONS_PATH, 'utf8');
    const reactionContent = fs.readFileSync(REACTION_BAR_PATH, 'utf8');
    const skeletonContent = fs.readFileSync(POST_CARD_SKELETON_PATH, 'utf8');
    const mediaContent = fs.readFileSync(POST_MEDIA_PATH, 'utf8');

    // FeedFilterTabs
    assert.ok(tabsContent.includes('bg-surface-card'), 'FeedFilterTabs container must use bg-surface-card');
    assert.ok(tabsContent.includes('border-border'), 'FeedFilterTabs container must use border-border');
    assert.ok(tabsContent.includes('text-text-primary'), 'Active tab must use text-text-primary');
    assert.ok(tabsContent.includes('text-text-muted'), 'Inactive tab must use text-text-muted');

    // PostCard/index.jsx
    assert.ok(postCardContent.includes('zn-card'), 'PostCard must use zn-card');
    assert.ok(postCardContent.includes('bg-surface-card'), 'PostCard comment items must use bg-surface-card');
    assert.ok(postCardContent.includes('border-border'), 'PostCard comment items must use border-border');
    assert.ok(postCardContent.includes('text-text-primary'), 'PostCard must use text-text-primary');

    // PostHeader
    assert.ok(headerContent.includes('text-text-primary'), 'PostHeader author name must use text-text-primary');
    assert.ok(headerContent.includes('bg-surface-card'), 'PostHeader dropdown must use bg-surface-card');
    assert.ok(headerContent.includes('border-border'), 'PostHeader dropdown must use border-border');
    assert.ok(headerContent.includes('bg-surface-elevated'), 'PostHeader avatar ring must use bg-surface-elevated');

    // PostContent
    assert.ok(bodyContent.includes('text-text-primary'), 'PostContent text must use text-text-primary');

    // PostActions & ReactionBar
    assert.ok(actionsContent.includes('hover:bg-surface-elevated'), 'PostActions buttons must use hover:bg-surface-elevated');
    assert.ok(actionsContent.includes('text-text-primary'), 'PostActions must use text-text-primary for active typography');
    assert.ok(reactionContent.includes('bg-surface-card'), 'ReactionBar popup must use bg-surface-card');
    assert.ok(reactionContent.includes('border-border'), 'ReactionBar popup must use border-border');

    // PostCardSkeleton
    assert.ok(skeletonContent.includes('bg-surface-card'), 'PostCardSkeleton must use bg-surface-card');
    assert.ok(skeletonContent.includes('border-border'), 'PostCardSkeleton must use border-border');
    assert.ok(skeletonContent.includes('bg-surface-elevated'), 'PostCardSkeleton shimmers must use bg-surface-elevated');

    // PostMedia
    assert.ok(mediaContent.includes('border-border'), 'PostMedia borders must use border-border');
    assert.ok(mediaContent.includes('bg-surface-elevated'), 'PostMedia placeholder/error must use bg-surface-elevated');
    assert.doesNotMatch(mediaContent, /bg-\[#070B14\]/, 'PostMedia must not contain bg-[#070B14]');
    assert.doesNotMatch(mediaContent, /bg-\[#0E1726\]/, 'PostMedia must not contain bg-[#0E1726]');
  });

  // ── TEST 3: Community Header and Discovery Sidebar ──
  it('3. Community Headers and Discovery components use semantic surfaces, borders, and typography', () => {
    const headerContent = fs.readFileSync(COMMUNITY_HEADER_PATH, 'utf8');
    const companyHeaderContent = fs.readFileSync(COMPANY_FEED_HEADER_PATH, 'utf8');
    const sidebarContent = fs.readFileSync(DISCOVERY_SIDEBAR_PATH, 'utf8');
    const trendingContent = fs.readFileSync(TRENDING_TOPICS_PATH, 'utf8');
    const peopleContent = fs.readFileSync(PEOPLE_CARD_PATH, 'utf8');
    const searchModalContent = fs.readFileSync(COMMUNITY_SEARCH_MODAL_PATH, 'utf8');
    const mobileDrawerContent = fs.readFileSync(MOBILE_DISCOVERY_DRAWER_PATH, 'utf8');

    // CommunityHeader
    assert.ok(headerContent.includes('text-text-primary'), 'CommunityHeader title must use text-text-primary');
    assert.ok(headerContent.includes('bg-surface-card'), 'CommunityHeader buttons must use bg-surface-card');
    assert.ok(headerContent.includes('border-border'), 'CommunityHeader buttons must use border-border');

    // CompanyFeedHeader
    assert.ok(companyHeaderContent.includes('bg-surface-card'), 'CompanyFeedHeader card must use bg-surface-card');
    assert.ok(companyHeaderContent.includes('border-border'), 'CompanyFeedHeader card must use border-border');
    assert.ok(companyHeaderContent.includes('text-text-primary'), 'CompanyFeedHeader must use text-text-primary');

    // DiscoverySidebar & TrendingTopics
    assert.ok(sidebarContent.includes('text-text-primary'), 'DiscoverySidebar must use text-text-primary');
    assert.ok(trendingContent.includes('bg-surface-card'), 'TrendingTopics panel must use bg-surface-card');
    assert.ok(trendingContent.includes('bg-surface-elevated'), 'TrendingTopics pills must use bg-surface-elevated');
    assert.ok(trendingContent.includes('border-border'), 'TrendingTopics must use border-border');

    // PeopleCard
    assert.ok(peopleContent.includes('bg-surface-card'), 'PeopleCard must use bg-surface-card');
    assert.ok(peopleContent.includes('text-text-primary'), 'PeopleCard name must use text-text-primary');

    // CommunitySearchModal & MobileDiscoveryDrawer
    assert.ok(searchModalContent.includes('bg-surface-card'), 'Search modal must use bg-surface-card');
    assert.ok(searchModalContent.includes('border-border'), 'Search modal must use border-border');
    assert.ok(searchModalContent.includes('bg-surface-elevated'), 'Search modal elevated surfaces must use bg-surface-elevated');
    assert.doesNotMatch(searchModalContent, /bg-\[#070B14\]/, 'Search modal must not contain bg-[#070B14]');
    assert.doesNotMatch(searchModalContent, /bg-\[#0C121E\]/, 'Search modal must not contain bg-[#0C121E]');

    assert.ok(mobileDrawerContent.includes('bg-surface-card'), 'MobileDiscoveryDrawer must use bg-surface-card');
    assert.ok(mobileDrawerContent.includes('border-border'), 'MobileDiscoveryDrawer must use border-border');
  });

  // ── TEST 4: Comments and Repost Dialogs ──
  it('4. Comment drawer, items, skeletons, and repost modals use semantic tokens', () => {
    const drawerContent = fs.readFileSync(COMMENT_DRAWER_PATH, 'utf8');
    const inputContent = fs.readFileSync(COMMENT_INPUT_PATH, 'utf8');
    const itemContent = fs.readFileSync(COMMENT_ITEM_PATH, 'utf8');
    const listContent = fs.readFileSync(COMMENT_LIST_PATH, 'utf8');
    const skeletonContent = fs.readFileSync(COMMENT_SKELETON_PATH, 'utf8');
    const quoteModalContent = fs.readFileSync(QUOTE_POST_MODAL_PATH, 'utf8');
    const quotedPostContent = fs.readFileSync(QUOTED_POST_PATH, 'utf8');
    const repostMenuContent = fs.readFileSync(REPOST_MENU_PATH, 'utf8');

    // CommentDrawer
    assert.ok(drawerContent.includes('bg-surface-card'), 'CommentDrawer must use bg-surface-card');
    assert.ok(drawerContent.includes('border-border'), 'CommentDrawer must use border-border');
    assert.ok(drawerContent.includes('text-text-primary'), 'CommentDrawer must use text-text-primary');
    assert.doesNotMatch(drawerContent, /bg-\[#070B14\]/, 'CommentDrawer must not contain bg-[#070B14]');

    // CommentInput & CommentItem
    assert.ok(inputContent.includes('bg-surface-card'), 'CommentInput sticky bar must use bg-surface-card');
    assert.ok(inputContent.includes('border-border'), 'CommentInput must use border-border');
    assert.ok(inputContent.includes('bg-surface-elevated'), 'CommentInput field must use bg-surface-elevated');
    assert.ok(itemContent.includes('text-text-primary'), 'CommentItem author must use text-text-primary');
    assert.ok(itemContent.includes('bg-surface-elevated'), 'CommentItem avatar must use bg-surface-elevated');

    // QuotePostModal & QuotedPost
    assert.ok(quoteModalContent.includes('bg-surface-card'), 'QuotePostModal must use bg-surface-card');
    assert.ok(quoteModalContent.includes('border-border'), 'QuotePostModal must use border-border');
    assert.ok(quoteModalContent.includes('bg-surface-elevated'), 'QuotePostModal textarea must use bg-surface-elevated');
    assert.ok(quotedPostContent.includes('border-border'), 'QuotedPost must use border-border');
    assert.ok(quotedPostContent.includes('text-text-primary'), 'QuotedPost must use text-text-primary');

    // RepostMenu
    assert.ok(repostMenuContent.includes('bg-surface-card'), 'RepostMenu must use bg-surface-card');
    assert.ok(repostMenuContent.includes('border-border'), 'RepostMenu must use border-border');
  });

  // ── TEST 5: Post & Reel Composer Ecosystem ──
  it('5. Post and Reel creation studio components use semantic tokens and avoid hardcoded surfaces', () => {
    const entryContent = fs.readFileSync(COMPOSER_ENTRY_PATH, 'utf8');
    const actionModalContent = fs.readFileSync(CREATE_ACTION_MODAL_PATH, 'utf8');
    const postModalContent = fs.readFileSync(CREATE_POST_MODAL_PATH, 'utf8');
    const reelStudioContent = fs.readFileSync(REEL_STUDIO_MODAL_PATH, 'utf8');
    const reelTimelineContent = fs.readFileSync(REEL_TIMELINE_PATH, 'utf8');
    const reelAudioContent = fs.readFileSync(REEL_AUDIO_PICKER_PATH, 'utf8');
    const reelStickerContent = fs.readFileSync(REEL_STICKER_PICKER_PATH, 'utf8');
    const creatorInsightsContent = fs.readFileSync(CREATOR_INSIGHTS_MODAL_PATH, 'utf8');

    // CommunityComposerEntry
    assert.ok(entryContent.includes('bg-surface-card'), 'ComposerEntry must use bg-surface-card');
    assert.ok(entryContent.includes('bg-surface-elevated'), 'ComposerEntry buttons must use bg-surface-elevated');
    assert.ok(entryContent.includes('border-border'), 'ComposerEntry must use border-border');

    // CreateActionModal
    assert.ok(actionModalContent.includes('bg-surface-card'), 'CreateActionModal must use bg-surface-card');
    assert.ok(actionModalContent.includes('border-border'), 'CreateActionModal must use border-border');
    assert.ok(actionModalContent.includes('bg-surface-elevated'), 'CreateActionModal option cards must use bg-surface-elevated');

    // CreatePostModal
    assert.ok(postModalContent.includes('bg-surface-card'), 'CreatePostModal must use bg-surface-card');
    assert.ok(postModalContent.includes('border-border'), 'CreatePostModal must use border-border');
    assert.ok(postModalContent.includes('bg-surface-elevated'), 'CreatePostModal settings must use bg-surface-elevated');
    assert.ok(postModalContent.includes('text-text-primary'), 'CreatePostModal must use text-text-primary');
    assert.doesNotMatch(postModalContent, /bg-\[#070B14\]/, 'CreatePostModal must not contain bg-[#070B14]');
    assert.doesNotMatch(postModalContent, /bg-\[#0C121E\]/, 'CreatePostModal must not contain bg-[#0C121E]');
    assert.doesNotMatch(postModalContent, /bg-\[#0E1726\]/, 'CreatePostModal must not contain bg-[#0E1726]');

    // ReelStudioModal
    assert.ok(reelStudioContent.includes('bg-surface-card'), 'ReelStudioModal must use bg-surface-card');
    assert.ok(reelStudioContent.includes('border-border'), 'ReelStudioModal must use border-border');
    assert.ok(reelStudioContent.includes('bg-surface-elevated'), 'ReelStudioModal controls must use bg-surface-elevated');
    assert.ok(reelStudioContent.includes('text-text-primary'), 'ReelStudioModal must use text-text-primary');
    assert.ok(reelStudioContent.includes('text-bg-base'), 'ReelStudioModal brand buttons must use text-bg-base');
    assert.doesNotMatch(reelStudioContent, /bg-\[#070B14\]/, 'ReelStudioModal must not contain bg-[#070B14]');
    assert.doesNotMatch(reelStudioContent, /bg-\[#09111F\]/, 'ReelStudioModal must not contain bg-[#09111F]');
    assert.doesNotMatch(reelStudioContent, /bg-\[#0E1726\]/, 'ReelStudioModal must not contain bg-[#0E1726]');

    // ReelTimeline
    assert.ok(reelTimelineContent.includes('bg-surface-elevated'), 'ReelTimeline must use bg-surface-elevated');
    assert.ok(reelTimelineContent.includes('border-border'), 'ReelTimeline must use border-border');

    // ReelAudioPicker & ReelStickerPicker
    assert.ok(reelAudioContent.includes('bg-surface-card'), 'ReelAudioPicker must use bg-surface-card');
    assert.ok(reelAudioContent.includes('border-border'), 'ReelAudioPicker must use border-border');
    assert.ok(reelAudioContent.includes('bg-surface-elevated'), 'ReelAudioPicker must use bg-surface-elevated');
    assert.doesNotMatch(reelAudioContent, /bg-\[#090F1D\]/, 'ReelAudioPicker must not contain bg-[#090F1D]');
    assert.doesNotMatch(reelAudioContent, /bg-\[#070B14\]/, 'ReelAudioPicker must not contain bg-[#070B14]');

    assert.ok(reelStickerContent.includes('bg-surface-card'), 'ReelStickerPicker must use bg-surface-card');
    assert.ok(reelStickerContent.includes('border-border'), 'ReelStickerPicker must use border-border');
    assert.doesNotMatch(reelStickerContent, /bg-\[#090F1C\]/, 'ReelStickerPicker must not contain bg-[#090F1C]');

    // CreatorInsightsModal
    assert.ok(creatorInsightsContent.includes('bg-surface-card'), 'CreatorInsightsModal must use bg-surface-card');
    assert.ok(creatorInsightsContent.includes('border-border'), 'CreatorInsightsModal must use border-border');
    assert.ok(creatorInsightsContent.includes('text-text-primary'), 'CreatorInsightsModal must use text-text-primary');
    assert.doesNotMatch(creatorInsightsContent, /bg-\[#090E1A\]/, 'CreatorInsightsModal must not contain bg-[#090E1A]');
  });

  // ── TEST 6: Stories & Reels Components ──
  it('6. Stories and Reels components use semantic surfaces, accessible touch targets, and pure media letterboxing', () => {
    const railContent = fs.readFileSync(STORY_RAIL_PATH, 'utf8');
    const ringContent = fs.readFileSync(STORY_AVATAR_RING_PATH, 'utf8');
    const storyModalContent = fs.readFileSync(CREATE_STORY_MODAL_PATH, 'utf8');
    const discardContent = fs.readFileSync(STORY_DISCARD_DIALOG_PATH, 'utf8');
    const stickerPickerContent = fs.readFileSync(STORY_STICKER_PICKER_PATH, 'utf8');
    const storyViewerContent = fs.readFileSync(STORY_VIEWER_PATH, 'utf8');
    const reelsViewerContent = fs.readFileSync(REELS_VIEWER_PATH, 'utf8');
    const reelItemContent = fs.readFileSync(REEL_ITEM_PATH, 'utf8');

    // StoryRail & StoryAvatarRing
    assert.ok(railContent.includes('bg-surface-card'), 'StoryRail must use bg-surface-card');
    assert.ok(railContent.includes('border-border'), 'StoryRail must use border-border');
    assert.ok(railContent.includes('text-text-primary'), 'StoryRail label must use text-text-primary');
    assert.ok(ringContent.includes('bg-surface-card'), 'StoryAvatarRing inner ring must use bg-surface-card');

    // CreateStoryModal & DiscardDialog
    assert.ok(storyModalContent.includes('bg-surface-card'), 'CreateStoryModal must use bg-surface-card');
    assert.ok(storyModalContent.includes('border-border'), 'CreateStoryModal must use border-border');
    assert.ok(storyModalContent.includes('bg-surface-elevated'), 'CreateStoryModal must use bg-surface-elevated');
    assert.ok(storyModalContent.includes('text-text-primary'), 'CreateStoryModal must use text-text-primary');
    assert.ok(storyModalContent.includes('text-bg-base'), 'CreateStoryModal button must use text-bg-base');
    assert.ok(discardContent.includes('bg-surface-card'), 'StoryDiscardDialog must use bg-surface-card');
    assert.ok(discardContent.includes('border-border'), 'StoryDiscardDialog must use border-border');

    // StoryStickerPicker
    assert.ok(stickerPickerContent.includes('bg-surface-card'), 'StoryStickerPicker must use bg-surface-card');
    assert.ok(stickerPickerContent.includes('border-border'), 'StoryStickerPicker must use border-border');
    assert.doesNotMatch(stickerPickerContent, /bg-\[#0E1726\]/, 'StoryStickerPicker must not contain bg-[#0E1726]');

    // StoryViewer, ReelsViewer, ReelItem
    assert.ok(storyViewerContent.includes('border-border'), 'StoryViewer frame must use border-border');
    assert.ok(storyViewerContent.includes('bg-surface-elevated'), 'StoryViewer avatar must use bg-surface-elevated');
    assert.ok(storyViewerContent.includes('text-bg-base'), 'StoryViewer submit button must use text-bg-base');
    assert.ok(reelsViewerContent.includes('bg-black'), 'ReelsViewer stage must use bg-black');
    assert.ok(reelItemContent.includes('bg-surface-card'), 'ReelItem context menu must use bg-surface-card');
    assert.ok(reelItemContent.includes('border-border'), 'ReelItem context menu must use border-border');
    assert.ok(reelItemContent.includes('text-text-primary'), 'ReelItem context menu must use text-text-primary');
    assert.doesNotMatch(reelItemContent, /bg-\[#0D1424\]/, 'ReelItem must not contain bg-[#0D1424]');
  });

  // ── TEST 7: Touch Target Accessibility Invariant ──
  it('7. Interactive triggers and buttons enforce accessible touch targets (min-h-[44px])', () => {
    const homeContent = fs.readFileSync(COMMUNITY_HOME_PATH, 'utf8');
    const studioContent = fs.readFileSync(REEL_STUDIO_MODAL_PATH, 'utf8');
    const postModalContent = fs.readFileSync(CREATE_POST_MODAL_PATH, 'utf8');
    const audioContent = fs.readFileSync(REEL_AUDIO_PICKER_PATH, 'utf8');
    const storyModalContent = fs.readFileSync(CREATE_STORY_MODAL_PATH, 'utf8');

    assert.ok(homeContent.includes('min-h-[44px]'), 'CommunityHome retry button must enforce min-h-[44px]');
    assert.ok(studioContent.includes('min-h-[44px]'), 'ReelStudioModal buttons must enforce min-h-[44px]');
    assert.ok(postModalContent.includes('min-h-[44px]'), 'CreatePostModal buttons must enforce min-h-[44px]');
    assert.ok(audioContent.includes('min-h-[44px]'), 'ReelAudioPicker buttons must enforce min-h-[44px]');
    assert.ok(storyModalContent.includes('min-h-[44px]'), 'CreateStoryModal buttons must enforce min-h-[44px]');
  });
});
