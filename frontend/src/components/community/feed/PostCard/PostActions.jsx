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
  isRepostPending = false,
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
    <div className="pt-2 px-3.5 sm:px-4">
      {/* 1. Primary Action Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 sm:gap-1 -ml-2 sm:-ml-2.5">
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
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-90 motion-reduce:transform-none ${
              showComments
                ? 'text-brand-mint bg-brand-mint/10'
                : 'text-text-muted hover:text-white hover:bg-white/[0.05]'
            }`}
            aria-label="Toggle comments"
            aria-expanded={showComments}
            title="Comment"
          >
            <MessageCircle className="w-5 h-5" />
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
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-90 motion-reduce:transform-none ${
                isReposted
                  ? 'text-brand-mint bg-brand-mint/10'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.05]'
              }`}
              aria-label={isReposted ? 'Reposted. Click to change' : 'Repost or quote post'}
              title={isReposted ? 'Reposted' : 'Repost'}
            >
              <Repeat2 className={`w-5 h-5 ${isReposted ? 'text-brand-mint' : ''}`} />
            </button>

            <RepostMenu
              isOpen={showRepostMenu}
              onClose={() => setShowRepostMenu(false)}
              isReposted={isReposted}
              onToggleRepost={onToggleRepost}
              onQuote={() => setShowQuoteModal(true)}
              triggerRef={repostTriggerRef}
              isPending={isRepostPending}
            />
          </div>

          {/* Share Button */}
          <button
            type="button"
            data-testid="post-share-btn"
            onClick={handleShare}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.05] transition-all duration-150 cursor-pointer active:scale-90 motion-reduce:transform-none"
            aria-label="Share post"
            title="Copy link to post"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmark Button — Brand Yellow Accent */}
        <button
          id={`bookmark-btn-${postId}`}
          data-testid="post-bookmark-btn"
          type="button"
          onClick={onToggleBookmark}
          className={`min-h-[44px] min-w-[44px] -mr-2 sm:-mr-2.5 p-2 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-90 motion-reduce:transform-none ${
            isSaved
              ? 'text-brand-yellow hover:text-brand-yellow/90'
              : 'text-text-muted hover:text-white hover:bg-white/[0.05]'
          }`}
          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark post'}
          title={isSaved ? 'Saved' : 'Save'}
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* 2. Engagement Metadata Line (Clean, Calm Hierarchy) */}
      {(reactionCount > 0 || repostCount > 0) && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white/95 pt-1.5 pb-0.5">
          {reactionCount > 0 && (
            <span>
              {reactionCount.toLocaleString()} {reactionCount === 1 ? 'like' : 'likes'}
            </span>
          )}
          {reactionCount > 0 && repostCount > 0 && (
            <span className="text-white/20">·</span>
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
