import React from 'react';
import { MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import CommentItem from './CommentItem';
import CommentSkeleton from './CommentSkeleton';

/**
 * CommentList — Renders comment thread with loading skeletons, empty state,
 * error handling, and scrollable container.
 */
export default function CommentList({
  comments = [],
  isLoading,
  isError,
  currentUserId,
  isAdmin,
  onReply,
  onDelete,
  onRetry,
}) {
  if (isLoading) {
    return <CommentSkeleton count={3} />;
  }

  if (isError) {
    return (
      <div className="py-8 px-4 text-center">
        <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-2">
          <AlertCircle className="w-5 h-5" />
        </div>
        <p className="text-xs text-text-muted mb-3">Comments couldn't be loaded.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-mint"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        )}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="py-12 px-4 text-center select-none" data-testid="comments-empty-state">
        <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] text-text-faint flex items-center justify-center mx-auto mb-3">
          <MessageCircle className="w-6 h-6 opacity-60" />
        </div>
        <h4 className="text-sm font-semibold text-white mb-1">No comments yet</h4>
        <p className="text-xs text-text-muted max-w-[220px] mx-auto leading-relaxed">
          Start the conversation with an engineering insight, question, or project feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 py-1">
      {comments.map((comment) => (
        <CommentItem
          key={comment._id || comment.id}
          comment={comment}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onReply={onReply}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
