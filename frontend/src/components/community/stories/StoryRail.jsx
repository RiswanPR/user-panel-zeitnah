import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton, SkeletonCircle } from '../../ui/Skeleton';
import StoryAvatarRing from './StoryAvatarRing';
import { groupStoriesByUser } from '../../../utils/storyGrouping';

/**
 * StoryRail — Media-first horizontal story rail with one icon per user,
 * multi-story grouping, vibrant unread gradient rings, smooth momentum scrolling,
 * and desktop navigation chevron triggers.
 */
export default function StoryRail({
  stories = [],
  isLoading,
  onAddStory,
  onSelectGroup,
  onSelectStory, // backward-compat fallback
  currentUserId,
  viewedStoryIds = new Set(),
  currentUserAvatar,
  currentUserName = 'You',
}) {
  const railRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Normalize & group flat stories by user
  const { currentUserGroup, userGroups } = useMemo(() => {
    return groupStoriesByUser(stories, currentUserId, viewedStoryIds);
  }, [stories, currentUserId, viewedStoryIds]);

  const hasOwnStory = Boolean(currentUserGroup && currentUserGroup.stories.length > 0);

  const checkScroll = useCallback(() => {
    if (!railRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
    setCanScrollLeft(scrollLeft > 12);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 12);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = railRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll, stories]);

  const handleScroll = (direction) => {
    if (railRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      railRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleOwnStoryClick = () => {
    if (hasOwnStory) {
      if (onSelectGroup) {
        onSelectGroup(currentUserGroup, 0);
      } else if (onSelectStory) {
        onSelectStory(0);
      }
    } else {
      onAddStory?.();
    }
  };

  const handleOtherUserClick = (group, groupIdx) => {
    if (onSelectGroup) {
      onSelectGroup(group, 0);
    } else if (onSelectStory) {
      onSelectStory(groupIdx);
    }
  };

  return (
    <section
      aria-label="Community Stories"
      className="relative p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-[#0C1524]/90 via-[#0B1220]/85 to-[#0C1524]/90 border border-white/[0.08] backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:border-brand-mint/20 transition-all select-none overflow-hidden group/rail"
    >
      {/* Top subtle ambient light bar */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/25 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#12314C]/40 to-transparent pointer-events-none" />

      {/* Desktop Left Scroll Chevron */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white items-center justify-center backdrop-blur-md border border-white/10 z-20 shadow-md transition-all cursor-pointer opacity-0 group-hover/rail:opacity-100 focus:opacity-100"
          aria-label="Scroll stories left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Desktop Right Scroll Chevron */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white items-center justify-center backdrop-blur-md border border-white/10 z-20 shadow-md transition-all cursor-pointer opacity-0 group-hover/rail:opacity-100 focus:opacity-100"
          aria-label="Scroll stories right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Edge gradient masks */}
      <div className="absolute left-0 inset-y-0 w-6 bg-gradient-to-r from-[#0C1524] to-transparent pointer-events-none z-10 opacity-70 hidden sm:block" />
      <div className="absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-[#0C1524] to-transparent pointer-events-none z-10 opacity-70" />

      <div
        ref={railRef}
        className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-1 scrollbar-none items-center snap-x snap-mandatory overscroll-x-contain [webkit-overflow-scrolling:touch]"
      >
        {/* Your Story Item with '+' Badge */}
        <div
          onClick={handleOwnStoryClick}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none transition-transform active:scale-95 snap-start w-16 sm:w-18"
          role="button"
          tabIndex={0}
          aria-label={hasOwnStory ? `View your ${currentUserGroup.stories.length} stories` : 'Create a new story'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOwnStoryClick();
            }
          }}
        >
          <div className="relative">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-transform duration-200 group-hover:scale-[1.04] ${
                hasOwnStory
                  ? currentUserGroup.hasUnseenStories
                    ? 'p-[2.5px] community-ring-own ring-1 ring-brand-yellow/30'
                    : 'p-[2px] zn-gradient-ring-seen ring-1 ring-white/10 opacity-80 group-hover:opacity-100 group-hover:ring-brand-mint/20'
                  : 'p-[2px] bg-white/[0.08] border-2 border-dashed border-white/20 group-hover:border-brand-mint/60'
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

            {/* '+' Badge with Mint to Yellow Energy Gradient */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddStory?.();
              }}
              className="min-h-[24px] min-w-[24px] absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-brand-mint to-brand-yellow text-[#070B14] flex items-center justify-center ring-2 ring-[#0B111E] shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer font-bold after:content-[''] after:absolute after:-inset-2.5 after:min-w-[44px] after:min-h-[44px]"
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

        {/* Grouped Other Users: Exactly ONE icon per user */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 snap-start w-16 sm:w-18">
              <SkeletonCircle size={56} className="sm:w-16 sm:h-16" />
              <Skeleton className="w-10 h-2 rounded-full" />
            </div>
          ))
        ) : (
          userGroups.map((group, idx) => (
            <div key={group.userId} className="snap-start w-16 sm:w-18 flex justify-center">
              <StoryAvatarRing
                userGroup={group}
                index={idx}
                isSeen={!group.hasUnseenStories}
                isOwnStory={false}
                onClick={() => handleOtherUserClick(group, idx)}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
