import { useState, useEffect, useCallback, useContext, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PostCard from '../../components/community/PostCard';
import StoryRail from '../../components/community/stories/StoryRail';
import CommunityHeader from '../../components/community/header/CommunityHeader';
import DiscoverySidebar from '../../components/community/discovery/DiscoverySidebar';
import EmptyState from '../../components/ui/EmptyState';
import PostCardSkeleton from '../../components/community/feed/PostCard/PostCardSkeleton';
import { useCommunityFeed, useActiveStories } from '../../hooks/useCommunity';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { AuthContext } from '../../context/AuthContext';
import { useActiveProfile } from '../../context/ActiveProfileContext';
import CompanyFeedHeader from '../../components/community/header/CompanyFeedHeader';
import FeedFilterTabs from '../../components/community/feed/FeedFilterTabs';
import lazyWithRetry from '../../utils/lazyWithRetry';

// Code-split heavy modals and drawers to keep initial CommunityHome bundle lean
const StoryViewer = lazyWithRetry(() => import('../../components/community/stories/StoryViewer'));
const CreateStoryModal = lazyWithRetry(() => import('../../components/community/stories/CreateStoryModal'));
const CreatePostModal = lazyWithRetry(() => import('../../components/community/composer/CreatePostModal'));
const CreateActionModal = lazyWithRetry(() => import('../../components/community/composer/CreateActionModal'));
const ReelStudioModal = lazyWithRetry(() => import('../../components/community/composer/ReelStudioModal'));
const CommentDrawer = lazyWithRetry(() => import('../../components/community/comments/CommentDrawer'));
const CommunitySearchModal = lazyWithRetry(() => import('../../components/community/discovery/CommunitySearchModal'));
const MobileDiscoveryDrawer = lazyWithRetry(() => import('../../components/community/discovery/MobileDiscoveryDrawer'));
const ReelsViewer = lazyWithRetry(() => import('../../components/community/reels/ReelsViewer'));
const CreatorInsightsModal = lazyWithRetry(() => import('../../components/community/creator/CreatorInsightsModal'));
import CommunityComposerEntry from '../../components/community/composer/CommunityComposerEntry';
import {
  normalizeFeedFilter,
  extractTrendingTopics,
  sanitizeTag,
} from '../../utils/communityFormatters';
import { groupStoriesByUser } from '../../utils/storyGrouping';
import { Sparkles, Users, GraduationCap, Globe, AlertCircle, Flame, Building2 } from 'lucide-react';
import BrandAmbientShape from '../../components/community/ui/BrandAmbientShape';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';

/**
 * CommunityHome — Phase 2D Discovery & Feed Intelligence UX
 *
 * Features:
 * - URL-driven feed filter state (/community?feed=all|following|cohort)
 * - Isolated TanStack Query cache per filter
 * - Dedicated empty states per filter (All, Following, Cohort)
 * - Deterministic trending topics extracted from real posts without fake metrics
 * - Desktop Discovery sidebar (>=1280px) and Mobile Discovery Drawer (<1280px)
 * - Seamless integration with platform QuickSearch (⌘K)
 * - Preserved single CommentDrawer & StoryRail orchestration
 */
export default function CommunityHome({ initialCreateMode } = {}) {
  const { user } = useContext(AuthContext);
  const {
    activeProfileType,
    activeBusinessId,
    business,
    businesses,
    isBusinessMode,
  } = useActiveProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL Feed Filter State ──
  const activeFilter = normalizeFeedFilter(searchParams.get('feed'));

  // ── Notification Deep-Link & Organization Target Parameters ──
  const targetPostId = useMemo(() => {
    const paramPost = searchParams.get('post') || searchParams.get('postId');
    if (paramPost) return String(paramPost).trim();
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace(/^#/, '').trim();
      if (hash && !hash.includes('/')) return hash;
    }
    return null;
  }, [searchParams]);

  const shouldOpenComments = useMemo(() => {
    return (
      searchParams.get('openComments') === 'true' ||
      searchParams.get('comments') === 'true' ||
      searchParams.get('comments') === '1'
    );
  }, [searchParams]);

  const urlOrgId = searchParams.get('organizationId') || null;

  // ── Modals & Overlays State ──
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(null);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [isMobileDiscoveryOpen, setIsMobileDiscoveryOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeReelPostId, setActiveReelPostId] = useState(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const currentUserId = user?._id || user?.id || user?.userId;

  // ── Fetch Stories & Group (1 User = 1 Icon) ──
  const { data: storiesData, isLoading: storiesLoading } = useActiveStories();
  const stories = useMemo(() => {
    if (Array.isArray(storiesData)) return storiesData;
    if (Array.isArray(storiesData?.stories)) return storiesData.stories;
    if (Array.isArray(storiesData?.data)) return storiesData.data;
    return [];
  }, [storiesData]);

  const { allGroups } = useMemo(() => {
    return groupStoriesByUser(stories, currentUserId, undefined, businesses);
  }, [stories, currentUserId, businesses]);

  const effectiveFeedFilter = isBusinessMode
    ? (activeFilter === 'trending' ? 'trending' : 'all')
    : activeFilter;

  // ── Fetch Feed per Filter & Active Profile ──
  const {
    data: feedData,
    isLoading: feedLoading,
    isError: feedError,
    refetch: refetchFeed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useCommunityFeed({
    filter: effectiveFeedFilter,
    activeProfileType,
    activeBusinessId,
    organizationId: urlOrgId,
  });

  // Infinite Scroll Trigger with prefetch margin
  const { targetRef } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '250px',
    onIntersect: useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]),
  });

  const rawPosts = useMemo(() => {
    const pages = feedData?.pages || [];
    const seen = new Set();
    const result = [];
    for (const page of pages) {
      if (!page?.items) continue;
      for (const post of page.items) {
        if (!post) continue;
        const id = post._id || post.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          result.push(post);
        }
      }
    }
    return result;
  }, [feedData]);

  // Real Trending Topics extracted from active posts
  const trendingTopics = useMemo(() => {
    return extractTrendingTopics(rawPosts);
  }, [rawPosts]);

  // Filter posts by active topic if selected
  const displayedPosts = useMemo(() => {
    if (!activeTopic) return rawPosts;
    const cleanActive = sanitizeTag(activeTopic);
    if (!cleanActive) return rawPosts;
    return rawPosts.filter((post) => {
      if (!post) return false;
      const tags = (post.tags || []).map(sanitizeTag);
      const hashtags = (post.hashtags || []).map(sanitizeTag);
      const contentMatches = (post.content || '').toLowerCase().includes(`#${cleanActive}`);
      return tags.includes(cleanActive) || hashtags.includes(cleanActive) || contentMatches;
    });
  }, [rawPosts, activeTopic]);

  // Video posts available in the active feed for instant Reels playback
  const feedVideoPosts = useMemo(() => {
    return displayedPosts.filter(
      (p) =>
        p &&
        (p.type === 'VIDEO' ||
          (Array.isArray(p.media) && p.media.some((m) => m?.type === 'video')))
    );
  }, [displayedPosts]);

  const handleOpenReel = useCallback((postId) => {
    if (postId) {
      navigate(`/community/reels/${postId}`);
    } else {
      navigate('/community/reels');
    }
  }, [navigate]);

  const handleCloseReel = useCallback(() => {
    setActiveReelPostId(null);
    if (window.location.pathname.startsWith('/community/reels')) {
      navigate('/community', { replace: true });
    }
  }, [navigate]);

  // ── Notification Deep-Link Navigation & Consumption Lifecycle ──
  const [targetPostNotice, setTargetPostNotice] = useState(null);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const handledTargetPostIdRef = useRef(null);

  useEffect(() => {
    if (!targetPostId || feedLoading) return;
    if (handledTargetPostIdRef.current === targetPostId) return;

    // Locate matching post in active displayedPosts (matching plain ID, post- prefix, or UUID)
    const matchedPost = displayedPosts.find((p) => {
      const pid = String(p._id || p.id || '');
      return (
        pid === targetPostId ||
        pid === `post-${targetPostId}` ||
        `post-${pid}` === targetPostId
      );
    });

    if (matchedPost) {
      handledTargetPostIdRef.current = targetPostId;
      setTargetPostNotice(null);

      const matchedId = matchedPost._id || matchedPost.id;
      setHighlightedPostId(matchedId);

      // Smooth scroll to target post element
      const cleanId = String(matchedId).replace(/^post-/, '');
      const element =
        document.getElementById(matchedId) ||
        document.getElementById(cleanId) ||
        document.getElementById(`post-${cleanId}`) ||
        document.querySelector(`[data-post-id="${matchedId}"]`) ||
        document.querySelector(`[data-post-id="${cleanId}"]`);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Open comment drawer if requested
      if (shouldOpenComments) {
        setActiveCommentPost(matchedPost);
      }

      // Clear highlighted state after 2.5 seconds
      const timer = setTimeout(() => {
        setHighlightedPostId((current) => (current === matchedId ? null : current));
      }, 2500);

      // Clean up consumed navigation query parameters without disrupting browser history
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('post');
      newParams.delete('postId');
      newParams.delete('openComments');
      newParams.delete('comments');
      setSearchParams(newParams, { replace: true });

      return () => clearTimeout(timer);
    } else if (!feedLoading) {
      // Feed has finished loading but target post was not in the current view
      handledTargetPostIdRef.current = targetPostId;

      const isFilteredView = effectiveFeedFilter !== 'all' || Boolean(activeTopic);
      setTargetPostNotice({
        postId: targetPostId,
        isFilteredView,
        filter: effectiveFeedFilter,
        hasTopic: Boolean(activeTopic),
      });

      // Clean up consumed navigation query parameters
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('post');
      newParams.delete('postId');
      newParams.delete('openComments');
      newParams.delete('comments');
      setSearchParams(newParams, { replace: true });
    }
  }, [
    targetPostId,
    shouldOpenComments,
    feedLoading,
    displayedPosts,
    effectiveFeedFilter,
    activeTopic,
    searchParams,
    setSearchParams,
  ]);

  const [creationPublishingContext, setCreationPublishingContext] = useState(null);

  const getSnapshotPublishingContext = useCallback(() => {
    return {
      profileType: activeProfileType || 'personal',
      organizationId: activeProfileType === 'business' ? activeBusinessId : null,
      organization: activeProfileType === 'business' ? business : null,
    };
  }, [activeProfileType, activeBusinessId, business]);

  const handleOpenCreateAction = useCallback(() => {
    setCreationPublishingContext(getSnapshotPublishingContext());
    setIsCreateActionOpen(true);
  }, [getSnapshotPublishingContext]);

  // Handle opening creation studios with route synchronization
  const handleOpenCreatePost = useCallback(() => {
    setCreationPublishingContext(getSnapshotPublishingContext());
    setIsCreatePostOpen(true);
    if (!window.location.pathname.startsWith('/community/create/post')) {
      window.history.pushState(null, '', '/community/create/post');
    }
  }, [getSnapshotPublishingContext]);

  const handleCloseCreatePost = useCallback(() => {
    setIsCreatePostOpen(false);
    if (window.location.pathname.startsWith('/community/create/post')) {
      window.history.replaceState(null, '', '/community');
    }
  }, []);

  const handleOpenCreateReel = useCallback(() => {
    setCreationPublishingContext(getSnapshotPublishingContext());
    setIsCreateReelOpen(true);
    if (!window.location.pathname.startsWith('/community/create/reel')) {
      window.history.pushState(null, '', '/community/create/reel');
    }
  }, [getSnapshotPublishingContext]);

  const handleCloseCreateReel = useCallback(() => {
    setIsCreateReelOpen(false);
    if (window.location.pathname.startsWith('/community/create/reel')) {
      window.history.replaceState(null, '', '/community');
    }
  }, []);

  const handleOpenCreateStory = useCallback(() => {
    setCreationPublishingContext(getSnapshotPublishingContext());
    setIsCreateStoryModalOpen(true);
  }, [getSnapshotPublishingContext]);

  // Initial deep-link mount for /community/create/post and /community/create/reel
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/community/create/post' || initialCreateMode === 'post') {
      setCreationPublishingContext(getSnapshotPublishingContext());
      setIsCreatePostOpen(true);
    } else if (path === '/community/create/reel' || initialCreateMode === 'reel') {
      setCreationPublishingContext(getSnapshotPublishingContext());
      setIsCreateReelOpen(true);
    }
  }, [initialCreateMode, getSnapshotPublishingContext]);

  // Back button popstate listener
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (!path.startsWith('/community/reels') && activeReelPostId) {
        setActiveReelPostId(null);
      }
      if (!path.startsWith('/community/create/post') && isCreatePostOpen) {
        setIsCreatePostOpen(false);
      }
      if (!path.startsWith('/community/create/reel') && isCreateReelOpen) {
        setIsCreateReelOpen(false);
      }
      if (path === '/community/create/post') {
        setCreationPublishingContext(getSnapshotPublishingContext());
        setIsCreatePostOpen(true);
      }
      if (path === '/community/create/reel') {
        setCreationPublishingContext(getSnapshotPublishingContext());
        setIsCreateReelOpen(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeReelPostId, isCreatePostOpen, isCreateReelOpen, getSnapshotPublishingContext]);

  const handleEmptyStateAction = useCallback(() => {
    handleOpenCreatePost();
  }, [handleOpenCreatePost]);

  const handleFilterChange = useCallback((newFilter) => {
    if (newFilter === activeFilter) return;
    if (activeTopic) setActiveTopic(null);
    if (newFilter === 'all') {
      navigate('/community', { replace: true });
    } else {
      navigate(`/community?feed=${newFilter}`, { replace: true });
    }
  }, [activeFilter, activeTopic, navigate]);

  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  // Keyboard shortcut (⌘K / Ctrl+K) for Community Search
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="relative w-full max-w-full overflow-x-hidden community-aurora-bg">
      {/* Brand Ambient Canvas Contour Curves */}
      <BrandAmbientShape variant="canvas" opacity={0.6} />

      {/* ── Story Modal & Viewer Overlays (Code-split with Suspense & FeatureErrorBoundary) ── */}
      <FeatureErrorBoundary featureName="Community Overlay">
        <Suspense fallback={null}>
          {selectedGroupIndex !== null && allGroups.length > 0 && (
            <StoryViewer
              userGroups={allGroups}
              initialUserIndex={selectedGroupIndex}
              initialStoryIndex={0}
              onClose={() => setSelectedGroupIndex(null)}
            />
          )}

          {isCreateStoryModalOpen && (
            <CreateStoryModal
              isOpen={isCreateStoryModalOpen}
              onClose={() => setIsCreateStoryModalOpen(false)}
              publishingContext={creationPublishingContext}
            />
          )}

          {/* ── Premium Quick Create Chooser (Post vs Reel) ── */}
          {isCreateActionOpen && (
            <CreateActionModal
              isOpen={isCreateActionOpen}
              onClose={() => setIsCreateActionOpen(false)}
              onSelectPost={handleOpenCreatePost}
              onSelectReel={handleOpenCreateReel}
              onSelectStory={handleOpenCreateStory}
              publishingContext={creationPublishingContext}
            />
          )}

          {/* ── Post Studio Shell ── */}
          {isCreatePostOpen && (
            <CreatePostModal
              isOpen={isCreatePostOpen}
              onClose={handleCloseCreatePost}
              publishingContext={creationPublishingContext}
            />
          )}

          {/* ── Reel Studio Shell ── */}
          {isCreateReelOpen && (
            <ReelStudioModal
              isOpen={isCreateReelOpen}
              onClose={handleCloseCreateReel}
              onSuccess={() => refetchFeed()}
              publishingContext={creationPublishingContext}
            />
          )}

          {/* ── Centralized Comment Drawer (Desktop Right Drawer / Mobile Bottom Sheet) ── */}
          {Boolean(activeCommentPost) && (
            <CommentDrawer
              isOpen={Boolean(activeCommentPost)}
              post={activeCommentPost}
              onClose={() => setActiveCommentPost(null)}
            />
          )}

          {/* ── Community Unified Search Modal ── */}
          {isSearchOpen && (
            <CommunitySearchModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              onSelectTopic={setActiveTopic}
              onOpenComments={setActiveCommentPost}
            />
          )}

          {/* ── Mobile Discovery Drawer ── */}
          {isMobileDiscoveryOpen && (
            <MobileDiscoveryDrawer
              isOpen={isMobileDiscoveryOpen}
              onClose={() => setIsMobileDiscoveryOpen(false)}
              topics={trendingTopics}
              activeTopic={activeTopic}
              activeFilter={activeFilter}
              onSelectTopic={setActiveTopic}
              onOpenSearch={handleOpenSearch}
            />
          )}

          {/* ── Immersive Reels Viewer Overlay ── */}
          {Boolean(activeReelPostId) && (
            <ReelsViewer
              posts={feedVideoPosts}
              initialPostId={activeReelPostId}
              onClose={handleCloseReel}
              onFetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          )}

          {/* ── Creator Insights Modal ── */}
          {isInsightsOpen && (
            <CreatorInsightsModal
              isOpen={isInsightsOpen}
              onClose={() => setIsInsightsOpen(false)}
            />
          )}
        </Suspense>
      </FeatureErrorBoundary>

      {/* ── Responsive Centered Editorial Container (Header + Feed + Discovery Sidebar) ── */}
      <div className="max-w-[1040px] mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-4">
        {/* ── Page Header: Company Feed Header in Business Mode, CommunityHeader in Personal Mode ── */}
        {isBusinessMode ? (
          <CompanyFeedHeader
            business={business}
            onOpenSearch={handleOpenSearch}
            onOpenCreate={handleOpenCreateAction}
          />
        ) : (
          <CommunityHeader
            onOpenCreate={handleOpenCreateAction}
            onOpenSearch={handleOpenSearch}
            onOpenMobileDiscovery={() => setIsMobileDiscoveryOpen(true)}
            onOpenInsights={() => setIsInsightsOpen(true)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,620px)_340px] justify-center gap-6 lg:gap-8 items-start mt-3 sm:mt-5">
          {/* ── PRIMARY COLUMN (Community Feed) ── */}
          <div className="w-full max-w-[620px] mx-auto space-y-3.5 min-w-0" id={`feed-panel-${activeFilter}`}>
            {/* ── Stories Strip (Snug within feed column, personal mode only) ── */}
            {!isBusinessMode && (
              <StoryRail
                stories={stories}
                isLoading={storiesLoading}
                onAddStory={handleOpenCreateStory}
                onSelectGroup={(group) => {
                  const idx = allGroups.findIndex((g) => g.userId === group.userId);
                  setSelectedGroupIndex(idx !== -1 ? idx : 0);
                }}
                currentUserId={currentUserId}
                currentUserAvatar={user?.avatar || user?.profilePicture || user?.avatarUrl || user?.profileImage}
                currentUserName={user?.name || user?.username || 'You'}
              />
            )}

            {/* Inline Creation Entry Point (Supports both Personal and Business active modes) */}
            <CommunityComposerEntry
              user={user}
              business={isBusinessMode ? business : null}
              publishingContext={getSnapshotPublishingContext()}
              onOpenCreatePost={handleOpenCreatePost}
              onOpenCreateReel={handleOpenCreateReel}
              onOpenCreateStory={handleOpenCreateStory}
            />

            {/* ── Segmented Feed Filter Navigation Bar (Latest / Trending / Following / Cohort) ── */}
            <FeedFilterTabs
              activeFilter={effectiveFeedFilter}
              onChangeFilter={handleFilterChange}
              hasCohort={Boolean(user?.enrolledCourses?.length)}
              isBusinessMode={isBusinessMode}
            />

            {/* Active Topic Banner if filtering by topic */}
            {activeTopic && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-elevated border border-brand-mint/30 text-xs text-text-primary shadow-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  Filtering by topic: <strong className="text-brand-mint">#{activeTopic}</strong>
                  <span className="text-text-muted font-normal">
                    ({displayedPosts.length} {displayedPosts.length === 1 ? 'post' : 'posts'})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTopic(null)}
                  className="text-text-muted hover:text-text-primary underline cursor-pointer"
                >
                  Show all
                </button>
              </div>
            )}

            {/* Target Post Deep-Link Fallback Notice (if post was filtered or unavailable) */}
            {targetPostNotice && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-elevated border border-brand-mint/30 text-xs text-text-primary shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-brand-mint shrink-0" aria-hidden="true" />
                  <span>
                    {targetPostNotice.isFilteredView
                      ? 'The linked post was not found in this filtered view.'
                      : 'The linked post could not be found. It may have been deleted, moved, or is inaccessible.'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {targetPostNotice.isFilteredView && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPostNotice(null);
                        if (targetPostNotice.hasTopic) setActiveTopic(null);
                        handleFilterChange('all');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-brand-mint/20 hover:bg-brand-mint/30 text-brand-mint font-medium transition-colors cursor-pointer"
                    >
                      View all posts
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTargetPostNotice(null)}
                    className="text-text-muted hover:text-text-primary px-1.5 py-1 transition-colors cursor-pointer"
                    aria-label="Dismiss notice"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* ── Feed Section ── */}
            <div className="space-y-3.5">
              {feedLoading ? (
                // High-fidelity PostCard Skeletons with realistic varied proportions
                Array.from({ length: 3 }).map((_, i) => (
                  <PostCardSkeleton key={i} variant={i % 2 === 0 ? 'media' : 'text'} />
                ))
              ) : feedError ? (
                <EmptyState
                  icon={AlertCircle}
                  title="We couldn't load the community."
                  description="We encountered an issue retrieving the community feed. Please check your network connection and try again."
                  action={() => refetchFeed()}
                  actionLabel="Try again"
                />
              ) : (
                <>
                  {displayedPosts.map((post) => {
                    const postId = post._id || post.id;
                    const isCurrentActivePost = Boolean(
                      activeCommentPost &&
                      (activeCommentPost._id || activeCommentPost.id) === postId
                    );
                    const isHighlighted = Boolean(
                      highlightedPostId &&
                      (highlightedPostId === postId || highlightedPostId === `post-${postId}`)
                    );

                    return (
                      <PostCard
                        key={postId}
                        post={post}
                        onOpenComments={setActiveCommentPost}
                        isActiveCommentPost={isCurrentActivePost}
                        isHighlighted={isHighlighted}
                        onOpenReel={handleOpenReel}
                        onSelectTopic={setActiveTopic}
                      />
                    );
                  })}

                {/* Infinite Scroll Trigger & Bottom Loading / Error States */}
                {hasNextPage && (
                  <div ref={targetRef} className="py-4">
                    {isFetchingNextPage ? (
                      <div className="space-y-4">
                        <PostCardSkeleton />
                      </div>
                    ) : isFetchNextPageError ? (
                      <div className="text-center py-5 px-4 bg-surface-card border border-border rounded-2xl">
                        <p className="text-xs text-text-muted mb-2.5">Couldn't load more posts.</p>
                        <button
                          type="button"
                          onClick={() => fetchNextPage()}
                          className="zn-btn-primary min-h-[44px] min-w-[44px] px-4 py-2 font-semibold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          Try again
                        </button>
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                )}

                {!hasNextPage && displayedPosts.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-text-faint">
                      You're all caught up with the {activeFilter === 'all' ? 'community' : activeFilter} feed.
                    </p>
                  </div>
                )}

                {/* Intentional Empty States per Filter & Mode */}
                {!feedLoading && displayedPosts.length === 0 && (
                  <>
                    {isBusinessMode ? (
                      <EmptyState
                        icon={Building2}
                        title="No posts yet"
                        description="Your company hasn't shared anything here yet."
                        action={handleEmptyStateAction}
                        actionLabel="Create a Post"
                      />
                    ) : activeFilter === 'following' ? (
                      <EmptyState
                        icon={Users}
                        title="Your following feed is quiet"
                        description="Follow engineers, peers, and mentors across the network to personalize what you see in this feed."
                        action={() => navigate('/network')}
                        actionLabel="Discover People"
                      />
                    ) : activeFilter === 'cohort' ? (
                      <EmptyState
                        icon={GraduationCap}
                        title="Your cohort hasn't posted yet"
                        description="Start the conversation with your enrolled course batch, faculty, and academic peers."
                        action={handleEmptyStateAction}
                        actionLabel="Create a Post"
                      />
                    ) : activeFilter === 'trending' ? (
                      <EmptyState
                        icon={Flame}
                        title="No trending discussions yet"
                        description="Discussions with community reactions, comments, and reposts will be ranked and showcased here."
                        action={handleEmptyStateAction}
                        actionLabel="Create a Post"
                      />
                    ) : activeTopic ? (
                      <EmptyState
                        icon={Sparkles}
                        title={`No posts found for #${activeTopic}`}
                        description="Be the first to publish a post tagged with this discipline or project topic."
                        action={() => setActiveTopic(null)}
                        actionLabel="View all posts"
                      />
                    ) : (
                      <EmptyState
                        icon={Globe}
                        title="The community is getting started"
                        description="Be one of the first people to share an engineering insight, project update, or technical question with the global Zeitnah network."
                        action={handleEmptyStateAction}
                        actionLabel="Create a Post"
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── SECONDARY COLUMN (Desktop Discovery Sidebar >=1024px) ── */}
        <div className="hidden lg:block">
          <DiscoverySidebar
            topics={trendingTopics}
            activeTopic={activeTopic}
            activeFilter={activeFilter}
            onSelectTopic={setActiveTopic}
            onOpenSearch={handleOpenSearch}
          />
        </div>
      </div>
    </div>
  </div>
  );
}
