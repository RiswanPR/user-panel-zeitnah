import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import {
  formatRelativeTime,
  truncateContent,
  sanitizeTag,
  normalizeFeedFilter,
  extractTrendingTopics,
} from "./communityFormatters.js";
import { getCanonicalProfileUrl } from "./roleNavigation.js";

test("Community Feed, Comments & Stories — Phase 2C Verification", async (t) => {
  await t.test("formats relative timestamps accurately across intervals", () => {
    assert.equal(formatRelativeTime(""), "");
    assert.equal(formatRelativeTime(null), "");

    const now = new Date();
    // 30 seconds ago
    const justNow = new Date(now.getTime() - 30 * 1000).toISOString();
    assert.equal(formatRelativeTime(justNow), "Just now");

    // 15 minutes ago
    const minutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    assert.equal(formatRelativeTime(minutesAgo), "15m");

    // 4 hours ago
    const hoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    assert.equal(formatRelativeTime(hoursAgo), "4h");

    // 3 days ago
    const daysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(formatRelativeTime(daysAgo), "3d");
  });

  await t.test("handles text truncation for long posts correctly", () => {
    const shortText = "Short post content.";
    const shortResult = truncateContent(shortText, 260);
    assert.equal(shortResult.isLong, false);
    assert.equal(shortResult.text, shortText);

    const longText = "A".repeat(300);
    const longResult = truncateContent(longText, 260);
    assert.equal(longResult.isLong, true);
    assert.ok(longResult.text.endsWith("..."));
    assert.equal(longResult.text.length, 263);

    const multilineText = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
    const multilineResult = truncateContent(multilineText, 260);
    assert.equal(multilineResult.isLong, true);
  });

  await t.test("sanitizes hashtags cleanly", () => {
    assert.equal(sanitizeTag("#engineering"), "engineering");
    assert.equal(sanitizeTag("###zeitnah"), "zeitnah");
    assert.equal(sanitizeTag("bim "), "bim");
    assert.equal(sanitizeTag(null), "");
  });

  await t.test("ensures canonical profile URL routing applies to Community post authors", () => {
    // Author with username
    const authorWithUsername = {
      _id: "user-123",
      name: "Riswan P.R",
      username: "riswanpr",
    };
    assert.equal(getCanonicalProfileUrl(authorWithUsername), "/u/riswanpr");

    // Author with @handle
    const authorWithHandle = {
      _id: "user-456",
      name: "Jane Doe",
      username: "@janedoe",
    };
    assert.equal(getCanonicalProfileUrl(authorWithHandle), "/u/janedoe");

    // Author without username falls back to ID
    const authorWithoutUsername = {
      _id: "user-789",
      name: "Alex Smith",
    };
    assert.equal(getCanonicalProfileUrl(authorWithoutUsername), "/u/user-789");

    // Null/undefined author falls back safely
    assert.equal(getCanonicalProfileUrl(null), "/network");
  });

  await t.test("validates all 4 standard reactions exist in ReactionBar definition", () => {
    const reactionBarFile = path.resolve("src/components/community/feed/PostCard/ReactionBar.jsx");
    const content = fs.readFileSync(reactionBarFile, "utf8");

    assert.ok(content.includes("id: 'like'"), "Must have like reaction");
    assert.ok(content.includes("id: 'love'"), "Must have love reaction");
    assert.ok(content.includes("id: 'celebrate'"), "Must have celebrate reaction");
    assert.ok(content.includes("id: 'insightful'"), "Must have insightful reaction");
    assert.ok(content.includes("Heart"), "Must use Heart icon for like");
    assert.ok(content.includes("Flame"), "Must use Flame icon for love");
    assert.ok(content.includes("Star"), "Must use Star icon for celebrate");
    assert.ok(content.includes("Lightbulb"), "Must use Lightbulb icon for insightful");
  });

  await t.test("verifies CommentDrawer architecture and component files exist", () => {
    const commentsDir = path.resolve("src/components/community/comments");
    assert.ok(fs.existsSync(path.join(commentsDir, "CommentDrawer.jsx")), "CommentDrawer.jsx must exist");
    assert.ok(fs.existsSync(path.join(commentsDir, "CommentList.jsx")), "CommentList.jsx must exist");
    assert.ok(fs.existsSync(path.join(commentsDir, "CommentItem.jsx")), "CommentItem.jsx must exist");
    assert.ok(fs.existsSync(path.join(commentsDir, "CommentInput.jsx")), "CommentInput.jsx must exist");
    assert.ok(fs.existsSync(path.join(commentsDir, "CommentSkeleton.jsx")), "CommentSkeleton.jsx must exist");

    // Verify CommentDrawer implements desktop drawer + mobile bottom sheet
    const drawerContent = fs.readFileSync(path.join(commentsDir, "CommentDrawer.jsx"), "utf8");
    assert.ok(drawerContent.includes("md:w-[420px]"), "CommentDrawer must have desktop drawer width");
    assert.ok(drawerContent.includes("rounded-t-3xl"), "CommentDrawer must support mobile bottom sheet styling");
    assert.ok(drawerContent.includes("Escape"), "CommentDrawer must support Escape dismissal");
  });

  await t.test("verifies Story system architecture and component files exist", () => {
    const storiesDir = path.resolve("src/components/community/stories");
    assert.ok(fs.existsSync(path.join(storiesDir, "StoryRail.jsx")), "StoryRail.jsx must exist");
    assert.ok(fs.existsSync(path.join(storiesDir, "StoryAvatarRing.jsx")), "StoryAvatarRing.jsx must exist");
    assert.ok(fs.existsSync(path.join(storiesDir, "StoryViewer.jsx")), "StoryViewer.jsx must exist");
    assert.ok(fs.existsSync(path.join(storiesDir, "CreateStoryModal.jsx")), "CreateStoryModal.jsx must exist");

    // Verify StoryAvatarRing implements seen vs unseen ring styling
    const ringContent = fs.readFileSync(path.join(storiesDir, "StoryAvatarRing.jsx"), "utf8");
    assert.ok(ringContent.includes("isSeen"), "StoryAvatarRing must branch on isSeen state");
    assert.ok(ringContent.includes("brand-mint"), "StoryAvatarRing must use brand-mint for unseen stories");

    // Verify StoryViewer implements progress, timer cleanup, and reply bar
    const viewerContent = fs.readFileSync(path.join(storiesDir, "StoryViewer.jsx"), "utf8");
    assert.ok(viewerContent.includes("cancelAnimationFrame"), "StoryViewer must clean up animation frames");
    assert.ok(viewerContent.includes("replyToStory"), "StoryViewer must support story replies");
    assert.ok(viewerContent.includes("STORY_DURATION_MS"), "StoryViewer must have defined duration");
  });

  await t.test("verifies CommunityHome single-drawer orchestration", () => {
    const homeFile = path.resolve("src/pages/community/CommunityHome.jsx");
    const homeContent = fs.readFileSync(homeFile, "utf8");

    assert.ok(homeContent.includes("activeCommentPost"), "CommunityHome must maintain activeCommentPost state");
    assert.ok(homeContent.includes("CommentDrawer"), "CommunityHome must mount CommentDrawer once");
    assert.ok(homeContent.includes("StoryRail"), "CommunityHome must mount StoryRail");
    assert.ok(homeContent.includes("onOpenComments={setActiveCommentPost}"), "CommunityHome must pass onOpenComments to PostCard");
  });

  // ── Phase 2D: Discovery, Feed Filters & Saved Content Tests ──
  await t.test("Phase 2D: validates feed filter normalization and URL fallback", () => {
    assert.equal(normalizeFeedFilter("all"), "all");
    assert.equal(normalizeFeedFilter("following"), "following");
    assert.equal(normalizeFeedFilter("cohort"), "cohort");
    assert.equal(normalizeFeedFilter("FOLLOWING"), "following");
    assert.equal(normalizeFeedFilter("invalid"), "all");
    assert.equal(normalizeFeedFilter(null), "all");
    assert.equal(normalizeFeedFilter(undefined), "all");
    assert.equal(normalizeFeedFilter(""), "all");
  });

  await t.test("Phase 2D: extracts deterministic trending topics from real post data without fabrication", () => {
    const samplePosts = [
      {
        content: "Excited about modern #BIM workflows and structural models in Zeitnah!",
        tags: ["engineering", "structures"],
        hashtags: ["#bim"],
      },
      {
        content: "Reviewing concrete strength tests and #geotechnical reports.",
        tags: ["engineering", "geotechnical"],
      },
      {
        content: "New update on #structures design.",
        hashtags: ["structures"],
      },
    ];

    const topics = extractTrendingTopics(samplePosts, 5);
    assert.ok(Array.isArray(topics));
    assert.ok(topics.length > 0);

    // "engineering" appears in 2 posts
    const eng = topics.find((t) => t.tag === "engineering");
    assert.ok(eng);
    assert.equal(eng.count, 2);

    // "structures" appears in 2 posts (1 as tag, 1 in hashtag)
    const struct = topics.find((t) => t.tag === "structures");
    assert.ok(struct);
    assert.equal(struct.count, 2);

    // "bim" appears in 1 post
    const bim = topics.find((t) => t.tag === "bim");
    assert.ok(bim);
    assert.equal(bim.count, 1);

    // Empty list handling
    assert.deepEqual(extractTrendingTopics([]), []);
    assert.deepEqual(extractTrendingTopics(null), []);
  });

  await t.test("Phase 2D: verifies Discovery and Filter component architecture files exist", () => {
    const feedFilterTabsFile = path.resolve("src/components/community/feed/FeedFilterTabs.jsx");
    const trendingTopicsFile = path.resolve("src/components/community/discovery/TrendingTopics.jsx");
    const discoveryLinksFile = path.resolve("src/components/community/discovery/DiscoveryLinks.jsx");
    const discoverySidebarFile = path.resolve("src/components/community/discovery/DiscoverySidebar.jsx");
    const mobileDiscoveryFile = path.resolve("src/components/community/discovery/MobileDiscoveryDrawer.jsx");
    const savedPostsPageFile = path.resolve("src/pages/community/SavedPostsPage.jsx");

    assert.ok(fs.existsSync(feedFilterTabsFile), "FeedFilterTabs.jsx must exist");
    assert.ok(fs.existsSync(trendingTopicsFile), "TrendingTopics.jsx must exist");
    assert.ok(fs.existsSync(discoveryLinksFile), "DiscoveryLinks.jsx must exist");
    assert.ok(fs.existsSync(discoverySidebarFile), "DiscoverySidebar.jsx must exist");
    assert.ok(fs.existsSync(mobileDiscoveryFile), "MobileDiscoveryDrawer.jsx must exist");
    assert.ok(fs.existsSync(savedPostsPageFile), "SavedPostsPage.jsx must exist");

    // Check accessibility semantics in FeedFilterTabs
    const filterTabsContent = fs.readFileSync(feedFilterTabsFile, "utf8");
    assert.ok(filterTabsContent.includes('role="tablist"'), "FeedFilterTabs must implement role='tablist'");
    assert.ok(filterTabsContent.includes('role="tab"'), "FeedFilterTabs must implement role='tab'");
    assert.ok(filterTabsContent.includes("aria-selected"), "FeedFilterTabs must implement aria-selected");

    // Check SavedPostsPage integration
    const savedContent = fs.readFileSync(savedPostsPageFile, "utf8");
    assert.ok(savedContent.includes("useSavedPosts"), "SavedPostsPage must query useSavedPosts");
    assert.ok(savedContent.includes("EmptyState"), "SavedPostsPage must render EmptyState");
    assert.ok(savedContent.includes("CommentDrawer"), "SavedPostsPage must mount CommentDrawer");

    // Check App.jsx routes
    const appFile = path.resolve("src/App.jsx");
    const appContent = fs.readFileSync(appFile, "utf8");
    assert.ok(appContent.includes('/community/saved'), "App.jsx must register /community/saved route");
  });

  // ── Phase 2E: Premium Polish, Accessibility, Performance & Hardening ──
  await t.test("Phase 2E: verifies TanStack Query cache configuration and optimistic rollback", () => {
    const hooksFile = path.resolve("src/hooks/useCommunity.js");
    const hooksContent = fs.readFileSync(hooksFile, "utf8");

    // Cache times
    assert.ok(hooksContent.includes("staleTime: 1000 * 60 * 2"), "Feed & saved posts must have 2min staleTime");
    assert.ok(hooksContent.includes("gcTime: 1000 * 60 * 10"), "Feed & saved posts must have 10min gcTime");
    assert.ok(hooksContent.includes("staleTime: 1000 * 30"), "Comments must have 30s staleTime");
    assert.ok(hooksContent.includes("staleTime: 1000 * 60 * 3"), "Stories must have 3min staleTime");

    // Optimistic rollback snapshots
    assert.ok(hooksContent.includes("context?.previousFeed"), "useReactToPost must rollback on mutation failure");
    assert.ok(hooksContent.includes("context?.previousSaved"), "useSavePost must rollback saved data on failure");
    assert.ok(hooksContent.includes("context?.previousFeed"), "useRemoveSavedPost must rollback feed data on failure");
  });

  await t.test("Phase 2E: verifies touch target minimums (44x44px) across Community mobile controls", () => {
    // 1. PostActions share & bookmark
    const postActionsFile = path.resolve("src/components/community/feed/PostCard/PostActions.jsx");
    const postActionsContent = fs.readFileSync(postActionsFile, "utf8");
    assert.ok(postActionsContent.includes("min-h-[44px] min-w-[44px]"), "PostActions must have 44x44 touch targets");
    assert.ok(postActionsContent.includes("Link copied"), "PostActions must provide subtle 'Link copied' feedback");

    // 2. ReactionBar buttons
    const reactionBarFile = path.resolve("src/components/community/feed/PostCard/ReactionBar.jsx");
    const reactionBarContent = fs.readFileSync(reactionBarFile, "utf8");
    assert.ok(reactionBarContent.includes("min-w-[44px] min-h-[44px]"), "ReactionBar must have 44x44 touch targets");

    // 3. PostHeader controls
    const postHeaderFile = path.resolve("src/components/community/feed/PostCard/PostHeader.jsx");
    const postHeaderContent = fs.readFileSync(postHeaderFile, "utf8");
    assert.ok(postHeaderContent.includes("min-w-[44px] min-h-[44px]"), "PostHeader must have 44x44 touch targets");

    // 4. FeedFilterTabs
    const filterTabsFile = path.resolve("src/components/community/feed/FeedFilterTabs.jsx");
    const filterTabsContent = fs.readFileSync(filterTabsFile, "utf8");
    assert.ok(filterTabsContent.includes("min-h-[44px]"), "FeedFilterTabs must satisfy 44px min-height on mobile");

    // 5. CommentDrawer close button
    const drawerFile = path.resolve("src/components/community/comments/CommentDrawer.jsx");
    const drawerContent = fs.readFileSync(drawerFile, "utf8");
    assert.ok(drawerContent.includes("min-w-[44px] min-h-[44px]"), "CommentDrawer close button must have 44x44 touch target");

    // 6. CreateStoryModal controls
    const createStoryFile = path.resolve("src/components/community/stories/CreateStoryModal.jsx");
    const createStoryContent = fs.readFileSync(createStoryFile, "utf8");
    assert.ok(createStoryContent.includes("min-w-[44px] min-h-[44px]"), "CreateStoryModal close and color buttons must have 44x44 touch targets");

    // 7. MobileDiscoveryDrawer close button
    const mobileDiscFile = path.resolve("src/components/community/discovery/MobileDiscoveryDrawer.jsx");
    const mobileDiscContent = fs.readFileSync(mobileDiscFile, "utf8");
    assert.ok(mobileDiscContent.includes("min-w-[44px] min-h-[44px]"), "MobileDiscoveryDrawer close button must have 44x44 touch target");

    // 8. MediaLightbox close button
    const lightboxFile = path.resolve("src/components/community/feed/PostCard/MediaLightbox.jsx");
    const lightboxContent = fs.readFileSync(lightboxFile, "utf8");
    assert.ok(lightboxContent.includes("min-h-[44px] min-w-[44px]"), "MediaLightbox close button must have 44x44 touch target");
  });

  await t.test("Phase 2E: verifies accessibility (ARIA, focus management, reduced motion, keyboard)", () => {
    // MediaLightbox accessibility
    const lightboxContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/MediaLightbox.jsx"), "utf8");
    assert.ok(lightboxContent.includes('role="dialog"'), "MediaLightbox must implement role='dialog'");
    assert.ok(lightboxContent.includes('aria-modal="true"'), "MediaLightbox must set aria-modal='true'");
    assert.ok(lightboxContent.includes("previousActiveElementRef"), "MediaLightbox must restore focus on close");
    assert.ok(lightboxContent.includes("useReducedMotion"), "MediaLightbox must respect reduced-motion preference");

    // StoryViewer focus restoration and 60fps loop defense
    const viewerContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryViewer.jsx"), "utf8");
    assert.ok(viewerContent.includes("previousActiveElementRef"), "StoryViewer must restore focus on close");
    assert.ok(viewerContent.includes("progressRef"), "StoryViewer must use progressRef to avoid 60fps re-subscription loop");

    // CommentInput ARIA live announcements
    const commentInputContent = fs.readFileSync(path.resolve("src/components/community/comments/CommentInput.jsx"), "utf8");
    assert.ok(commentInputContent.includes('role="status"'), "CommentInput reply banner must have role='status'");
    assert.ok(commentInputContent.includes('aria-live="polite"'), "CommentInput reply banner must have aria-live='polite'");

    // FeedFilterTabs Arrow keys
    const filterTabsContent = fs.readFileSync(path.resolve("src/components/community/feed/FeedFilterTabs.jsx"), "utf8");
    assert.ok(filterTabsContent.includes("ArrowRight"), "FeedFilterTabs must support ArrowRight keyboard navigation");
    assert.ok(filterTabsContent.includes("ArrowLeft"), "FeedFilterTabs must support ArrowLeft keyboard navigation");
  });

  await t.test("Phase 2E: verifies layout shift prevention and mutual video playback control", () => {
    const postMediaContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/PostMedia.jsx"), "utf8");
    assert.ok(postMediaContent.includes("aspect-video"), "PostMedia must reserve container aspect ratio before media loads");
    assert.ok(postMediaContent.includes("IntersectionObserver"), "PostMedia must use IntersectionObserver to pause off-screen videos");
    assert.ok(postMediaContent.includes("document.querySelectorAll('video')"), "PostMedia must enforce single active video playback");
    assert.ok(postMediaContent.includes("overflow-hidden"), "PostMedia must guard against container overflow");
  });

  await t.test("Phase 2E: verifies error recovery states match Section 24 specification", () => {
    // CommunityHome feed error state
    const homeContent = fs.readFileSync(path.resolve("src/pages/community/CommunityHome.jsx"), "utf8");
    assert.ok(homeContent.includes("We couldn't load the community."), "CommunityHome must display Section 24 feed error message");
    assert.ok(homeContent.includes("refetchFeed"), "CommunityHome must provide retry action");

    // SavedPostsPage error state
    const savedContent = fs.readFileSync(path.resolve("src/pages/community/SavedPostsPage.jsx"), "utf8");
    assert.ok(savedContent.includes("Your saved posts couldn't be loaded"), "SavedPostsPage must display Section 24 saved error message");
    assert.ok(savedContent.includes("refetch"), "SavedPostsPage must provide retry action");

    // CommentList error state
    const commentListContent = fs.readFileSync(path.resolve("src/components/community/comments/CommentList.jsx"), "utf8");
    assert.ok(commentListContent.includes("Comments couldn't be loaded."), "CommentList must display Section 24 comments error message");
  });

  await t.test("Phase 2E: verifies Composer pre-validation and user-friendly error recovery", () => {
    const composerContent = fs.readFileSync(path.resolve("src/components/community/composer/CommunityComposer.jsx"), "utf8");
    assert.ok(composerContent.includes("50 * 1024 * 1024"), "Composer must pre-validate 50MB file size limit");
    assert.ok(composerContent.includes("file.type.startsWith"), "Composer must pre-validate image and video formats");
    assert.ok(composerContent.includes("File exceeds maximum upload size limit"), "Composer must map HTTP 413 error to friendly message");
    assert.ok(composerContent.includes("Your session has expired"), "Composer must map HTTP 401 error to login guidance");
  });

  // ── Phase 3A: Reposts & Quote Posts Verification Tests ──
  await t.test("Phase 3A: verifies Repost & Quote component architecture and files exist", () => {
    const repostsDir = path.resolve("src/components/community/reposts");
    assert.ok(fs.existsSync(path.join(repostsDir, "RepostAttribution.jsx")), "RepostAttribution.jsx must exist");
    assert.ok(fs.existsSync(path.join(repostsDir, "RepostMenu.jsx")), "RepostMenu.jsx must exist");
    assert.ok(fs.existsSync(path.join(repostsDir, "QuotedPost.jsx")), "QuotedPost.jsx must exist");
    assert.ok(fs.existsSync(path.join(repostsDir, "QuotePostModal.jsx")), "QuotePostModal.jsx must exist");
  });

  await t.test("Phase 3A: verifies RepostMenu accessibility, keyboard traps, and toggle states", () => {
    const menuContent = fs.readFileSync(path.resolve("src/components/community/reposts/RepostMenu.jsx"), "utf8");
    assert.ok(menuContent.includes('role="menu"'), "RepostMenu must have role='menu'");
    assert.ok(menuContent.includes('role="menuitem"'), "RepostMenu items must have role='menuitem'");
    assert.ok(menuContent.includes("Escape"), "RepostMenu must close on Escape key");
    assert.ok(menuContent.includes("ArrowDown") && menuContent.includes("ArrowUp"), "RepostMenu must support arrow key navigation");
    assert.ok(menuContent.includes("Unrepost") && menuContent.includes("Repost"), "RepostMenu must toggle between Repost and Unrepost");
    assert.ok(menuContent.includes("min-h-[44px]"), "RepostMenu items must meet 44px minimum touch target size");
  });

  await t.test("Phase 3A: verifies QuotedPost graceful fallback for deleted originals and media preview", () => {
    const quotedContent = fs.readFileSync(path.resolve("src/components/community/reposts/QuotedPost.jsx"), "utf8");
    assert.ok(quotedContent.includes("This post is no longer available."), "QuotedPost must display fallback message when original is deleted");
    assert.ok(quotedContent.includes("getCanonicalProfileUrl"), "QuotedPost must route author to canonical profile");
    assert.ok(quotedContent.includes("originalPost.media"), "QuotedPost must support compact media preview");
  });

  await t.test("Phase 3A: verifies QuotePostModal dialog accessibility and commentary constraints", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/reposts/QuotePostModal.jsx"), "utf8");
    assert.ok(modalContent.includes('role="dialog"'), "QuotePostModal must have role='dialog'");
    assert.ok(modalContent.includes('aria-modal="true"'), "QuotePostModal must have aria-modal='true'");
    assert.ok(modalContent.includes("Escape"), "QuotePostModal must dismiss on Escape key");
    assert.ok(modalContent.includes("commentary.trim()"), "QuotePostModal must require non-empty commentary");
    assert.ok(modalContent.includes("5000"), "QuotePostModal must enforce 5000 character limit");
    assert.ok(modalContent.includes("QuotedPost"), "QuotePostModal must embed read-only QuotedPost preview");
  });

  await t.test("Phase 3A: verifies PostActions repost trigger, counter, and modal integration", () => {
    const actionsContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/PostActions.jsx"), "utf8");
    assert.ok(actionsContent.includes('data-testid="post-repost-btn"'), "PostActions must have testid for repost button");
    assert.ok(actionsContent.includes("RepostMenu"), "PostActions must integrate RepostMenu");
    assert.ok(actionsContent.includes("QuotePostModal"), "PostActions must integrate QuotePostModal");
    assert.ok(actionsContent.includes("repostCount"), "PostActions must display repost statistics when greater than 0");
    assert.ok(actionsContent.includes("isReposted"), "PostActions must reflect active repost state");
  });

  await t.test("Phase 3A: verifies PostCard repost layout, deleted original defense, and memoization", () => {
    const cardContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/index.jsx"), "utf8");
    assert.ok(cardContent.includes("RepostAttribution"), "PostCard must render RepostAttribution for reposts");
    assert.ok(cardContent.includes("QuotedPost"), "PostCard must render QuotedPost for quote posts");
    assert.ok(cardContent.includes("Original post unavailable"), "PostCard must render fallback if original repost is deleted");
    assert.ok(cardContent.includes("useRepostPost") && cardContent.includes("useUnrepostPost"), "PostCard must wire repost mutations");
    assert.ok(cardContent.includes("stats?.reposts"), "PostCard memo comparator must track repost stats");
    assert.ok(cardContent.includes("isRepostedByMe"), "PostCard memo comparator must track isRepostedByMe");
  });

  await t.test("Phase 3A: verifies communityApi and useCommunity repost/quote operations", () => {
    const apiContent = fs.readFileSync(path.resolve("src/services/communityApi.js"), "utf8");
    assert.ok(apiContent.includes("repostPost: async"), "communityApi must implement repostPost");
    assert.ok(apiContent.includes("unrepostPost: async"), "communityApi must implement unrepostPost");
    assert.ok(apiContent.includes("quotePost: async"), "communityApi must implement quotePost");

    const hooksContent = fs.readFileSync(path.resolve("src/hooks/useCommunity.js"), "utf8");
    assert.ok(hooksContent.includes("export function useRepostPost"), "useCommunity must export useRepostPost hook");
    assert.ok(hooksContent.includes("export function useUnrepostPost"), "useCommunity must export useUnrepostPost hook");
    assert.ok(hooksContent.includes("export function useQuotePost"), "useCommunity must export useQuotePost hook");
    assert.ok(hooksContent.includes("toggleRepost"), "useRepostPost must implement optimistic cache update");
    assert.ok(hooksContent.includes("toggleUnrepost"), "useUnrepostPost must implement optimistic cache update");
  });

  await t.test("Phase 3A.1: verifies QuotePostModal Tab focus trap implementation", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/reposts/QuotePostModal.jsx"), "utf8");
    assert.ok(modalContent.includes("modalRef"), "QuotePostModal must maintain modalRef");
    assert.ok(modalContent.includes("e.key === 'Tab'"), "QuotePostModal must intercept Tab key");
    assert.ok(modalContent.includes("e.shiftKey"), "QuotePostModal must handle Shift+Tab backward cycling");
    assert.ok(modalContent.includes("firstElement.focus()"), "QuotePostModal must wrap forward to first element");
    assert.ok(modalContent.includes("lastElement.focus()"), "QuotePostModal must wrap backward to last element");
  });

  await t.test("Phase 3A.1: verifies PostCard canonical action mapping contract", () => {
    const cardContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/index.jsx"), "utf8");
    assert.ok(
      cardContent.includes("targetActionPostId = isRepost ? canonicalPostId : postId"),
      "Pure reposts must direct reactions, bookmarks, and comments to canonical original, while quote posts target postId",
    );
    assert.ok(
      cardContent.includes("onOpenComments(displayPost)"),
      "Opening comments on a repost must pass the canonical displayPost",
    );
    assert.ok(
      cardContent.includes("Remove unavailable repost"),
      "Broken reposts with deleted originals must render accessible removal action",
    );
  });

  await t.test("Phase 4.1: verifies CreatePostModal duplicate-submit guard, honest framing, and failure recovery", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/composer/CreatePostModal.jsx"), "utf8");
    assert.ok(modalContent.includes("isPublishingRef"), "CreatePostModal must have isPublishingRef to prevent duplicate publishing");
    assert.ok(modalContent.includes("Adjust & Preview"), "CreatePostModal Step 2 must be labeled Adjust & Preview for honest presentation framing");
    assert.ok(modalContent.includes("Your text draft was saved. Please reselect your media to continue."), "CreatePostModal must notify user regarding media reselection on draft restore");
    assert.ok(modalContent.includes("handlePublish()"), "CreatePostModal failure recovery view must provide a retry action");
    assert.ok(modalContent.includes("Upload failed"), "CreatePostModal must have a dedicated upload failed state");
  });

  await t.test("Phase 4.1: verifies PostMedia touch swipe isolation, adjacent preloading, and carousel controls", () => {
    const mediaContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/PostMedia.jsx"), "utf8");
    assert.ok(mediaContent.includes('data-testid="post-media-container"'), "PostMedia must have testid for post-media-container");
    assert.ok(mediaContent.includes('aria-label="Double tap to like"'), "PostMedia must announce double-tap like accessibility");
    assert.ok(mediaContent.includes('data-testid="carousel-prev-btn"'), "PostMedia must have carousel-prev-btn testid");
    assert.ok(mediaContent.includes('data-testid="carousel-next-btn"'), "PostMedia must have carousel-next-btn testid");
    assert.ok(mediaContent.includes("Math.abs(diffX) > Math.abs(diffY)"), "PostMedia touch handler must distinguish horizontal swipe from vertical scrolling");
    assert.ok(mediaContent.includes("Math.abs(idx - currentIndex) <= 1"), "PostMedia must preload adjacent carousel images");
  });

  await t.test("Phase 4.1: verifies StoryViewer video mute toggle and safe audio controls", () => {
    const storyContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryViewer.jsx"), "utf8");
    assert.ok(storyContent.includes("Volume2") && storyContent.includes("VolumeX"), "StoryViewer must import Volume icons");
    assert.ok(storyContent.includes("isMuted"), "StoryViewer must manage isMuted state");
    assert.ok(storyContent.includes("muted={isMuted}"), "StoryViewer video element must accept muted={isMuted}");
  });

  await t.test("Phase 4.2: verifies upload cancellation, S3 cleanup on discard, and retry caching", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/composer/CreatePostModal.jsx"), "utf8");
    assert.ok(modalContent.includes("abortControllerRef.current?.signal"), "CreatePostModal must pass AbortSignal to uploadMedia");
    assert.ok(modalContent.includes("handleCancelUpload"), "CreatePostModal must implement dedicated handleCancelUpload");
    assert.ok(modalContent.includes('data-testid="cancel-upload-btn"'), "CreatePostModal must have cancel-upload-btn testid");
    assert.ok(modalContent.includes("communityApi.deleteMedia(f.uploadedUrl)"), "CreatePostModal must clean up S3 objects on draft discard");
    assert.ok(modalContent.includes("let mediaUrl = item.uploadedUrl"), "CreatePostModal must avoid re-uploading already uploaded media on retry");
  });

  await t.test("Phase 4.2: verifies communityApi.uploadMedia passes signal and skipDeduplication", () => {
    const apiContent = fs.readFileSync(path.resolve("src/services/communityApi.js"), "utf8");
    assert.ok(apiContent.includes("uploadMedia: async (file, onUploadProgress, signal)"), "communityApi.uploadMedia must accept AbortSignal");
    assert.ok(apiContent.includes("skipDeduplication: true"), "communityApi.uploadMedia must bypass generic deduplication");
    assert.ok(apiContent.includes("deleteMedia: async (url)"), "communityApi must export deleteMedia");
  });

  await t.test("Phase 4.2: verifies useCreatePost handles empty feed cache prepending", () => {
    const hooksContent = fs.readFileSync(path.resolve("src/hooks/useCommunity.js"), "utf8");
    assert.ok(hooksContent.includes("newPages.push({ items: [post], nextCursor: null })"), "useCreatePost must handle empty initial feed pages");
  });

  await t.test("Phase 4.3: verifies draft preservation avoids File object serialization and cleanly notifies user on restore", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/composer/CreatePostModal.jsx"), "utf8");
    assert.ok(modalContent.includes("hasMedia: files.length > 0"), "Draft storage must only record boolean flag for media, never File objects");
    assert.ok(!modalContent.includes("files: files"), "Raw File objects must never be written to draft storage");
    assert.ok(modalContent.includes("Your text draft was saved. Please reselect your media to continue."), "User must be informed to reselect media upon draft restore");
  });

  await t.test("Phase 4.3: verifies query key isolation across feed filters, saved posts, and post details", () => {
    const hooksContent = fs.readFileSync(path.resolve("src/hooks/useCommunity.js"), "utf8");
    assert.ok(hooksContent.includes("['community', 'feed', { filter }]"), "Feed filter must have isolated query key");
    assert.ok(hooksContent.includes("['community', 'saved']"), "Saved posts must have dedicated query key");
    assert.ok(hooksContent.includes("['community', 'stories']"), "Stories must have dedicated query key");
  });

  await t.test("Phase 4.3: verifies client-side upload size and extension pre-validation constraints", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/composer/CreatePostModal.jsx"), "utf8");
    assert.ok(modalContent.includes("file.size > 50 * 1024 * 1024"), "CreatePostModal must enforce 50MB file size limit");
    assert.ok(modalContent.includes("['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'mov', 'webm', 'pdf']"), "CreatePostModal must validate allowed extensions");
  });

  await t.test("Phase 4.4: verifies CreatePostModal generates idempotencyKey once per publish attempt, preserves on retry, and clears on success", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/composer/CreatePostModal.jsx"), "utf8");
    assert.ok(modalContent.includes("const idempotencyKeyRef = useRef(null);"), "CreatePostModal must define idempotencyKeyRef");
    assert.ok(modalContent.includes("if (!idempotencyKeyRef.current)"), "CreatePostModal must check if idempotencyKey already exists before generating");
    assert.ok(modalContent.includes("idempotencyKey: idempotencyKeyRef.current"), "CreatePostModal must pass idempotencyKey to mutation");
    assert.ok(modalContent.includes("idempotencyKeyRef.current = null;"), "CreatePostModal must reset key on success and discard");
  });

  await t.test("Phase 4.4: verifies CreateStoryModal generates idempotencyKey once per attempt, preserves on retry, and clears on close/success", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/stories/CreateStoryModal.jsx"), "utf8");
    assert.ok(modalContent.includes("const idempotencyKeyRef = useRef(null);"), "CreateStoryModal must define idempotencyKeyRef");
    assert.ok(modalContent.includes("if (!idempotencyKeyRef.current)"), "CreateStoryModal must generate key only if not already present");
    assert.ok(modalContent.includes("idempotencyKey: idempotencyKeyRef.current"), "CreateStoryModal must pass key to createStoryMutation");
    assert.ok(modalContent.includes("idempotencyKeyRef.current = null;"), "CreateStoryModal must clear key on success and close");
  });

  await t.test("Phase 4.4: verifies communityApi forwards Idempotency-Key header on createPost and createStory", () => {
    const apiContent = fs.readFileSync(path.resolve("src/services/communityApi.js"), "utf8");
    assert.ok(apiContent.includes("config.headers = { 'Idempotency-Key': idempotencyKey };"), "communityApi must attach Idempotency-Key header");
  });

  // ── Phase 1 Instagram-Level Feed Core Verification Tests ──
  await t.test("Phase 1: verifies PostCardSkeleton exists with matching geometry", () => {
    const skeletonFile = path.resolve("src/components/community/feed/PostCard/PostCardSkeleton.jsx");
    assert.ok(fs.existsSync(skeletonFile), "PostCardSkeleton.jsx must exist");
    const content = fs.readFileSync(skeletonFile, "utf8");
    assert.ok(content.includes("aspect-video"), "PostCardSkeleton must include media aspect ratio placeholder");
    assert.ok(content.includes("shimmer"), "PostCardSkeleton must use design-system shimmer");
  });

  await t.test("Phase 1: verifies PostMedia desktop double-click to like and graceful retry recovery", () => {
    const mediaContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/PostMedia.jsx"), "utf8");
    assert.ok(mediaContent.includes("onDoubleClick={handleDoubleClick}"), "PostMedia must support desktop double-click to like");
    assert.ok(mediaContent.includes("Media couldn't be loaded."), "PostMedia must display graceful media error message");
    assert.ok(mediaContent.includes("handleRetryMedia"), "PostMedia must support inline retry recovery on failed media");
  });

  await t.test("Phase 1: verifies PostMedia video memory safety and decoder disposal on unmount", () => {
    const mediaContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/PostMedia.jsx"), "utf8");
    assert.ok(mediaContent.includes("observer.disconnect()"), "PostMedia must disconnect IntersectionObserver on unmount");
    assert.ok(mediaContent.includes("vid.pause()"), "PostMedia must pause videos on unmount cleanup");
  });

  await t.test("Phase 1: verifies CommunityHome post deduplication and next-page error recovery", () => {
    const homeContent = fs.readFileSync(path.resolve("src/pages/community/CommunityHome.jsx"), "utf8");
    assert.ok(homeContent.includes("PostCardSkeleton"), "CommunityHome must render PostCardSkeleton on initial load and pagination");
    assert.ok(homeContent.includes("seen.has(id)"), "CommunityHome must deduplicate posts across feed pages");
    assert.ok(homeContent.includes("rootMargin: '250px'"), "CommunityHome must prefetch next page before bottom sentinel");
    assert.ok(homeContent.includes("isFetchNextPageError"), "CommunityHome must track next-page error state");
    assert.ok(homeContent.includes("Couldn't load more posts."), "CommunityHome must display inline retry state for next-page error");
  });

  await t.test("Phase 1: verifies useCreateComment and useDeleteComment optimistic feed synchronization", () => {
    const hooksContent = fs.readFileSync(path.resolve("src/hooks/useCommunity.js"), "utf8");
    assert.ok(hooksContent.includes("queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, incrementComment)"), "useCreateComment must increment feed post comment count optimistically");
    assert.ok(hooksContent.includes("queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, decrementComment)"), "useDeleteComment must decrement feed post comment count optimistically");
    assert.ok(hooksContent.includes("isOptimistic: true"), "useCreateComment must mark optimistic comment preview");
  });

  await t.test("Phase 1: verifies ReactionBar keyboard arrow navigation accessibility", () => {
    const reactionContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/ReactionBar.jsx"), "utf8");
    assert.ok(reactionContent.includes("handleTriggerKeyDown"), "ReactionBar must handle keyboard trigger navigation");
    assert.ok(reactionContent.includes("handlePickerKeyDown"), "ReactionBar must handle picker arrow navigation");
  });

  // ── Phase 2 Instagram-Level Stories Experience Verification Tests ──
  await t.test("Phase 2: verifies StoryRail desktop scroll chevrons and momentum touch container", () => {
    const railContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryRail.jsx"), "utf8");
    assert.ok(railContent.includes("canScrollLeft"), "StoryRail must track canScrollLeft for desktop navigation");
    assert.ok(railContent.includes("canScrollRight"), "StoryRail must track canScrollRight for desktop navigation");
    assert.ok(railContent.includes("scrollBy"), "StoryRail must support programmatic chevron scrolling");
    assert.ok(railContent.includes("overflow-x-auto"), "StoryRail must use smooth horizontal scroll container");
  });

  await t.test("Phase 2: verifies StoryViewer hold-to-pause suppression and downward swipe dismissal", () => {
    const viewerContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryViewer.jsx"), "utf8");
    assert.ok(viewerContent.includes("holdTimerRef"), "StoryViewer must use hold timer for press-and-hold pause");
    assert.ok(viewerContent.includes("isHoldRef.current = true"), "StoryViewer must set isHoldRef on hold duration threshold");
    assert.ok(viewerContent.includes("dragY"), "StoryViewer must track dragY for downward swipe dismissal");
    assert.ok(viewerContent.includes("handleTouchMove"), "StoryViewer must handle touch move gestures");
  });

  await t.test("Phase 2: verifies StoryViewer video progress tracking and adjacent preloading", () => {
    const viewerContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryViewer.jsx"), "utf8");
    assert.ok(viewerContent.includes("videoRef.current.currentTime / videoRef.current.duration"), "StoryViewer video progress must track actual video playback");
    assert.ok(viewerContent.includes("img.src = nextUrl"), "StoryViewer must preload next story image");
  });

  await t.test("Phase 2: verifies StoryViewer quick reactions and communityApi reaction integration", () => {
    const viewerContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryViewer.jsx"), "utf8");
    assert.ok(viewerContent.includes("QUICK_REACTIONS"), "StoryViewer must define quick reactions");
    assert.ok(viewerContent.includes("handleQuickReaction"), "StoryViewer must provide handleQuickReaction handler");

    const apiContent = fs.readFileSync(path.resolve("src/services/communityApi.js"), "utf8");
    assert.ok(apiContent.includes("reactToStory"), "communityApi must implement reactToStory endpoint");

    const hooksContent = fs.readFileSync(path.resolve("src/hooks/useCommunity.js"), "utf8");
    assert.ok(hooksContent.includes("useReactToStory"), "useCommunity must export useReactToStory mutation hook");
  });

  await t.test("Phase 2: verifies StoryViewer media error recovery and memory cleanup", () => {
    const viewerContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryViewer.jsx"), "utf8");
    assert.ok(viewerContent.includes("handleRetryMedia"), "StoryViewer must provide retry handler for media failure");
    assert.ok(viewerContent.includes("Story couldn't be loaded."), "StoryViewer must show user-friendly error fallback");
    assert.ok(viewerContent.includes("vid.removeAttribute('src')"), "StoryViewer must release video src decoder memory on unmount");
    assert.ok(viewerContent.includes("vid.load()"), "StoryViewer must invoke load() to clear native video buffers");
  });

  await t.test("Phase 2: verifies useViewStory optimistic cache update", () => {
    const hooksContent = fs.readFileSync(path.resolve("src/hooks/useCommunity.js"), "utf8");
    assert.ok(hooksContent.includes("onMutate: async (storyId)"), "useViewStory must have optimistic onMutate handler");
    assert.ok(hooksContent.includes("isViewed: true"), "useViewStory must mark story viewed optimistically");
  });

  // ── Phase 3 Instagram-Level Story Creation / Editor Verification Tests ──
  await t.test("Phase 3: verifies StoryRail Add Story entry affordance and 44x44 touch targets", () => {
    const railContent = fs.readFileSync(path.resolve("src/components/community/stories/StoryRail.jsx"), "utf8");
    assert.ok(railContent.includes("onAddStory"), "StoryRail must provide onAddStory trigger");
    assert.ok(railContent.includes("after:min-w-[44px] after:min-h-[44px]"), "StoryRail add button must ensure 44x44 minimum touch target");
  });

  await t.test("Phase 3: verifies CreateStoryModal media constraints (8MB image, 1GB video, 90s duration)", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/stories/CreateStoryModal.jsx"), "utf8");
    assert.ok(modalContent.includes("8 * 1024 * 1024"), "CreateStoryModal must enforce 8MB image limit");
    assert.ok(modalContent.includes("1024 * 1024 * 1024"), "CreateStoryModal must enforce 1GB video limit");
    assert.ok(modalContent.includes("MAX_VIDEO_DURATION_SECONDS = 90"), "CreateStoryModal must define 90s video duration limit");
    assert.ok(modalContent.includes("tempVideo.duration > MAX_VIDEO_DURATION_SECONDS"), "CreateStoryModal must check video duration via metadata");
  });

  await t.test("Phase 3: verifies CreateStoryModal duplicate submission guard, retry recovery, and upload cancellation", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/stories/CreateStoryModal.jsx"), "utf8");
    assert.ok(modalContent.includes("isSubmittingRef.current = true"), "CreateStoryModal must guard against duplicate submissions");
    assert.ok(modalContent.includes("abortControllerRef.current.abort()"), "CreateStoryModal must support aborting in-flight uploads");
    assert.ok(modalContent.includes("setState('failed')"), "CreateStoryModal must transition to failed state on error");
    assert.ok(modalContent.includes("Retry Publishing") || modalContent.includes("Retry Upload"), "CreateStoryModal must offer retry options on failure");
  });

  await t.test("Phase 3: verifies CreateStoryModal draft protection and object URL memory cleanup", () => {
    const modalContent = fs.readFileSync(path.resolve("src/components/community/stories/CreateStoryModal.jsx"), "utf8");
    assert.ok(modalContent.includes("hasUnsavedEdits"), "CreateStoryModal must detect unsaved edits");
    assert.ok(modalContent.includes("StoryDiscardDialog"), "CreateStoryModal must mount StoryDiscardDialog for draft safety");
    assert.ok(modalContent.includes("URL.revokeObjectURL(previewUrl)"), "CreateStoryModal must revoke object URLs on cleanup");
  });

  await t.test("Phase 3: verifies StoryEditor subcomponents and rasterization engine exist", () => {
    const editorDir = path.resolve("src/components/community/stories/editor");
    assert.ok(fs.existsSync(path.join(editorDir, "rasterizeStory.js")), "rasterizeStory.js must exist");
    assert.ok(fs.existsSync(path.join(editorDir, "StoryEditorCanvas.jsx")), "StoryEditorCanvas.jsx must exist");
    assert.ok(fs.existsSync(path.join(editorDir, "StoryEditorToolbar.jsx")), "StoryEditorToolbar.jsx must exist");
    assert.ok(fs.existsSync(path.join(editorDir, "StoryDrawingControls.jsx")), "StoryDrawingControls.jsx must exist");
    assert.ok(fs.existsSync(path.join(editorDir, "StoryTextEditorModal.jsx")), "StoryTextEditorModal.jsx must exist");
    assert.ok(fs.existsSync(path.join(editorDir, "StoryStickerPicker.jsx")), "StoryStickerPicker.jsx must exist");
    assert.ok(fs.existsSync(path.join(editorDir, "StoryFilterPicker.jsx")), "StoryFilterPicker.jsx must exist");
    assert.ok(fs.existsSync(path.join(editorDir, "StoryDiscardDialog.jsx")), "StoryDiscardDialog.jsx must exist");

    const rasterizeContent = fs.readFileSync(path.join(editorDir, "rasterizeStory.js"), "utf8");
    assert.ok(rasterizeContent.includes("targetWidth = 1080"), "rasterizeStory must use 1080p 9:16 target canvas");
    assert.ok(rasterizeContent.includes("canvas.toBlob"), "rasterizeStory must export canvas to Blob");
  });

  await t.test("Phase 3: verifies useCreateStory invalidates and updates stories cache", () => {
    const hooksContent = fs.readFileSync(path.resolve("src/hooks/useCommunity.js"), "utf8");
    assert.ok(hooksContent.includes("queryClient.invalidateQueries({ queryKey: ['community', 'stories'] })"), "useCreateStory must invalidate stories query on success");
  });

  // ══════════════════════════════════════════════════
  // PHASE 4 — DISCOVERY + EXPLORE + SEARCH + SOCIAL INTERACTION
  // ══════════════════════════════════════════════════

  await t.test("Phase 4: validates normalizeFeedFilter supports trending and saved feeds with safe fallback", () => {
    assert.equal(normalizeFeedFilter("all"), "all");
    assert.equal(normalizeFeedFilter("following"), "following");
    assert.equal(normalizeFeedFilter("cohort"), "cohort");
    assert.equal(normalizeFeedFilter("trending"), "trending");
    assert.equal(normalizeFeedFilter("saved"), "saved");
    assert.equal(normalizeFeedFilter("TRENDING"), "trending");
    assert.equal(normalizeFeedFilter("unknown_filter"), "all");
    assert.equal(normalizeFeedFilter(null), "all");
    assert.equal(normalizeFeedFilter(undefined), "all");
  });

  await t.test("Phase 4: verifies communityApi searchCommunity endpoint and AbortSignal support", () => {
    const apiContent = fs.readFileSync(path.resolve("src/services/communityApi.js"), "utf8");
    assert.ok(apiContent.includes("searchCommunity: async"), "communityApi must implement searchCommunity method");
    assert.ok(apiContent.includes("/community/posts/search"), "searchCommunity must query /community/posts/search");
    assert.ok(apiContent.includes("signal,"), "searchCommunity must pass AbortSignal for stale request cancellation");
    assert.ok(apiContent.includes("search,"), "communityApi.getFeed must accept search parameter");
    assert.ok(apiContent.includes("tag,"), "communityApi.getFeed must accept tag parameter");
  });

  await t.test("Phase 4: verifies useCommunitySearch hook configuration and query isolation", () => {
    const hooksContent = fs.readFileSync(path.resolve("src/hooks/useCommunity.js"), "utf8");
    assert.ok(hooksContent.includes("export function useCommunitySearch"), "useCommunity must export useCommunitySearch");
    assert.ok(hooksContent.includes("['community', 'search', { query: cleanQ, type }]"), "useCommunitySearch must isolate query cache by query and type");
    assert.ok(hooksContent.includes("cleanQ.length >= 2"), "useCommunitySearch must enforce min 2 character query length");
  });

  await t.test("Phase 4: verifies CommunitySearchModal architecture, debouncing, recent searches, and accessibility", () => {
    const searchModalPath = path.resolve("src/components/community/discovery/CommunitySearchModal.jsx");
    assert.ok(fs.existsSync(searchModalPath), "CommunitySearchModal.jsx must exist");
    const modalContent = fs.readFileSync(searchModalPath, "utf8");

    // Debouncing & stale request cancellation
    assert.ok(modalContent.includes("300"), "CommunitySearchModal must debounce input with 300ms window");
    assert.ok(modalContent.includes("debounceTimerRef"), "CommunitySearchModal must use ref-based debounce timer");

    // Recent searches localStorage engine
    assert.ok(modalContent.includes("zeitnah_recent_community_searches"), "CommunitySearchModal must key recent searches appropriately");
    assert.ok(modalContent.includes("MAX_RECENT_SEARCHES = 6"), "CommunitySearchModal must cap recent searches at 6 entries");
    assert.ok(modalContent.includes("removeRecentSearch"), "CommunitySearchModal must support removing individual recent searches");
    assert.ok(modalContent.includes("clearRecentSearches"), "CommunitySearchModal must support clearing all recent search history");

    // Accessibility and keyboard navigation
    assert.ok(modalContent.includes('role="dialog"'), "CommunitySearchModal must implement dialog role");
    assert.ok(modalContent.includes('aria-modal="true"'), "CommunitySearchModal must implement aria-modal");
    assert.ok(modalContent.includes("e.key === 'Escape'"), "CommunitySearchModal must dismiss on Escape key");
    assert.ok(modalContent.includes("min-h-[46px]") || modalContent.includes("min-h-[44px]"), "CommunitySearchModal must guarantee minimum 44px touch targets");

    // Category Tabs
    assert.ok(modalContent.includes("'all'"), "CommunitySearchModal must include All category tab");
    assert.ok(modalContent.includes("'posts'"), "CommunitySearchModal must include Posts category tab");
    assert.ok(modalContent.includes("'people'"), "CommunitySearchModal must include People category tab");
    assert.ok(modalContent.includes("'topics'"), "CommunitySearchModal must include Topics category tab");
  });

  await t.test("Phase 4: verifies PeopleCard canonical profile routing, avatar, role, and optimistic connection action", () => {
    const peopleCardPath = path.resolve("src/components/community/discovery/PeopleCard.jsx");
    assert.ok(fs.existsSync(peopleCardPath), "PeopleCard.jsx must exist");
    const cardContent = fs.readFileSync(peopleCardPath, "utf8");

    assert.ok(cardContent.includes("getCanonicalProfileUrl"), "PeopleCard must route through canonical profile URLs");
    assert.ok(cardContent.includes("networkApi.sendConnectionRequest"), "PeopleCard must dispatch connection request via networkApi");
    assert.ok(cardContent.includes("setConnectionStatus('outgoing_pending')"), "PeopleCard must optimistically transition to pending state");
    assert.ok(cardContent.includes("setConnectionStatus('none')"), "PeopleCard must roll back connection status on mutation failure");
    assert.ok(cardContent.includes("min-h-[36px]") || cardContent.includes("min-h-[44px]"), "PeopleCard must ensure touch-friendly button targets");
  });

  await t.test("Phase 4: verifies DiscoverySidebar desktop search trigger, trending discussions toggle, and real peer discovery", () => {
    const sidebarContent = fs.readFileSync(path.resolve("src/components/community/discovery/DiscoverySidebar.jsx"), "utf8");
    assert.ok(sidebarContent.includes("onOpenSearch"), "DiscoverySidebar must expose search trigger");
    assert.ok(sidebarContent.includes("Trending Discussions"), "DiscoverySidebar must provide Trending Discussions shortcut");
    assert.ok(sidebarContent.includes("/community?feed=trending"), "Trending Discussions shortcut must route to trending feed");
    assert.ok(sidebarContent.includes("networkApi.getPeople"), "DiscoverySidebar must fetch real verified peers via networkApi");
    assert.ok(sidebarContent.includes("<PeopleCard"), "DiscoverySidebar must render PeopleCard for discovered peers");
  });

  await t.test("Phase 4: verifies MobileDiscoveryDrawer mobile search trigger, trending shortcut, and real peer discovery", () => {
    const drawerContent = fs.readFileSync(path.resolve("src/components/community/discovery/MobileDiscoveryDrawer.jsx"), "utf8");
    assert.ok(drawerContent.includes("onOpenSearch"), "MobileDiscoveryDrawer must expose search trigger");
    assert.ok(drawerContent.includes("Trending Discussions"), "MobileDiscoveryDrawer must provide Trending Discussions toggle");
    assert.ok(drawerContent.includes("networkApi.getPeople"), "MobileDiscoveryDrawer must fetch real peers via networkApi");
    assert.ok(drawerContent.includes("PeopleCard"), "MobileDiscoveryDrawer must render PeopleCard");
    assert.ok(drawerContent.includes("min-h-[44px]"), "MobileDiscoveryDrawer must ensure >=44x44 touch targets");
  });

  await t.test("Phase 4: verifies CommunityHeader accessible search trigger across all viewports", () => {
    const headerContent = fs.readFileSync(path.resolve("src/components/community/header/CommunityHeader.jsx"), "utf8");
    assert.ok(headerContent.includes("onOpenSearch"), "CommunityHeader must invoke onOpenSearch");
    assert.ok(headerContent.includes("min-w-[40px]"), "CommunityHeader search button must provide touch-accessible target");
  });

  await t.test("Phase 4: verifies CommunityHome mounts CommunitySearchModal, global ⌘K shortcut, topic filtering, and trending empty state", () => {
    const homeContent = fs.readFileSync(path.resolve("src/pages/community/CommunityHome.jsx"), "utf8");
    assert.ok(homeContent.includes("<CommunitySearchModal"), "CommunityHome must mount CommunitySearchModal");
    assert.ok(homeContent.includes("isSearchOpen"), "CommunityHome must maintain isSearchOpen state");
    assert.ok(homeContent.includes("e.key.toLowerCase() === 'k'"), "CommunityHome must bind global ⌘K / Ctrl+K keyboard shortcut");
    assert.ok(homeContent.includes("Filtering by topic:"), "CommunityHome must display dedicated Active Topic filter banner");
    assert.ok(homeContent.includes("No trending discussions yet"), "CommunityHome must define intentional trending feed empty state");
    assert.ok(homeContent.includes("<StoryRail"), "CommunityHome must strictly preserve StoryRail");
    assert.ok(homeContent.includes("<CommentDrawer"), "CommunityHome must strictly preserve single CommentDrawer orchestration");
  });

  await t.test("Phase 4: verifies PostActions social interaction polish (Web Share API, clipboard fallback, optimistic bookmark)", () => {
    const postActionsContent = fs.readFileSync(path.resolve("src/components/community/feed/PostCard/PostActions.jsx"), "utf8");
    assert.ok(postActionsContent.includes("navigator.share"), "PostActions must use Web Share API when available");
    assert.ok(postActionsContent.includes("navigator.clipboard.writeText"), "PostActions must fallback to clipboard writeText");
    assert.ok(postActionsContent.includes("toast.success('Link copied')"), "PostActions must notify user with 'Link copied' toast");
    assert.ok(postActionsContent.includes("onToggleBookmark"), "PostActions must support bookmark toggle");
    assert.ok(postActionsContent.includes("min-h-[44px]"), "PostActions buttons must have 44px minimum touch targets");
  });
});



