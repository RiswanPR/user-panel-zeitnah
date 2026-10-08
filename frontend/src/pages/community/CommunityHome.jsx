import { useState, useEffect, useCallback, useContext, useMemo, Suspense } from 'react';
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
    isBusinessMode,
  } = useActiveProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── URL Feed Filter State ──
  const activeFilter = normalizeFeedFilter(searchParams.get('feed'));

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
    return groupStoriesByUser(stories, currentUserId);
  }, [stories, currentUserId]);

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
    filter: activeFilter,
    activeProfileType,
    activeBusinessId,
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

      {/* ── Responsive Centered Container (Main Feed ~620px + Desktop Discovery Sidebar) ── */}
      <div className="max-w-[1020px] mx-auto px-0 sm:px-4 lg:px-6 mt-4 sm:mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,620px)_340px] justify-center gap-6 lg:gap-8 items-start">
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

          {/* Active Topic Banner if filtering by topic */}
          {activeTopic && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#12314C]/70 to-[#9FD5B2]/15 border border-brand-mint/30 text-xs text-white">
              <span className="flex items-center gap-1.5 font-medium">
                Filtering by topic: <strong className="text-brand-mint">#{activeTopic}</strong>
                <span className="text-text-muted font-normal">
                  ({displayedPosts.length} {displayedPosts.length === 1 ? 'post' : 'posts'})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTopic(null)}
                className="text-text-muted hover:text-white underline cursor-pointer"
              >
                Show all
              </button>
            </div>
          )}

          {/* ── Feed Section ── */}
          <div className="space-y-4">
            {feedLoading ? (
              // High-fidelity PostCard Skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <PostCardSkeleton key={i} />
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

                  return (
                    <PostCard
                      key={postId}
                      post={post}
                      onOpenComments={setActiveCommentPost}
                      isActiveCommentPost={isCurrentActivePost}
                      onOpenReel={handleOpenReel}
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
                      <div className="text-center py-5 px-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                        <p className="text-xs text-text-muted mb-2.5">Couldn't load more posts.</p>
                        <button
                          type="button"
                          onClick={() => fetchNextPage()}
                          className="min-h-[44px] min-w-[44px] px-4 py-2 bg-brand-mint text-bg-base font-semibold rounded-xl text-xs hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
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
