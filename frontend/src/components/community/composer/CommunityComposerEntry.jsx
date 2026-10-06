import { useState } from 'react';
import { PenSquare, Film, Clock, Sparkles } from 'lucide-react';

/**
 * CommunityComposerEntry — Phase 3 Premium Creation Entry Point.
 *
 * Provides an intentional, calm, and editorial gateway into creating Posts,
 * Reels, and Stories without duplicating the studios.
 *
 * Designed to wow with refined dark surface aesthetics, subtle brand accents,
 * 44px+ touch targets, and accessible keyboard navigation.
 */
export default function CommunityComposerEntry({
  user,
  onOpenCreatePost,
  onOpenCreateReel,
  onOpenCreateStory,
}) {
  const [avatarError, setAvatarError] = useState(false);

  const userName = user?.name || user?.username || 'Member';
  const userAvatar = user?.avatar || user?.profilePicture || user?.avatarUrl;
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'Z';

  return (
    <div
      className="bg-[#0B111E]/85 backdrop-blur-xl border border-white/[0.07] hover:border-white/[0.12] rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 select-none"
      role="region"
      aria-label="Create content"
    >
      {/* Top row: Avatar + Welcoming input bar */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 overflow-hidden ring-1 ring-white/10 bg-[#0E1726] flex items-center justify-center">
          {userAvatar && !avatarError ? (
            <img
              src={userAvatar}
              alt={userName}
              onError={() => setAvatarError(true)}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xs font-bold text-brand-mint tracking-wider">
              {userInitials}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenCreatePost}
          className="flex-1 min-h-[44px] text-left px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-brand-mint/30 text-xs sm:text-sm text-text-muted hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-mint/40"
          aria-label="What would you like to share? Click to create a post"
        >
          <span>What would you like to share, {userName.split(' ')[0]}?</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.05] my-3" />

      {/* Action choices: Post | Reel | Story */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Post Action */}
        <button
          type="button"
          onClick={onOpenCreatePost}
          className="group min-h-[44px] p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-brand-mint/30 transition-all text-left flex items-center sm:flex-col sm:items-start gap-2.5 sm:gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-mint/40"
          aria-label="Create Post: Share an idea, update or resource"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-brand-mint transition-colors">
            <PenSquare className="w-4 h-4 text-brand-mint shrink-0" />
            <span>Post</span>
          </div>
          <p className="text-[11px] text-text-muted line-clamp-1 leading-snug">
            Share an idea, update or resource.
          </p>
        </button>

        {/* Reel Action */}
        <button
          type="button"
          onClick={onOpenCreateReel}
          className="group min-h-[44px] p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-brand-mint/30 transition-all text-left flex items-center sm:flex-col sm:items-start gap-2.5 sm:gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-mint/40"
          aria-label="Create Reel: Share a short video"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-brand-mint transition-colors">
            <Film className="w-4 h-4 text-brand-mint shrink-0" />
            <span>Reel</span>
          </div>
          <p className="text-[11px] text-text-muted line-clamp-1 leading-snug">
            Share a short vertical video.
          </p>
        </button>

        {/* Story Action */}
        <button
          type="button"
          onClick={onOpenCreateStory}
          className="group min-h-[44px] p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-brand-yellow/30 transition-all text-left flex items-center sm:flex-col sm:items-start gap-2.5 sm:gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-yellow/40"
          aria-label="Create Story: Share something for the next 24 hours"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-brand-yellow transition-colors">
            <Clock className="w-4 h-4 text-brand-yellow shrink-0" />
            <span>Story</span>
          </div>
          <p className="text-[11px] text-text-muted line-clamp-1 leading-snug">
            Share moments for 24 hours.
          </p>
        </button>
      </div>
    </div>
  );
}
