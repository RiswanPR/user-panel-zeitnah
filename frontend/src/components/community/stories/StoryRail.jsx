import React from 'react';
import { Plus } from 'lucide-react';
import { Skeleton, SkeletonCircle } from '../../ui/Skeleton';
import StoryAvatarRing from './StoryAvatarRing';

/**
 * StoryRail — Media-first horizontal story rail with prominent avatar rings,
 * user's story with '+' badge, and smooth touch scrolling.
 */
export default function StoryRail({
  stories = [],
  isLoading,
  onAddStory,
  onSelectStory,
  currentUserId,
  viewedStoryIds = new Set(),
  currentUserAvatar,
  currentUserName = 'You',
}) {
  // Check if current user already has active stories in the rail
  const ownStoryIndex = stories.findIndex((s) => {
    const authorId = s.author?._id || s.author?.id || s.authorId;
    return Boolean(currentUserId && authorId && String(currentUserId) === String(authorId));
  });
  const hasOwnStory = ownStoryIndex !== -1;

  const handleOwnStoryClick = () => {
    if (hasOwnStory) {
      onSelectStory(ownStoryIndex);
    } else {
      onAddStory();
    }
  };

  return (
    <section
      aria-label="Community Stories"
      className="p-3.5 sm:p-4 rounded-2xl bg-[#0B111E]/80 border border-white/[0.08] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)] select-none"
    >
      <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-1 scrollbar-none items-center">
        {/* Your Story Item with '+' Badge */}
        <div
          onClick={handleOwnStoryClick}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none transition-transform active:scale-95"
          role="button"
          tabIndex={0}
          aria-label={hasOwnStory ? 'View your story' : 'Create a new story'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOwnStoryClick();
            }
          }}
        >
          <div className="relative">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-transform duration-200 group-hover:scale-105 ${
                hasOwnStory
                  ? 'p-[2.5px] bg-gradient-to-tr from-emerald-400 via-teal-400 to-brand-mint shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                  : 'p-[2px] bg-white/[0.1] border-2 border-dashed border-white/20 group-hover:border-brand-mint/60'
              }`}
            >
              <div className="w-full h-full rounded-full bg-[#0E1726] border-2 border-[#0B111E] overflow-hidden flex items-center justify-center">
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt={currentUserName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs font-bold text-brand-mint">
                    {(currentUserName || 'Y').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* '+' Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddStory();
              }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-mint text-[#0B111E] flex items-center justify-center ring-2 ring-[#0B111E] shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Add to story"
              aria-label="Add to story"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <span className="text-[11px] font-medium text-text-muted group-hover:text-white transition-colors truncate max-w-[68px]">
            Your story
          </span>
        </div>

        {/* Other Stories List / Loading Skeletons */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <SkeletonCircle size={56} className="sm:w-16 sm:h-16" />
              <Skeleton className="w-10 h-2 rounded-full" />
            </div>
          ))
        ) : (
          stories.map((story, idx) => {
            const storyId = story._id || story.id;
            const authorId = story.author?._id || story.author?.id || story.authorId;
            const isOwnStory = Boolean(currentUserId && authorId && String(currentUserId) === String(authorId));

            // Don't duplicate own story if already shown in the first slot
            if (isOwnStory) return null;

            // Check if seen via story flag, views array containing user, or local viewed set
            const isSeen = Boolean(
              story.isViewed ||
              viewedStoryIds.has?.(storyId) ||
              (story.views && currentUserId && story.views.some((v) => String(v.userId || v) === String(currentUserId)))
            );

            return (
              <StoryAvatarRing
                key={storyId || idx}
                story={story}
                index={idx}
                isSeen={isSeen}
                isOwnStory={false}
                onClick={onSelectStory}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
