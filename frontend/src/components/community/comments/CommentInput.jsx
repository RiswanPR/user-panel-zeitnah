import React, { useRef, useEffect } from 'react';
import { Send, Loader2, X } from 'lucide-react';

/**
 * CommentInput — Sticky comment input bar with reply context indicator,
 * avatar, keyboard submit, and mobile safe-area support.
 */
export default function CommentInput({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  replyingTo,
  onCancelReply,
  avatarUrl,
  userInitials,
  placeholder = 'Write a comment...',
}) {
  const inputRef = useRef(null);

  // Auto-focus input when entering reply mode
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || isSubmitting) return;
    onSubmit();
  };

  const replyAuthorName = replyingTo?.author?.name || replyingTo?.author?.displayName || 'member';

  return (
    <div className="bg-[#0B111E] border-t border-white/[0.08] p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      {/* Replying Context Bar */}
      {replyingTo && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between px-3 py-1.5 mb-2.5 rounded-lg bg-brand-mint/10 border border-brand-mint/20 text-xs"
        >
          <span className="text-brand-mint font-medium truncate">
            Replying to <span className="font-semibold">@{replyAuthorName}</span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            className="min-h-[44px] min-w-[44px] p-2 -mr-1 rounded-full text-text-muted hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-brand-mint"
            aria-label="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#0E1726] ring-1 ring-white/10 shrink-0 overflow-hidden flex items-center justify-center hidden sm:flex">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-brand-mint select-none tracking-wider">
              {userInitials || 'Z'}
            </span>
          )}
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            id="comment-drawer-input"
            data-testid="comment-drawer-input"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={replyingTo ? `Reply to @${replyAuthorName}...` : placeholder}
            maxLength={500}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint/50 focus:bg-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-text-faint focus:outline-none transition-all"
          />
        </div>

        {/* Submit Button */}
        <button
          id="comment-drawer-submit"
          data-testid="comment-drawer-submit"
          type="submit"
          disabled={!value.trim() || isSubmitting}
          className="min-h-[44px] min-w-[44px] px-3.5 py-2.5 bg-brand-mint text-bg-base font-semibold rounded-xl text-xs flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mint/50"
          aria-label="Post comment"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
