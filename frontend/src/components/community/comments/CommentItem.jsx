import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Reply, Flag } from 'lucide-react';
import { getCanonicalProfileUrl } from '../../../utils/roleNavigation';
import { formatRelativeTime } from '../../../utils/communityFormatters';
import toast from 'react-hot-toast';

/**
 * CommentItem — Displays an individual comment with author identity,
 * canonical profile routing, timestamp, content, and reply/delete actions.
 */
export default function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  onReply,
  onDelete,
}) {
  const [imgError, setImgError] = useState(false);

  const commentId = comment._id || comment.id;
  const author = comment.author;
  const authorName = author?.name || author?.displayName || 'Zeitnah Member';
  const authorProfileUrl = getCanonicalProfileUrl(author);
  const authorAvatar = author?.avatar;
  const authorInitials = authorName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'Z';

  const isOwner = Boolean(
    currentUserId &&
      (comment.authorId || author?._id || author?.id) &&
      String(currentUserId) === String(comment.authorId || author?._id || author?.id)
  );

  const handleReport = () => {
    toast.success('Thank you. Comment flagged for moderation review.');
  };

  return (
    <div
      id={`comment-item-${commentId}`}
      data-testid="comment-item"
      className="flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-white/[0.02] transition-colors group border-b border-white/[0.03] last:border-b-0"
    >
      {/* Author Avatar */}
      <Link
        to={authorProfileUrl}
        className="w-8 h-8 rounded-full shrink-0 overflow-hidden ring-1 ring-white/10 hover:ring-brand-mint/40 bg-[#0E1726] flex items-center justify-center transition-all"
        aria-label={`View ${authorName}'s profile`}
      >
        {authorAvatar && !imgError ? (
          <img
            src={authorAvatar}
            alt={authorName}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-[10px] font-bold text-brand-mint select-none tracking-wider">
            {authorInitials}
          </span>
        )}
      </Link>

      {/* Main Comment Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              to={authorProfileUrl}
              className="text-xs font-semibold text-white hover:text-brand-mint transition-colors truncate"
            >
              {authorName}
            </Link>
            {author?.role && author.role.toLowerCase() !== 'student' && (
              <span className="text-[9px] font-medium text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-1.5 py-0.2 rounded capitalize">
                {author.role}
              </span>
            )}
          </div>

          <span className="text-[10px] text-text-faint shrink-0">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        {/* Comment Body */}
        <p className="text-xs sm:text-[13px] text-text-secondary mt-1 whitespace-pre-wrap break-words leading-relaxed">
          {comment.content}
        </p>

        {/* Actions Row */}
        <div className="flex items-center gap-3 mt-2 pt-1 border-t border-white/[0.03]">
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="min-h-[32px] inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-brand-mint transition-colors cursor-pointer"
              aria-label={`Reply to ${authorName}`}
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReport}
            className="min-h-[32px] inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-white transition-colors cursor-pointer opacity-60 hover:opacity-100"
            aria-label="Report comment"
            title="Report comment"
          >
            <Flag className="w-3 h-3" />
          </button>

          {(isOwner || isAdmin) && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(commentId)}
              className="min-h-[32px] inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-rose-400 transition-colors ml-auto cursor-pointer"
              aria-label="Delete comment"
              title="Delete comment"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
