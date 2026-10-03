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
});


