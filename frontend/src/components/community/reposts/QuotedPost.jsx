import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Film, Image as ImageIcon } from 'lucide-react';
import { getCanonicalProfileUrl } from '../../../utils/roleNavigation';
import { formatRelativeTime } from '../feed/PostCard/PostHeader';

/**
 * QuotedPost — Embedded preview of the original canonical post.
 * Includes graceful fallback for deleted/unavailable originals
 * and nesting protection (renders maximum 1 embedded depth).
 */
export default function QuotedPost({ originalPost }) {
  // Graceful fallback for deleted or inaccessible original posts
  if (!originalPost || originalPost.isDeleted) {
    return (
      <div className="my-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-text-muted flex items-center gap-2 select-none">
        <AlertCircle className="w-4 h-4 text-text-muted/60 shrink-0" aria-hidden="true" />
        <span>This post is no longer available.</span>
      </div>
    );
  }

  const author = originalPost.author;
  const authorName = author?.name || author?.displayName || author?.username || 'Zeitnah Member';
  const profileUrl = getCanonicalProfileUrl(author);
  const mediaItems = Array.isArray(originalPost.media) ? originalPost.media : [];

  return (
    <div className="my-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] p-3.5 transition-all text-left overflow-hidden">
      {/* Author Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={profileUrl}
            className="w-5 h-5 rounded-full overflow-hidden ring-1 ring-white/[0.1] bg-[#0E1726] shrink-0 flex items-center justify-center"
            title={`View ${authorName}'s profile`}
          >
            {author?.avatar ? (
              <img
                src={author.avatar}
                alt={authorName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-[9px] font-bold text-brand-mint">
                {authorName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </Link>
          <Link
            to={profileUrl}
            className="text-xs font-semibold text-text-secondary hover:text-white transition-colors truncate"
          >
            {authorName}
          </Link>
          {author?.username && (
            <span className="text-[11px] text-text-muted truncate hidden sm:inline">
              @{author.username}
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-muted shrink-0">
          {formatRelativeTime(originalPost.createdAt)}
        </span>
      </div>

      {/* Content */}
      {originalPost.content && (
        <p className="text-xs text-text-secondary line-clamp-3 whitespace-pre-wrap break-words mb-2 leading-relaxed">
          {originalPost.content}
        </p>
      )}

      {/* Media Preview (Compact) */}
      {mediaItems.length > 0 && (
        <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.06] max-h-48 bg-black/40">
          {mediaItems[0].type === 'video' ? (
            <div className="relative aspect-video flex items-center justify-center bg-black/60">
              <Film className="w-6 h-6 text-white/50" />
            </div>
          ) : (
            <img
              src={mediaItems[0].url}
              alt="Quoted media preview"
              className="w-full max-h-48 object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}
    </div>
  );
}
