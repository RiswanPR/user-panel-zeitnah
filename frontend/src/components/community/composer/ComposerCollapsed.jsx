import { Image, Video, HelpCircle, Send } from 'lucide-react';
import BrandAmbientShape from '../ui/BrandAmbientShape';
import BusinessLogo from '../../business/BusinessLogo';

/**
 * ComposerCollapsed — Compact media-first composer bar.
 * Matches Section 18 specification with avatar prompt and Photo/Video/Question/Post triggers.
 * Fully supports Personal and Company active profile modes.
 */
export default function ComposerCollapsed({
  avatarUrl,
  userInitials,
  onExpand,
  onMediaClick,
  onVideoClick,
  onQuestionClick,
  isBusinessMode = false,
  business = null,
}) {
  return (
    <div
      onClick={onExpand}
      className="relative overflow-hidden zn-card p-3.5 sm:p-4 transition-all duration-200 cursor-pointer group hover:border-brand-mint/25"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
      aria-label={
        isBusinessMode && business
          ? `Create a post as ${business.name}`
          : 'Create a post'
      }
    >
      {/* Organic Z Ambient Accent on Hover */}
      <BrandAmbientShape variant="composer" intensity="subtle" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {/* Top Input Trigger Row */}
      <div className="flex items-center gap-3 mb-3">
        {/* User or Company Avatar */}
        {isBusinessMode && business ? (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-surface-elevated ring-1 ring-brand-mint/30 group-hover:ring-brand-mint/60 shrink-0 overflow-hidden flex items-center justify-center transition-all duration-200">
            <BusinessLogo
              logo={business.logo}
              name={business.name}
              size="md"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface-elevated ring-1 ring-border group-hover:ring-brand-mint/40 shrink-0 overflow-hidden flex items-center justify-center transition-all duration-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-brand-mint select-none tracking-wider">
                {userInitials}
              </span>
            )}
          </div>
        )}

        {/* Prompt Field */}
        <div className="flex-1 min-w-0">
          <div className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated/40 group-hover:bg-surface-elevated/80 border border-border text-text-faint text-xs sm:text-sm font-normal truncate transition-all flex items-center justify-between">
            <span className="truncate">
              {isBusinessMode && business
                ? `What would ${business.name} like to share?`
                : 'Share something with the community...'}
            </span>
            {isBusinessMode && business && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-mint/15 text-brand-mint font-semibold uppercase tracking-wider shrink-0 border border-brand-mint/20 hidden sm:inline-block ml-2">
                Company
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Quick Action Strip */}
      <div
        className="flex items-center justify-between pt-2 border-t border-border"
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
            <Image className="w-4 h-4 text-brand-mint" />
            <span className="font-medium">Photo</span>
          </button>

          {/* Video Trigger */}
          <button
            type="button"
            onClick={onVideoClick || onMediaClick}
            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-brand-mint hover:bg-brand-mint/10 transition-colors flex items-center gap-2 cursor-pointer"
            aria-label="Attach Video"
          >
            <Video className="w-4 h-4 text-brand-mint/80" />
            <span className="font-medium">Video</span>
          </button>

          {/* Question Trigger */}
          <button
            type="button"
            onClick={onQuestionClick || onExpand}
            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-brand-yellow hover:bg-brand-yellow/10 transition-colors flex items-center gap-2 cursor-pointer"
            aria-label="Ask a Question"
          >
            <HelpCircle className="w-4 h-4 text-brand-yellow" />
            <span className="hidden xs:inline font-medium">Question</span>
          </button>
        </div>

        {/* Post Button */}
        <button
          type="button"
          onClick={onExpand}
          className="zn-btn-primary min-h-[44px] px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
          aria-label="Open post composer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Post</span>
        </button>
      </div>
    </div>
  );
}
