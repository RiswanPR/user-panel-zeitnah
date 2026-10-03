import React from 'react';
import { Image, Video, HelpCircle, Send } from 'lucide-react';

/**
 * ComposerCollapsed — Compact media-first composer bar.
 * Matches Section 18 specification with avatar prompt and Photo/Video/Question/Post triggers.
 */
export default function ComposerCollapsed({
  avatarUrl,
  userInitials,
  onExpand,
  onMediaClick,
  onVideoClick,
  onQuestionClick,
}) {
  return (
    <div
      onClick={onExpand}
      className="bg-[#0B111E] border border-white/[0.07] hover:border-brand-mint/20 hover:bg-[#0D1424] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-3.5 sm:p-4 transition-all duration-200 cursor-pointer group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
      aria-label="Create a post"
    >
      {/* Top Input Trigger Row */}
      <div className="flex items-center gap-3 mb-3">
        {/* User Avatar */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0E1726] ring-1 ring-white/[0.1] group-hover:ring-brand-mint/40 shrink-0 overflow-hidden flex items-center justify-center transition-all duration-200">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-brand-mint select-none tracking-wider">
              {userInitials}
            </span>
          )}
        </div>

        {/* Prompt Field */}
        <div className="flex-1 min-w-0">
          <div className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] group-hover:bg-white/[0.06] border border-white/[0.06] text-text-faint text-xs sm:text-sm font-normal truncate transition-all">
            Share something with the community...
          </div>
        </div>
      </div>

      {/* Bottom Quick Action Strip */}
      <div
        className="flex items-center justify-between pt-2 border-t border-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Photo Trigger */}
          <button
            type="button"
            onClick={onMediaClick}
            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-brand-mint hover:bg-brand-mint/10 transition-colors flex items-center gap-2 cursor-pointer"
            aria-label="Attach Photo"
          >
            <Image className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Photo</span>
          </button>

          {/* Video Trigger */}
          <button
            type="button"
            onClick={onVideoClick || onMediaClick}
            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-brand-mint hover:bg-brand-mint/10 transition-colors flex items-center gap-2 cursor-pointer"
            aria-label="Attach Video"
          >
            <Video className="w-4 h-4 text-teal-400" />
            <span className="font-medium">Video</span>
          </button>

          {/* Question Trigger */}
          <button
            type="button"
            onClick={onQuestionClick || onExpand}
            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-brand-mint hover:bg-brand-mint/10 transition-colors flex items-center gap-2 cursor-pointer"
            aria-label="Ask a Question"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline font-medium">Question</span>
          </button>
        </div>

        {/* Post Button */}
        <button
          type="button"
          onClick={onExpand}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-mint/10 hover:bg-brand-mint text-brand-mint hover:text-[#0B111E] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          aria-label="Open post composer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Post</span>
        </button>
      </div>
    </div>
  );
}
