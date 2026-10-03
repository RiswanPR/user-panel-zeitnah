import { useState, useCallback, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import FeedFilterTabs from '../../components/community/feed/FeedFilterTabs';
import Composer from '../../components/community/Composer';
import PostCard from '../../components/community/PostCard';
import StoryViewer from '../../components/community/stories/StoryViewer';
import StoryRail from '../../components/community/stories/StoryRail';
import CreateStoryModal from '../../components/community/stories/CreateStoryModal';
import CommentDrawer from '../../components/community/comments/CommentDrawer';
import CommunityHeader from '../../components/community/header/CommunityHeader';
import CreateActionModal from '../../components/community/composer/CreateActionModal';
import CreatePostModal from '../../components/community/composer/CreatePostModal';
import DiscoverySidebar from '../../components/community/discovery/DiscoverySidebar';
import MobileDiscoveryDrawer from '../../components/community/discovery/MobileDiscoveryDrawer';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useCommunityFeed, useActiveStories } from '../../hooks/useCommunity';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { AuthContext } from '../../context/AuthContext';
import {
  normalizeFeedFilter,
  extractTrendingTopics,
  sanitizeTag,
} from '../../utils/communityFormatters';
import { groupStoriesByUser } from '../../utils/storyGrouping';
import { Sparkles, Users, GraduationCap, Globe, AlertCircle } from 'lucide-react';

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
export default function CommunityHome() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL Feed Filter State ──
  const activeFilter = normalizeFeedFilter(searchParams.get('feed'));

  const handleFilterChange = useCallback(
    (filterId) => {
      const nextParams = new URLSearchParams(searchParams);
      if (filterId === 'all') {
        nextParams.delete('feed');
      } else {
        nextParams.set('feed', filterId);
      }
      setSearchParams(nextParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  // ── Modals & Overlays State ──
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(null);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isMobileDiscoveryOpen, setIsMobileDiscoveryOpen] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);

  const currentUserId = user?._id || user?.id || user?.userId;
  const hasCohort = Boolean(user?.enrolledCourses && user.enrolledCourses.length > 0);

  // ── Fetch Stories & Group (1 User = 1 Icon) ──
  const { data: storiesData, isLoading: storiesLoading } = useActiveStories();
  const stories = storiesData || [];

  const { allGroups } = useMemo(() => {
    return groupStoriesByUser(stories, currentUserId);
  }, [stories, currentUserId]);

  // ── Fetch Feed per Filter ──
  const {
    data: feedData,
    isLoading: feedLoading,
    isError: feedError,
    refetch: refetchFeed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityFeed({ filter: activeFilter });

  // Infinite Scroll Trigger
  const { targetRef } = useIntersectionObserver({
    threshold: 0.1,
    onIntersect: useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]),
  });

  const rawPosts = useMemo(() => {
    return feedData?.pages?.flatMap((page) => page.items) || [];
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

  const handleEmptyStateAction = useCallback(() => {
    const composer = document.getElementById('composer-textarea');
    if (composer) {
      composer.focus();
      composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleOpenSearch = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
    );
  }, []);

  return (
    <div className="w-full community-aurora-bg">
      {/* ── Story Modal & Viewer Overlays ── */}
      {selectedGroupIndex !== null && allGroups.length > 0 && (
        <StoryViewer
          userGroups={allGroups}
          initialUserIndex={selectedGroupIndex}
          initialStoryIndex={0}
          onClose={() => setSelectedGroupIndex(null)}
        />
      )}

      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={() => setIsCreateStoryModalOpen(false)}
      />

      {/* ── Instagram-Style Quick Create Chooser ── */}
      <CreateActionModal
        isOpen={isCreateActionOpen}
        onClose={() => setIsCreateActionOpen(false)}
        onSelectPost={() => setIsCreatePostOpen(true)}
        onSelectStory={() => setIsCreateStoryModalOpen(true)}
      />

      {/* ── Multi-Step Post Publishing Flow ── */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
      />

      {/* ── Centralized Comment Drawer (Desktop Right Drawer / Mobile Bottom Sheet) ── */}
      <CommentDrawer
        isOpen={Boolean(activeCommentPost)}
        post={activeCommentPost}
        onClose={() => setActiveCommentPost(null)}
      />

      {/* ── Mobile Discovery Drawer ── */}
      <MobileDiscoveryDrawer
        isOpen={isMobileDiscoveryOpen}
        onClose={() => setIsMobileDiscoveryOpen(false)}
        topics={trendingTopics}
        activeTopic={activeTopic}
        onSelectTopic={setActiveTopic}
        onOpenSearch={handleOpenSearch}
      />

      {/* ── Editorial Page Header with Create, Search & Saved Actions ── */}
      <CommunityHeader
        onOpenCreate={() => setIsCreateActionOpen(true)}
        onOpenSearch={handleOpenSearch}
        onOpenMobileDiscovery={() => setIsMobileDiscoveryOpen(true)}
      />

      {/* ── Stories Strip (Spanning full width) ── */}
      <div className="mb-6">
        <StoryRail
          stories={stories}
          isLoading={storiesLoading}
          onAddStory={() => setIsCreateStoryModalOpen(true)}
          onSelectGroup={(group) => {
            const idx = allGroups.findIndex((g) => g.userId === group.userId);
            setSelectedGroupIndex(idx !== -1 ? idx : 0);
          }}
          currentUserId={currentUserId}
          currentUserAvatar={user?.avatar || user?.profilePicture || user?.avatarUrl}
          currentUserName={user?.name || user?.username || 'You'}
        />
      </div>

      {/* ── Responsive Layout Grid (Main Feed + Desktop Discovery Sidebar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        {/* ── PRIMARY COLUMN (Feed Filters, Composer, Filtered Feed) ── */}
        <div className="space-y-6 min-w-0" id={`feed-panel-${activeFilter}`}>
          {/* ── Feed Filter Tabs ── */}
          <FeedFilterTabs
            activeFilter={activeFilter}
            onChangeFilter={handleFilterChange}
            hasCohort={hasCohort}
          />

          {/* Active Topic Banner if filtering by topic */}
          {activeTopic && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-mint/10 border border-brand-mint/25 text-xs text-white">
              <span className="flex items-center gap-1.5 font-medium">
                Filtering by topic: <strong className="text-brand-mint">#{activeTopic}</strong>
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

          {/* ── Post Composer ── */}
          <Composer onOpenModal={() => setIsCreatePostOpen(true)} />

          {/* ── Feed Section ── */}
          <div className="space-y-4">
            {feedLoading ? (
              // Design-system Shimmer Skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="bg-[#0B111E]/80 border-white/[0.08]" />
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
                    />
                  );
                })}

                {/* Infinite Scroll Trigger */}
                {hasNextPage && (
                  <div ref={targetRef} className="py-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-brand-mint/30 border-t-brand-mint rounded-full animate-spin" />
                  </div>
                )}

                {!hasNextPage && displayedPosts.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-text-faint">
                      You're all caught up with the {activeFilter === 'all' ? 'community' : activeFilter} feed.
                    </p>
                  </div>
                )}

                {/* Intentional Empty States per Filter */}
                {!feedLoading && displayedPosts.length === 0 && (
                  <>
                    {activeFilter === 'following' ? (
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
            onSelectTopic={setActiveTopic}
            onOpenSearch={handleOpenSearch}
          />
        </div>
      </div>
    </div>
  );
}
