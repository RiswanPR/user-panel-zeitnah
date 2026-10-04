import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

test("Community Phase 5 — Motion, Performance, Accessibility & UX Polish", async (t) => {
  const currentDir = process.cwd();
  const srcDir = path.join(currentDir, "src");

  await t.test("Phase 5: verifies code splitting and lazyWithRetry overlay imports in CommunityHome", () => {
    const communityHomeFile = path.join(srcDir, "pages", "community", "CommunityHome.jsx");
    const content = fs.readFileSync(communityHomeFile, "utf-8");

    // Must import lazyWithRetry and Suspense
    assert.ok(content.includes("lazyWithRetry"), "CommunityHome must import lazyWithRetry");
    assert.ok(content.includes("Suspense"), "CommunityHome must import Suspense");

    // Heavy overlays must be lazy-loaded
    assert.ok(
      content.includes("const StoryViewer = lazyWithRetry("),
      "StoryViewer must be lazily imported"
    );
    assert.ok(
      content.includes("const CreateStoryModal = lazyWithRetry("),
      "CreateStoryModal must be lazily imported"
    );
    assert.ok(
      content.includes("const CreatePostModal = lazyWithRetry("),
      "CreatePostModal must be lazily imported"
    );
    assert.ok(
      content.includes("const CommunitySearchModal = lazyWithRetry("),
      "CommunitySearchModal must be lazily imported"
    );
    assert.ok(
      content.includes("const MobileDiscoveryDrawer = lazyWithRetry("),
      "MobileDiscoveryDrawer must be lazily imported"
    );

    // Overlays must be wrapped in Suspense fallback={null}
    assert.ok(
      content.includes("<Suspense fallback={null}>"),
      "Lazy overlays must be enclosed inside <Suspense fallback={null}>"
    );
  });

  await t.test("Phase 5: verifies feed and PostCard rendering stability and reduced motion compliance", () => {
    const postCardFile = path.join(srcDir, "components", "community", "feed", "PostCard", "index.jsx");
    const content = fs.readFileSync(postCardFile, "utf-8");

    // Must use useReducedMotion
    assert.ok(
      content.includes("useReducedMotion"),
      "PostCard must import and respect useReducedMotion"
    );

    // Must NOT have layout prop on motion.article (prevents CLS and forced reflow during feed scrolling)
    assert.ok(
      !content.includes("<motion.article\n      layout"),
      "PostCard must not have layout prop on motion.article"
    );
    assert.ok(
      !content.includes("<motion.article layout"),
      "PostCard must not have layout prop on motion.article"
    );

    // Must memoize handlers with useCallback
    assert.ok(
      content.includes("const handleToggleComments = useCallback("),
      "handleToggleComments must be memoized with useCallback"
    );
    assert.ok(
      content.includes("const handleReact = useCallback("),
      "handleReact must be memoized with useCallback"
    );
    assert.ok(
      content.includes("const handleToggleBookmark = useCallback("),
      "handleToggleBookmark must be memoized with useCallback"
    );
    assert.ok(
      content.includes("const handleToggleRepost = useCallback("),
      "handleToggleRepost must be memoized with useCallback"
    );
  });

  await t.test("Phase 5: verifies ReactionBar reduced motion, spring tuning, and touch timer cleanup", () => {
    const reactionBarFile = path.join(srcDir, "components", "community", "feed", "PostCard", "ReactionBar.jsx");
    const content = fs.readFileSync(reactionBarFile, "utf-8");

    // Must import and use useReducedMotion
    assert.ok(
      content.includes("useReducedMotion"),
      "ReactionBar must import and use useReducedMotion"
    );

    // Must cleanup touchTimerRef on unmount
    assert.ok(
      content.includes("touchTimerRef.current = null"),
      "ReactionBar must cleanup touchTimerRef"
    );

    // Must include motion-reduce:transform-none or motion-reduce:hover:scale-100
    assert.ok(
      content.includes("motion-reduce:hover:scale-100"),
      "Reaction buttons must disable hover scale expansion under reduced motion"
    );
  });

  await t.test("Phase 5: verifies PostActions micro-interaction timings and touch target accessibility", () => {
    const postActionsFile = path.join(srcDir, "components", "community", "feed", "PostCard", "PostActions.jsx");
    const content = fs.readFileSync(postActionsFile, "utf-8");

    // Minimum touch targets (44x44px)
    assert.ok(
      content.includes("min-h-[44px] min-w-[44px]"),
      "Buttons in PostActions must enforce 44x44px minimum touch targets"
    );

    // Micro-interaction duration 150ms
    assert.ok(
      content.includes("duration-150"),
      "Buttons in PostActions must use responsive micro-interaction duration (150ms)"
    );

    // Reduced motion safety
    assert.ok(
      content.includes("motion-reduce:transform-none"),
      "Buttons in PostActions must respect motion-reduce:transform-none"
    );
  });

  await t.test("Phase 5: verifies media asynchronous decoding and video playback cleanup", () => {
    const postMediaFile = path.join(srcDir, "components", "community", "feed", "PostCard", "PostMedia.jsx");
    const content = fs.readFileSync(postMediaFile, "utf-8");

    // Asynchronous image decode and lazy loading
    assert.ok(content.includes('decoding="async"'), "PostMedia must use decoding='async' on images");
    assert.ok(content.includes('loading="lazy"'), "PostMedia must use loading='lazy' on images");

    // Video IntersectionObserver cleanup and pause
    assert.ok(
      content.includes("observer.disconnect()"),
      "PostMedia must disconnect IntersectionObserver on unmount"
    );
    assert.ok(
      content.includes("vid.pause()"),
      "PostMedia must pause active videos and clean up media resources"
    );

    // PeopleCard avatar image decoding
    const peopleCardFile = path.join(srcDir, "components", "community", "discovery", "PeopleCard.jsx");
    const peopleCardContent = fs.readFileSync(peopleCardFile, "utf-8");
    assert.ok(
      peopleCardContent.includes('decoding="async"'),
      "PeopleCard must specify decoding='async' on avatar images"
    );
  });

  await t.test("Phase 5: verifies StoryViewer memory leak audit, timer clearing, and frame cancellation", () => {
    const storyViewerFile = path.join(srcDir, "components", "community", "stories", "StoryViewer.jsx");
    const content = fs.readFileSync(storyViewerFile, "utf-8");

    // Hold timer and animation frame cleanup on unmount
    assert.ok(
      content.includes("clearTimeout(holdTimerRef.current)"),
      "StoryViewer must clear holdTimerRef on unmount"
    );
    assert.ok(
      content.includes("cancelAnimationFrame(animationRef.current)"),
      "StoryViewer must cancel animationRef on unmount"
    );

    // Video element decoder release
    assert.ok(
      content.includes("vid.removeAttribute('src')"),
      "StoryViewer must remove video src on close"
    );
    assert.ok(
      content.includes("vid.load()"),
      "StoryViewer must invoke vid.load() to flush media buffer"
    );
  });

  await t.test("Phase 5: verifies query cancellation isolation and shared peer cache in useCommunity", () => {
    const useCommunityFile = path.join(srcDir, "hooks", "useCommunity.js");
    const content = fs.readFileSync(useCommunityFile, "utf-8");

    // useSuggestedPeople must be exported with 5-minute staleTime
    assert.ok(
      content.includes("export function useSuggestedPeople("),
      "useCommunity must export useSuggestedPeople"
    );
    assert.ok(
      content.includes("staleTime: 1000 * 60 * 5"),
      "useSuggestedPeople must specify 5 minute staleTime"
    );

    // cancelQueries must be scoped to ['community', 'feed'] and ['community', 'saved']
    assert.ok(
      content.includes("queryClient.cancelQueries({ queryKey: ['community', 'feed'] })"),
      "Mutations must specifically cancel community feed queries"
    );
    assert.ok(
      content.includes("queryClient.cancelQueries({ queryKey: ['community', 'saved'] })"),
      "Mutations must specifically cancel saved posts queries"
    );

    // Broad cancelQueries({ queryKey: ['community'] }) must NOT exist in useCommunity.js
    assert.ok(
      !content.includes("queryClient.cancelQueries({ queryKey: ['community'] })"),
      "Broad cancelQueries on all community queries must be replaced with scoped cancellations"
    );
  });

  await t.test("Phase 5: verifies DiscoverySidebar and MobileDiscoveryDrawer share useSuggestedPeople cache", () => {
    const sidebarFile = path.join(srcDir, "components", "community", "discovery", "DiscoverySidebar.jsx");
    const sidebarContent = fs.readFileSync(sidebarFile, "utf-8");
    assert.ok(
      sidebarContent.includes("useSuggestedPeople"),
      "DiscoverySidebar must use useSuggestedPeople"
    );

    const drawerFile = path.join(srcDir, "components", "community", "discovery", "MobileDiscoveryDrawer.jsx");
    const drawerContent = fs.readFileSync(drawerFile, "utf-8");
    assert.ok(
      drawerContent.includes("useSuggestedPeople"),
      "MobileDiscoveryDrawer must use useSuggestedPeople"
    );
  });
});
