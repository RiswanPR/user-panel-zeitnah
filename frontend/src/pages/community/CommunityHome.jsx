import { useState, useCallback } from 'react';
import Composer from '../../components/community/Composer';
import PostCard from '../../components/community/PostCard';
import StoryViewer from '../../components/community/StoryViewer';
import CreateStoryModal from '../../components/community/CreateStoryModal';
import { useCommunityFeed, useActiveStories } from '../../hooks/useCommunity';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

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
    isFetchingNextPage 
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

  const posts = feedData?.pages?.flatMap(page => page.items) || [];

  return (
    <div className="space-y-6">
      
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

      {/* ── Learning Highlights (Stories) Strip ── */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1 snap-x">
        <div 
          onClick={() => setIsCreateStoryModalOpen(true)}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group snap-start"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-text-faint flex items-center justify-center bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors shadow-sm">
            <span className="text-2xl text-text-muted font-light group-hover:text-brand-mint transition-colors">+</span>
          </div>
          <span className="text-[10px] font-semibold text-text-muted group-hover:text-white transition-colors">Create</span>
        </div>
        
        {storiesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-16 h-16 rounded-full border-2 border-transparent shimmer bg-white/[0.02]" />
            </div>
          ))
        ) : (
          stories.map((story, idx) => {
            const authorName = story.author?.name || 'User';
            const avatarUrl = story.author?.avatar || `https://i.pravatar.cc/150?u=${story._id}`;
            
            return (
              <div 
                key={story._id} 
                onClick={() => setActiveStoryIndex(idx)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group snap-start"
              >
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-brand-yellow to-brand-mint group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full bg-bg-surface border-2 border-bg-base overflow-hidden flex items-center justify-center text-[10px] font-bold text-brand-mint">
                    {avatarUrl.includes('http') ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      authorName.slice(0,2).toUpperCase()
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-white">{authorName.split(' ')[0]}</span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Composer ── */}
      <Composer />

      {/* ── Feed ── */}
      <div className="space-y-4">
        {feedLoading ? (
          // Skeleton loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-48 shimmer" />
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
              <p className="text-center text-xs text-text-faint py-8">You've reached the end.</p>
            )}
            
            {!feedLoading && posts.length === 0 && (
              <div className="glass-card p-12 text-center">
                <h3 className="text-lg font-heading font-bold text-white mb-2">No posts yet</h3>
                <p className="text-sm text-text-muted">Be the first to share something with the community!</p>
              </div>
            )}
          </>
        )}
      </div>
      
    </div>
  );
}

