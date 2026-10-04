import { useState, useContext, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Send, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { AuthContext } from '../../../../context/AuthContext';
import {
  useReactToPost,
  useDeletePost,
  useSavePost,
  useRemoveSavedPost,
  useRepostPost,
  useUnrepostPost,
  useComments,
  useCreateComment,
  useDeleteComment,
} from '../../../../hooks/useCommunity';
import { getCanonicalProfileUrl } from '../../../../utils/roleNavigation';
import { formatRelativeTime } from '../../../../utils/communityFormatters';
import toast from 'react-hot-toast';

import PostHeader from './PostHeader';
import PostContent from './PostContent';
import PostMedia from './PostMedia';
import PostActions from './PostActions';
import RepostAttribution from '../../reposts/RepostAttribution';
import QuotedPost from '../../reposts/QuotedPost';

/**
 * PostCard — Orchestrator component for Zeitnah Community posts.
 * Premium Instagram-level social feed core implementing the clear hierarchy:
 * AUTHOR → CONTENT → MEDIA → META / TOPIC → ACTIONS → ENGAGEMENT → COMMENTS
 */
function PostCard({ post, onOpenComments, isActiveCommentPost }) {
  const { user } = useContext(AuthContext);
  const [localShowComments, setLocalShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const reactMutation = useReactToPost();
  const deleteMutation = useDeletePost();
  const saveMutation = useSavePost();
  const unsaveMutation = useRemoveSavedPost();
  const repostMutation = useRepostPost();
  const unrepostMutation = useUnrepostPost();

  const postId = post._id || post.id;
  const currentUserId = user?._id || user?.id || user?.userId;
  const postAuthorId = post.author?._id || post.author?.id || post.authorId;
  const isOwner = Boolean(
    currentUserId && postAuthorId && String(currentUserId) === String(postAuthorId)
  );
  const isAdmin = user?.role === 'admin' || user?.primaryRole === 'ADMIN';

  const isRepost = post.postType === 'repost';
  const isQuote = post.postType === 'quote';
  const isOriginalDeleted = isRepost && (!post.originalPost || post.originalPost.isDeleted);

  // If this is a pure repost, the canonical post is post.originalPost
  const displayPost = isRepost && post.originalPost ? post.originalPost : post;
  const canonicalPostId = isRepost
    ? (post.originalPost?._id || post.originalPost?.id || post.originalPostId || postId)
    : postId;

  // Action targets:
  // For pure reposts: reactions, bookmarks, comments attach to original post
  // For quote posts: reactions, bookmarks, comments attach to quote post (postId)
  const targetActionPostId = isRepost ? canonicalPostId : postId;

  const isLiked = !!post.isLikedByMe;
  const myReactionType = post.myReactionType || (isLiked ? 'like' : null);
  const isSaved = !!post.isSaved;
  const isReposted = Boolean(post.isRepostedByMe);
  const hasMedia = Array.isArray(displayPost.media) && displayPost.media.length > 0;
  const commentCount = displayPost.stats?.comments || 0;

  // Comments state: driven by onOpenComments or fallback local state
  const isCommentsActive = onOpenComments ? Boolean(isActiveCommentPost) : localShowComments;

  // Standalone fallback: only fetch comments if not using centralized CommentDrawer and locally open
  const { data: comments = [], isLoading: commentsLoading } = useComments(
    targetActionPostId,
    !onOpenComments && localShowComments
  );
  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();

  const handleToggleComments = useCallback(() => {
    if (onOpenComments) {
      onOpenComments(displayPost);
    } else {
      setLocalShowComments((prev) => !prev);
    }
  }, [onOpenComments, displayPost]);

  const handleReact = useCallback((reactionId) => {
    reactMutation.mutate({ postId: targetActionPostId, type: reactionId });
  }, [reactMutation, targetActionPostId]);

  const handleDoubleTapLike = useCallback(() => {
    if (!isLiked) {
      reactMutation.mutate({ postId: targetActionPostId, type: 'like' });
    }
  }, [isLiked, reactMutation, targetActionPostId]);

  const handleDelete = useCallback(() => {
    const confirmMessage = isRepost
      ? 'Are you sure you want to remove this repost?'
      : 'Are you sure you want to delete this post?';
    if (window.confirm(confirmMessage)) {
      deleteMutation.mutate(postId);
    }
  }, [isRepost, deleteMutation, postId]);

  const handleToggleBookmark = useCallback(() => {
    if (isSaved) {
      unsaveMutation.mutate(targetActionPostId);
    } else {
      saveMutation.mutate(targetActionPostId);
    }
  }, [isSaved, unsaveMutation, saveMutation, targetActionPostId]);

  const isRepostPending = repostMutation.isPending || unrepostMutation.isPending;

  const handleToggleRepost = useCallback(() => {
    if (isRepostPending) return;
    if (isReposted) {
      unrepostMutation.mutate(canonicalPostId);
    } else {
      repostMutation.mutate(canonicalPostId);
    }
  }, [isRepostPending, isReposted, unrepostMutation, repostMutation, canonicalPostId]);

  const handleReport = useCallback(() => {
    toast.success('Thank you. Post flagged for moderation review.');
  }, []);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    createCommentMutation.mutate(
      {
        postId: targetActionPostId,
        data: { content: commentText.trim() },
      },
      {
        onSuccess: () => {
          setCommentText('');
        },
      }
    );
  };

  const handleDeleteComment = useCallback((commentId) => {
    if (window.confirm('Delete this comment?')) {
      deleteCommentMutation.mutate({ commentId, postId: targetActionPostId });
    }
  }, [deleteCommentMutation, targetActionPostId]);

  return (
    <motion.article
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.05 : 0.18, ease: 'easeOut' }}
      className="zn-card bg-[#0B111E] border border-white/[0.07] hover:border-brand-mint/20 hover:bg-[#0D1424] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-4 sm:p-5 mb-4 group overflow-hidden transition-colors duration-200"
    >
      {/* 0. Repost Attribution Header if post is a repost */}
      {isRepost && <RepostAttribution author={post.author} />}

      {/* If original post is deleted/inaccessible */}
      {isOriginalDeleted ? (
        <div className="my-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-text-muted flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-text-muted/60" aria-hidden="true" />
            <span>Original post unavailable</span>
          </div>
          {(isOwner || isAdmin) && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-text-muted hover:text-rose-400 p-1.5 transition-colors cursor-pointer"
              aria-label="Remove unavailable repost"
              title="Remove repost"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 1. AUTHOR: Header & Identity */}
          <PostHeader
            post={displayPost}
            postId={isRepost ? postId : targetActionPostId}
            author={displayPost.author}
            isOwner={isOwner}
            isAdmin={isAdmin}
            onDelete={handleDelete}
            onReport={handleReport}
          />

          {/* 2. CONTENT: Caption / Body / AI Summary */}
          {displayPost.content && (
            <PostContent
              author={displayPost.author}
              content={displayPost.content}
              aiSummary={displayPost.aiSummary}
              tags={!hasMedia ? displayPost.tags : undefined}
              isMediaPost={false}
            />
          )}

          {/* 3. MEDIA: Media-First High-Impact Presentation */}
          {hasMedia && (
            <PostMedia media={displayPost.media} onDoubleTapLike={handleDoubleTapLike} />
          )}

          {/* 4. META / TOPIC: Hashtags for media posts */}
          {hasMedia && displayPost.tags && displayPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-0.5 my-2">
              {displayPost.tags.map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="text-[12px] font-medium text-brand-mint/80 hover:text-brand-mint hover:underline transition-colors cursor-pointer select-none"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {/* Quoted Post Embed (if quote post) */}
          {isQuote && <QuotedPost originalPost={post.originalPost} />}

          {/* 5. ACTIONS & ENGAGEMENT: Unified Interaction Bar */}
          <PostActions
            postId={targetActionPostId}
            post={displayPost}
            isLiked={isLiked}
            myReactionType={myReactionType}
            isSaved={isSaved}
            isReposted={isReposted}
            showComments={isCommentsActive}
            onReact={handleReact}
            onToggleComments={handleToggleComments}
            onToggleBookmark={handleToggleBookmark}
            onToggleRepost={handleToggleRepost}
            isRepostPending={isRepostPending}
          />

          {/* 6. COMMENTS: Quick Teaser to open CommentDrawer */}
          {commentCount > 0 && onOpenComments && (
            <button
              type="button"
              onClick={handleToggleComments}
              className="text-xs text-text-muted hover:text-white pt-1.5 px-1 transition-colors block text-left cursor-pointer select-none"
              aria-label={`View all ${commentCount} comments`}
            >
              View all {commentCount.toLocaleString()} {commentCount === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </>
      )}

      {/* Standalone Inline Comments (Active only if no parent CommentDrawer is provided) */}
      <AnimatePresence>
        {!onOpenComments && localShowComments && !isOriginalDeleted && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 pt-4 border-t border-white/[0.06] overflow-hidden"
            aria-label="Post comments"
          >
            {/* New Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2.5 mb-4">
              <input
                id={`comment-input-${postId}`}
                data-testid="comment-input"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint/50 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-text-faint focus:outline-none transition-colors"
                maxLength={500}
              />
              <button
                id={`comment-submit-${postId}`}
                data-testid="comment-submit"
                type="submit"
                disabled={!commentText.trim() || createCommentMutation.isPending}
                className="min-h-[40px] px-3.5 py-2 bg-brand-mint text-bg-base font-semibold rounded-xl text-xs flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Submit comment"
              >
                {createCommentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            {/* Comments List */}
            {commentsLoading ? (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-brand-mint/30 border-t-brand-mint rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-xs text-text-faint py-3">
                No comments yet. Start the conversation!
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {comments.map((comment) => {
                  const commentId = comment._id || comment.id;
                  const cAuthorName =
                    comment.author?.name ||
                    comment.author?.displayName ||
                    'Zeitnah Member';
                  const cProfileUrl = getCanonicalProfileUrl(comment.author);
                  const isCommentOwner = Boolean(
                    currentUserId &&
                      comment.authorId &&
                      String(currentUserId) === String(comment.authorId)
                  );

                  return (
                    <div
                      key={commentId}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                    >
                      <Link
                        to={cProfileUrl}
                        className="w-7 h-7 rounded-full shrink-0 overflow-hidden ring-1 ring-white/[0.08] bg-[#0E1726] flex items-center justify-center"
                        aria-label={`View ${cAuthorName}'s profile`}
                      >
                        {comment.author?.avatar ? (
                          <img
                            src={comment.author.avatar}
                            alt={cAuthorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-brand-mint">
                            {cAuthorName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={cProfileUrl}
                            className="text-xs font-semibold text-white hover:text-brand-mint transition-colors truncate"
                          >
                            {cAuthorName}
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-faint">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                            {(isCommentOwner || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(commentId)}
                                className="text-text-faint hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                                aria-label="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default memo(PostCard, (prevProps, nextProps) => {
  const prevId = prevProps.post?._id || prevProps.post?.id;
  const nextId = nextProps.post?._id || nextProps.post?.id;

  return (
    prevId === nextId &&
    prevProps.isActiveCommentPost === nextProps.isActiveCommentPost &&
    prevProps.post?.isLikedByMe === nextProps.post?.isLikedByMe &&
    prevProps.post?.myReactionType === nextProps.post?.myReactionType &&
    prevProps.post?.isSaved === nextProps.post?.isSaved &&
    prevProps.post?.isRepostedByMe === nextProps.post?.isRepostedByMe &&
    prevProps.post?.stats?.likes === nextProps.post?.stats?.likes &&
    prevProps.post?.stats?.comments === nextProps.post?.stats?.comments &&
    prevProps.post?.stats?.reposts === nextProps.post?.stats?.reposts &&
    prevProps.post?.postType === nextProps.post?.postType &&
    prevProps.post?.isLocked === nextProps.post?.isLocked &&
    prevProps.post?.acceptedAnswerId === nextProps.post?.acceptedAnswerId &&
    prevProps.post?.content === nextProps.post?.content &&
    prevProps.post?.aiSummary === nextProps.post?.aiSummary &&
    prevProps.post?.media?.length === nextProps.post?.media?.length &&
    prevProps.post?.originalPost?._id === nextProps.post?.originalPost?._id
  );
});
