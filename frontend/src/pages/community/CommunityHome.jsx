import { useState, useCallback } from 'react';
import Composer from '../../components/community/Composer';
import PostCard from '../../components/community/PostCard';
import StoryViewer from '../../components/community/StoryViewer';
import CreateStoryModal from '../../components/community/CreateStoryModal';
import { useCommunityFeed, useActiveStories } from '../../hooks/useCommunity';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { Sparkles, MessageSquare, Plus } from 'lucide-react';

export default function CommunityHome() {
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);

  // ── Fetch Stories ──
  const { data: storiesData, isLoading: storiesLoading } = useActiveStories();
  const stories = storiesData || [];

  // ── Fetch Feed ──
  const {
    data: feedData,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityFeed();

  // Infinite Scroll Trigger
  const { targetRef } = useIntersectionObserver({
    threshold: 0.1,
    onIntersect: useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]),
  });

  const posts = feedData?.pages?.flatMap((page) => page.items) || [];

  return (
    <div className="max-w-2xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-6">
      {activeStoryIndex !== null && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
        />
      )}

      <CreateStoryModal
        isOpen={isCreateStoryModalOpen}
        onClose={() => setIsCreateStoryModalOpen(false)}
      />

      {/* ── Stories Strip ── */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none px-1">
        {/* Create Story Button */}
        <div
          onClick={() => setIsCreateStoryModalOpen(true)}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="Create a new story"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-white/[0.18] flex items-center justify-center bg-white/[0.02] group-hover:border-brand-mint/60 group-hover:bg-brand-mint/5 transition-all">
            <Plus className="w-5 h-5 text-text-muted group-hover:text-brand-mint transition-colors" />
          </div>
          <span className="text-[11px] font-medium text-text-muted group-hover:text-white transition-colors">
            Add Story
          </span>
        </div>

        {/* Stories List */}
        {storiesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/[0.04] border border-white/[0.06]" />
              <div className="w-10 h-2 bg-white/[0.04] rounded-full" />
            </div>
          ))
        ) : (
          stories.map((story, idx) => {
            const authorName =
              story.author?.name || story.author?.displayName || 'Member';
            const avatarUrl = story.author?.avatar;
            const initials = authorName.slice(0, 2).toUpperCase();

            return (
              <div
                key={story._id || story.id || idx}
                onClick={() => setActiveStoryIndex(idx)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                role="button"
                tabIndex={0}
                aria-label={`View story by ${authorName}`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-brand-mint via-brand-yellow to-brand-mint/40 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full bg-[#0E1726] border-2 border-[#070B14] overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={authorName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[11px] font-bold text-brand-mint">
                        {initials}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-text-muted group-hover:text-white transition-colors truncate max-w-[64px]">
                  {authorName.split(' ')[0]}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Post Composer ── */}
      <Composer />

      {/* ── Feed ── */}
      <div className="space-y-4">
        {feedLoading ? (
          // Skeleton loading
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#0B111E]/80 border border-white/[0.06] rounded-2xl p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
                <div className="space-y-2 flex-1">
                  <div className="w-28 h-3.5 bg-white/[0.06] rounded-full" />
                  <div className="w-20 h-2.5 bg-white/[0.04] rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-3 bg-white/[0.04] rounded-full" />
                <div className="w-3/4 h-3 bg-white/[0.04] rounded-full" />
              </div>
            </div>
          ))
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post._id || post.id} post={post} />
            ))}

            {/* Infinite Scroll Trigger */}
            {hasNextPage && (
              <div ref={targetRef} className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-brand-mint/30 border-t-brand-mint rounded-full animate-spin" />
              </div>
            )}

            {!hasNextPage && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-text-faint">
                  You're all caught up with the community feed.
                </p>
              </div>
            )}

            {!feedLoading && posts.length === 0 && (
              <div className="bg-[#0B111E]/80 border border-white/[0.08] rounded-2xl p-10 sm:p-14 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center mx-auto text-brand-mint">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">No posts yet</h3>
                <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto">
                  Be the first to share an insight, engineering discussion, or project update with the Zeitnah community!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
