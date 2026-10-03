import { useState, useRef } from 'react';
import { MessageCircle, Bookmark, Share2, Repeat2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactionBar from './ReactionBar';
import RepostMenu from '../../reposts/RepostMenu';
import QuotePostModal from '../../reposts/QuotePostModal';

/**
 * PostActions — Media-first action bar with 44px minimum touch targets,
 * interactive reaction picker, comment toggle, repost toggle/quote menu,
 * share with link copy, bookmark toggle, and clean engagement hierarchy.
 */
export default function PostActions({
  postId,
  post,
  isLiked,
  myReactionType,
  isSaved,
  isReposted,
  showComments,
  onReact,
  onToggleComments,
  onToggleBookmark,
  onToggleRepost,
}) {
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const repostTriggerRef = useRef(null);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/community#${postId}`;
    let copied = false;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Zeitnah Community',
          text: post?.content ? post.content.slice(0, 100) : 'Check out this post on Zeitnah Community',
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        // Fallback to execCommand if permission error
      }
    }

    if (!copied) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      toast.success('Link copied');
    } else {
      toast.error('Unable to copy link');
    }
  };

  const reactionCount = post?.stats?.likes || 0;
  const repostCount = post?.stats?.reposts || 0;

  return (
    <div className="pt-1">
      {/* 1. Primary Action Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Reaction Trigger & Picker */}
          <ReactionBar
            postId={postId}
            isLiked={isLiked}
            myReactionType={myReactionType}
            onReact={onReact}
          />

          {/* Comment Toggle Button */}
          <button
            id={`comment-btn-${postId}`}
            data-testid="post-comment-btn"
            type="button"
            onClick={onToggleComments}
            className={`min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.96] ${
              showComments
                ? 'text-brand-mint bg-brand-mint/10 border border-brand-mint/20'
                : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
            }`}
            aria-label="Toggle comments"
            aria-expanded={showComments}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Comment</span>
          </button>

          {/* Repost Action Button & Accessible Menu */}
          <div className="relative">
            <button
              id={`repost-btn-${postId}`}
              ref={repostTriggerRef}
              data-testid="post-repost-btn"
              type="button"
              onClick={() => setShowRepostMenu((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={showRepostMenu}
              className={`min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.96] ${
                isReposted
                  ? 'text-brand-mint bg-brand-mint/10 hover:bg-brand-mint/20 border border-brand-mint/20'
                  : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
              }`}
              aria-label={isReposted ? 'Reposted. Click to change' : 'Repost or quote post'}
              title={isReposted ? 'Reposted' : 'Repost'}
            >
              <Repeat2 className={`w-4 h-4 ${isReposted ? 'text-brand-mint' : ''}`} />
              <span className="hidden sm:inline font-medium">
                {isReposted ? 'Reposted' : 'Repost'}
              </span>
            </button>

            <RepostMenu
              isOpen={showRepostMenu}
              onClose={() => setShowRepostMenu(false)}
              isReposted={isReposted}
              onToggleRepost={onToggleRepost}
              onQuote={() => setShowQuoteModal(true)}
              triggerRef={repostTriggerRef}
            />
          </div>

          {/* Share Button */}
          <button
            type="button"
            data-testid="post-share-btn"
            onClick={handleShare}
            className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-brand-mint/10 hover:text-brand-mint transition-all duration-150 cursor-pointer active:scale-[0.96]"
            aria-label="Share post"
            title="Copy link to post"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Share</span>
          </button>
        </div>

        {/* Bookmark Button — Brand Yellow Accent */}
        <button
          id={`bookmark-btn-${postId}`}
          data-testid="post-bookmark-btn"
          type="button"
          onClick={onToggleBookmark}
          className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-[0.96] ${
            isSaved
              ? 'text-brand-yellow bg-brand-yellow/10 hover:bg-brand-yellow/20 border border-brand-yellow/30 shadow-[0_0_12px_rgba(246,237,74,0.18)]'
              : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
          }`}
          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark post'}
          title={isSaved ? 'Saved' : 'Save'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* 2. Engagement Metadata Line (Clean, Calm Hierarchy) */}
      {(reactionCount > 0 || repostCount > 0) && (
        <div className="flex items-center gap-2 text-xs font-semibold text-white/90 pt-2 px-1">
          {reactionCount > 0 && (
            <span>
              {reactionCount.toLocaleString()} {reactionCount === 1 ? 'reaction' : 'reactions'}
            </span>
          )}
          {reactionCount > 0 && repostCount > 0 && (
            <span className="text-white/20">•</span>
          )}
          {repostCount > 0 && (
            <span className="text-text-muted font-normal">
              {repostCount.toLocaleString()} {repostCount === 1 ? 'repost' : 'reposts'}
            </span>
          )}
        </div>
      )}

      {/* Quote Post Modal */}
      {showQuoteModal && (
        <QuotePostModal
          isOpen={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          targetPost={post}
          triggerRef={repostTriggerRef}
        />
      )}
    </div>
  );
}
