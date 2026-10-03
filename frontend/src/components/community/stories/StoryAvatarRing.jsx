import React, { useState } from 'react';

/**
 * StoryAvatarRing — Renders a story author avatar with vibrant unread gradient rings
 * or refined watched subtle rings.
 */
export default function StoryAvatarRing({
  story,
  index,
  isSeen,
  isOwnStory,
  onClick,
}) {
  const [imgError, setImgError] = useState(false);

  const author = story.author;
  const authorName = author?.name || author?.displayName || 'Member';
  const avatarUrl = author?.avatar;
  const initials = authorName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'Z';

  return (
    <div
      onClick={() => onClick(index)}
      className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group select-none transition-transform active:scale-95"
      role="button"
      tabIndex={0}
      aria-label={`View story by ${authorName}${isSeen ? ' (already viewed)' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(index);
        }
      }}
    >
      {/* Outer Ring with Seen / Unseen Distinction */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-200 group-hover:scale-105 ${
          isSeen
            ? 'p-[2px] bg-white/[0.12] ring-1 ring-white/10 opacity-75 group-hover:opacity-100'
            : 'p-[2.5px] bg-gradient-to-tr from-emerald-400 via-teal-400 to-brand-mint shadow-[0_0_14px_rgba(52,211,153,0.35)] ring-1 ring-brand-mint/40'
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
                isSeen ? 'text-text-muted' : 'text-brand-mint'
              }`}
            >
              {initials}
            </span>
          )}
        </div>
      </div>

      {/* Author Name Tag */}
      <span className="text-[11px] font-medium text-text-muted group-hover:text-white transition-colors truncate max-w-[68px] text-center">
        {isOwnStory ? 'Your story' : authorName.split(' ')[0]}
      </span>
    </div>
  );
}
