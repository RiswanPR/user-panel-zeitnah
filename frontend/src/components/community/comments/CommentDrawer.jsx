import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { useComments, useCreateComment, useDeleteComment } from '../../../hooks/useCommunity';
import { getUploadUrl } from '../../../utils/courseUi';
import CommentList from './CommentList';
import CommentInput from './CommentInput';

/**
 * CommentDrawer — Responsive contextual conversation layer.
 * Displays as a right-side drawer on Desktop (>=768px) and a bottom sheet on Mobile (<768px).
 * Features focus trap management, body scroll locking, escape dismissal, and reply threading.
 */
export default function CommentDrawer({ isOpen, post, onClose }) {
  const { user } = useContext(AuthContext);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const shouldReduceMotion = useReducedMotion();
  const previousActiveElementRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const postId = post?._id || post?.id;
  const currentUserId = user?._id || user?.id || user?.userId;
  const isAdmin = user?.role === 'admin' || user?.primaryRole === 'ADMIN';

  // Only fetch comments when the drawer is open for this specific post
  const {
    data: comments = [],
    isLoading,
    isError,
    refetch,
  } = useComments(postId, isOpen);

  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();

  // Focus management & body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Auto focus the input after mount
      const timer = setTimeout(() => {
        const input = document.getElementById('comment-drawer-input');
        if (input) input.focus();
      }, 150);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        if (previousActiveElementRef.current?.focus) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleSubmitComment = () => {
    if (!commentText.trim() || createCommentMutation.isPending || !postId) return;

    // Prepend mention if in reply mode
    let contentToSubmit = commentText.trim();
    if (replyingTo?.author?.username) {
      const handle = `@${replyingTo.author.username.replace(/^@/, '')}`;
      if (!contentToSubmit.includes(handle)) {
        contentToSubmit = `${handle} ${contentToSubmit}`;
      }
    }

    createCommentMutation.mutate(
      {
        postId,
        data: { content: contentToSubmit },
      },
      {
        onSuccess: () => {
          setCommentText('');
          setReplyingTo(null);
        },
      }
    );
  };

  const handleDeleteComment = (commentId) => {
    if (window.confirm('Delete this comment?')) {
      deleteCommentMutation.mutate({ commentId, postId });
    }
  };

  const handleReplyTo = (comment) => {
    setReplyingTo(comment);
    const input = document.getElementById('comment-drawer-input');
    if (input) input.focus();
  };

  if (!isOpen && !post) return null;

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'Z'
    : 'Z';
  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;
  const commentCount = comments.length || post?.stats?.comments || 0;
  const postAuthorName = post?.author?.name || post?.author?.displayName || 'Member';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex justify-end items-end sm:items-stretch"
          role="dialog"
          aria-modal="true"
          aria-label="Comments"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer / Sheet Container */}
          <motion.div
            ref={drawerRef}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : isDesktop
                ? { x: '100%', opacity: 0.5 }
                : { y: '100%', opacity: 0.5 }
            }
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : isDesktop
                ? { x: '100%', opacity: 0 }
                : { y: '100%', opacity: 0 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.1 }
                : { type: 'spring', damping: 30, stiffness: 350 }
            }
            className={`
              relative z-10 w-full bg-[#0B111E] border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden
              /* Mobile bottom sheet */
              max-h-[85vh] h-[82vh] rounded-t-3xl border-t
              /* Desktop right drawer >= 768px */
              md:max-h-full md:h-full md:w-[420px] lg:w-[440px] md:rounded-none md:border-t-0 md:border-l
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 md:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-brand-mint" />
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Comments
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-text-muted text-xs font-semibold">
                  {commentCount}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close comments"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mini Context Banner (Post Excerpt) */}
            {post && (
              <div className="px-4 sm:px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.04] shrink-0">
                <p className="text-[11px] text-text-muted truncate">
                  Post by <span className="text-white font-medium">{postAuthorName}</span>: {post.content}
                </p>
              </div>
            )}

            {/* Scrollable Comment List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-3">
              <CommentList
                comments={comments}
                isLoading={isLoading}
                isError={isError}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onReply={handleReplyTo}
                onDelete={handleDeleteComment}
                onRetry={refetch}
              />
            </div>

            {/* Sticky Bottom Input */}
            <CommentInput
              value={commentText}
              onChange={setCommentText}
              onSubmit={handleSubmitComment}
              isSubmitting={createCommentMutation.isPending}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              avatarUrl={avatarUrl}
              userInitials={userInitials}
              placeholder="Write a comment..."
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
