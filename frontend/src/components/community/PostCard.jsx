import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  MoreHorizontal,
  Bookmark,
  Heart,
  Flame,
  Star,
  Lightbulb,
  Trash2,
  Sparkles,
  Check,
  Send,
  Loader2,
  Flag,
} from 'lucide-react';
import Badge from '../ui/Badge';
import { AuthContext } from '../../context/AuthContext';
import {
  useReactToPost,
  useDeletePost,
  useSavePost,
  useRemoveSavedPost,
  useComments,
  useCreateComment,
  useDeleteComment,
} from '../../hooks/useCommunity';
import { getCanonicalProfileUrl } from '../../utils/roleNavigation';
import toast from 'react-hot-toast';

const reactions = [
  { id: 'like', icon: Heart, label: 'Like', color: 'text-rose-500', fill: 'fill-rose-500' },
  { id: 'love', icon: Flame, label: 'Love', color: 'text-amber-500', fill: 'fill-amber-500' },
  { id: 'celebrate', icon: Star, label: 'Celebrate', color: 'text-yellow-400', fill: 'fill-yellow-400' },
  { id: 'insightful', icon: Lightbulb, label: 'Insightful', color: 'text-brand-mint', fill: 'fill-brand-mint' },
];

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

function PostCard({ post }) {
  const { user } = useContext(AuthContext);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const menuRef = useRef(null);
  const pickerRef = useRef(null);

  const reactMutation = useReactToPost();
  const deleteMutation = useDeletePost();
  const saveMutation = useSavePost();
  const unsaveMutation = useRemoveSavedPost();

  const postId = post._id || post.id;
  const currentUserId = user?._id || user?.id || user?.userId;
  const postAuthorId = post.author?._id || post.author?.id || post.authorId;
  const isOwner = Boolean(
    currentUserId && postAuthorId && String(currentUserId) === String(postAuthorId)
  );
  const isAdmin = user?.role === 'admin' || user?.primaryRole === 'ADMIN';

  const isLiked = !!post.isLikedByMe;
  const myReactionType = post.myReactionType || (isLiked ? 'like' : null);
  const isSaved = !!post.isSaved;

  // Comments Query & Mutations
  const { data: comments = [], isLoading: commentsLoading } = useComments(
    postId,
    showComments
  );
  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowReactionPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReact = (reactionId) => {
    setShowReactionPicker(false);
    reactMutation.mutate({ postId, type: reactionId });
  };

  const handleToggleLike = () => {
    handleReact(myReactionType || 'like');
  };

  const handleDelete = () => {
    setShowMenu(false);
    if (window.confirm('Are you sure you want to delete this post?')) {
      deleteMutation.mutate(postId);
    }
  };

  const handleToggleBookmark = () => {
    if (isSaved) {
      unsaveMutation.mutate(postId);
    } else {
      saveMutation.mutate(postId);
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    toast.success('Thank you. Post flagged for moderation review.');
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    createCommentMutation.mutate(
      {
        postId,
        data: { content: commentText.trim() },
      },
      {
        onSuccess: () => {
          setCommentText('');
        },
      }
    );
  };

  const handleDeleteComment = (commentId) => {
    if (window.confirm('Delete this comment?')) {
      deleteCommentMutation.mutate({ commentId, postId });
    }
  };

  const activeReaction = myReactionType
    ? reactions.find((r) => r.id === myReactionType)
    : null;
  const ActiveIcon = activeReaction ? activeReaction.icon : Heart;

  const authorName =
    post.author?.name || post.author?.displayName || 'Zeitnah Member';
  const authorProfileUrl = getCanonicalProfileUrl(post.author);
  const authorAvatar = post.author?.avatar;
  const authorInitials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0B111E]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-4 sm:p-6 mb-4 group overflow-hidden transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={authorProfileUrl}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0 overflow-hidden border border-white/[0.1] bg-[#0E1726] flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label={`View ${authorName}'s profile`}
          >
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-xs font-bold text-brand-mint">
                {authorInitials}
              </span>
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={authorProfileUrl}
                className="text-sm sm:text-[15px] font-bold text-white hover:text-brand-mint transition-colors truncate max-w-[200px] sm:max-w-xs"
              >
                {authorName}
              </Link>

              {post.author?.role && post.author.role !== 'student' && (
                <Badge variant="primary" className="text-[9px] py-0 px-1.5 h-4 capitalize">
                  {post.author.role}
                </Badge>
              )}

              {post.acceptedAnswerId && (
                <div className="bg-brand-mint/20 text-brand-mint px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Answered
                </div>
              )}
            </div>

            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
              <span>{formatRelativeTime(post.createdAt)}</span>
              <span>•</span>
              <span className="capitalize">
                {String(post.audience || 'public').toLowerCase()}
              </span>
            </p>
          </div>
        </div>

        {/* Post Options Menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-2 text-text-muted hover:text-white hover:bg-white/[0.06] rounded-full transition-colors cursor-pointer"
            aria-label="Post options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 w-36 bg-[#0E1726] border border-white/[0.1] rounded-xl shadow-2xl z-30 py-1 overflow-hidden"
              >
                <button
                  onClick={handleReport}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report Post
                </button>

                {(isOwner || isAdmin) && (
                  <>
                    <div className="h-px w-full bg-white/[0.06] my-1" />
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center justify-between"
                    >
                      <span>Delete</span>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        {post.aiSummary && (
          <div className="mb-3 p-3 bg-brand-mint/10 border border-brand-mint/20 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1 text-brand-mint">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Summary</span>
            </div>
            <p className="text-sm text-text-secondary">{post.aiSummary}</p>
          </div>
        )}

        {post.content && (
          <p className="text-sm sm:text-[15px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </p>
        )}

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-xs font-medium text-brand-mint/90 bg-brand-mint/10 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media Rendering */}
      {post.media?.length > 0 && (
        <div
          className={`grid gap-2 mb-4 rounded-xl overflow-hidden ${
            post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {post.media.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0E1726] aspect-video flex items-center justify-center relative"
            >
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  controls
                  playsInline
                  className="w-full h-full object-cover bg-black"
                />
              ) : (
                <img
                  src={item.url}
                  alt="Post attachment"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs font-medium text-text-muted pb-3 border-b border-white/[0.06] mb-2">
        <div className="flex items-center gap-1.5">
          {post.stats?.likes > 0 && (
            <div className="flex -space-x-1 items-center">
              <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center ring-1 ring-[#0B111E]">
                <Heart className="w-2.5 h-2.5 text-white fill-current" />
              </div>
            </div>
          )}
          <span>{post.stats?.likes || 0} reactions</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowComments((prev) => !prev)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            {post.stats?.comments || 0} comments
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Reaction Button & Picker */}
          <div
            className="relative"
            ref={pickerRef}
            onMouseEnter={() => setShowReactionPicker(true)}
            onMouseLeave={() => setShowReactionPicker(false)}
          >
            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.92 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-full left-0 mb-2 bg-[#0E1726] border border-white/[0.12] rounded-full shadow-2xl p-1.5 flex items-center gap-1 z-30"
                >
                  {reactions.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleReact(r.id)}
                      className={`p-2 rounded-full hover:bg-white/[0.08] transition-transform transform hover:scale-125 cursor-pointer ${r.color}`}
                      title={r.label}
                      aria-label={`React with ${r.label}`}
                    >
                      <r.icon className={`w-5 h-5 ${r.fill}`} />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isLiked
                  ? `${activeReaction?.color || 'text-rose-500'} bg-white/[0.06]`
                  : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
              }`}
              aria-label={isLiked ? 'Unlike post' : 'Like post'}
            >
              <ActiveIcon
                className={`w-4 h-4 ${isLiked ? (activeReaction?.fill || 'fill-current') : ''}`}
              />
              <span className="hidden sm:inline">
                {activeReaction ? activeReaction.label : 'Like'}
              </span>
            </button>
          </div>

          {/* Comment Toggle Button */}
          <button
            onClick={() => setShowComments((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              showComments
                ? 'text-brand-mint bg-brand-mint/10'
                : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
            }`}
            aria-label="Toggle comments"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Comment</span>
            {post.stats?.comments > 0 && (
              <span className="sm:hidden text-[10px]">({post.stats.comments})</span>
            )}
          </button>
        </div>

        {/* Bookmark Button */}
        <button
          onClick={handleToggleBookmark}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isSaved
              ? 'text-yellow-400 bg-yellow-400/10'
              : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
          }`}
          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark post'}
          title={isSaved ? 'Saved' : 'Save'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments Drawer / Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 pt-4 border-t border-white/[0.06] overflow-hidden"
          >
            {/* New Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2.5 mb-4">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint/50 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-text-faint focus:outline-none transition-colors"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || createCommentMutation.isPending}
                className="px-3.5 py-2 bg-brand-mint text-bg-base font-semibold rounded-xl text-xs flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                        className="w-7 h-7 rounded-full shrink-0 overflow-hidden border border-white/[0.08] bg-[#0E1726] flex items-center justify-center"
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default React.memo(PostCard, (prevProps, nextProps) => {
  return (
    prevProps.post._id === nextProps.post._id &&
    prevProps.post.isLikedByMe === nextProps.post.isLikedByMe &&
    prevProps.post.myReactionType === nextProps.post.myReactionType &&
    prevProps.post.isSaved === nextProps.post.isSaved &&
    prevProps.post.stats?.likes === nextProps.post.stats?.likes &&
    prevProps.post.stats?.comments === nextProps.post.stats?.comments &&
    prevProps.post.isLocked === nextProps.post.isLocked &&
    prevProps.post.acceptedAnswerId === nextProps.post.acceptedAnswerId &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.aiSummary === nextProps.post.aiSummary &&
    prevProps.post.media?.length === nextProps.post.media?.length
  );
});
