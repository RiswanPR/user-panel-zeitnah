import React, { useState } from 'react';

/**
 * StoryAvatarRing — Renders a story author avatar with vibrant unread gradient rings
 * or refined watched subtle rings.
 */
export default function StoryAvatarRing({
  userGroup,
  story, // backward-compat fallback
  index = 0,
  isSeen = false,
  isOwnStory = false,
  onClick,
}) {
  const [imgError, setImgError] = useState(false);

  // Normalize between userGroup view model and raw story
  const group = userGroup || (story ? {
    userId: story.author?._id || story.author?.id || story.authorId,
    displayName: story.author?.name || story.author?.displayName || 'Member',
    avatar: story.author?.avatar,
    stories: [story],
    hasUnseenStories: !isSeen,
  } : null);

  if (!group) return null;

  const authorName = group.displayName || 'Member';
  const avatarUrl = group.avatar;
  const storiesCount = Array.isArray(group.stories) ? group.stories.length : 1;
  const unseen = group.hasUnseenStories ?? !isSeen;

  const initials = authorName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'Z';

  return (
    <div
      onClick={() => onClick?.(index)}
      className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none transition-transform active:scale-95"
      role="button"
      tabIndex={0}
      aria-label={`View ${storiesCount} ${storiesCount === 1 ? 'story' : 'stories'} by ${authorName}${!unseen ? ' (already viewed)' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(index);
        }
      }}
    >
      {/* Outer Ring with Seen / Unseen Distinction & Zeitnah Brand Gradients */}
      <div
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-200 group-hover:scale-[1.04] ${
          !unseen
            ? 'p-[2px] bg-gradient-to-tr from-[#12314C]/70 via-white/[0.1] to-[#9FD5B2]/20 ring-1 ring-white/10 opacity-75 group-hover:opacity-100 group-hover:ring-brand-mint/20'
            : isOwnStory
            ? 'p-[2.5px] bg-gradient-to-tr from-[#12314C] via-brand-mint to-[#F6ED4A] shadow-[0_0_14px_rgba(246,237,74,0.25)] ring-1 ring-brand-yellow/40'
            : 'p-[2.5px] bg-gradient-to-tr from-[#12314C] via-brand-mint to-[#F6ED4A] shadow-[0_0_14px_rgba(159,213,178,0.3)] ring-1 ring-brand-mint/40'
        }`}
      >
        {/* Inner Avatar Container */}
        <div className="w-full h-full rounded-full bg-[#0E1726] border-2 border-[#0B111E] overflow-hidden flex items-center justify-center">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={authorName}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <span
              className={`text-xs font-bold ${
                !unseen ? 'text-text-muted' : 'text-brand-mint'
              }`}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Multi-story count pill (if user has 2+ stories) */}
        {storiesCount > 1 && (
          <span
            className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold bg-[#070B14]/90 backdrop-blur-md text-white border border-white/20 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center min-w-[18px]"
            title={`${storiesCount} stories`}
          >
            {storiesCount}
          </span>
        )}
      </div>

      {/* Author Name Tag */}
      <span className="text-[11px] font-medium text-text-muted group-hover:text-white transition-colors truncate max-w-[68px] text-center">
        {isOwnStory ? 'Your story' : authorName.split(' ')[0]}
      </span>
    </div>
  );
}
