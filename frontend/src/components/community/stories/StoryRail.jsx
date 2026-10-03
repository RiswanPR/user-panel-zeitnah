import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Skeleton, SkeletonCircle } from '../../ui/Skeleton';
import StoryAvatarRing from './StoryAvatarRing';
import { groupStoriesByUser } from '../../../utils/storyGrouping';

/**
 * StoryRail — Media-first horizontal story rail with one icon per user,
 * multi-story grouping, vibrant unread gradient rings, and smooth scrolling.
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
  // Normalize & group flat stories by user
  const { currentUserGroup, userGroups } = useMemo(() => {
    return groupStoriesByUser(stories, currentUserId, viewedStoryIds);
  }, [stories, currentUserId, viewedStoryIds]);

  const hasOwnStory = Boolean(currentUserGroup && currentUserGroup.stories.length > 0);

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
      className="relative p-3.5 sm:p-4 rounded-2xl bg-[#0B111E]/80 border border-white/[0.08] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-brand-mint/20 transition-all select-none overflow-hidden"
    >
      {/* Top subtle ambient light bar */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/25 to-transparent pointer-events-none" />

      {/* Edge gradient masks for smooth horizontal scroll indicator */}
      <div className="absolute left-0 inset-y-0 w-5 bg-gradient-to-r from-[#0B111E] to-transparent pointer-events-none z-10 opacity-60 hidden sm:block" />
      <div className="absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-[#0B111E] to-transparent pointer-events-none z-10 opacity-60" />

      <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-1 scrollbar-none items-center snap-x snap-mandatory">
        {/* Your Story Item with '+' Badge */}
        <div
          onClick={handleOwnStoryClick}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none transition-transform active:scale-95 snap-start"
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
                    ? 'p-[2.5px] bg-gradient-to-tr from-[#F6ED4A] via-[#FB923C] to-[#F43F5E] shadow-[0_0_12px_rgba(251,146,60,0.25)] ring-1 ring-amber-400/35'
                    : 'p-[2px] bg-white/[0.12] ring-1 ring-white/10 opacity-80 group-hover:opacity-100'
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

            {/* '+' Badge with gradient fill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddStory?.();
              }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[#070B14] flex items-center justify-center ring-2 ring-[#0B111E] shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
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
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 snap-start">
              <SkeletonCircle size={56} className="sm:w-16 sm:h-16" />
              <Skeleton className="w-10 h-2 rounded-full" />
            </div>
          ))
        ) : (
          userGroups.map((group, idx) => (
            <div key={group.userId} className="snap-start">
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
