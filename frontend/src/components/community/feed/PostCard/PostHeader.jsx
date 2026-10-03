import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Flag, Trash2, Check, Globe, Users, Lock } from 'lucide-react';
import Badge from '../../../ui/Badge';
import { getCanonicalProfileUrl } from '../../../../utils/roleNavigation';
import { formatRelativeTime } from '../../../../utils/communityFormatters';

export { formatRelativeTime };

/**
 * PostHeader — Polished author identity and post options dropdown
 */
export default function PostHeader({
  post,
  postId,
  author,
  isOwner,
  isAdmin,
  onDelete,
  onReport,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);

  const authorName = author?.name || author?.displayName || 'Zeitnah Member';
  const authorProfileUrl = getCanonicalProfileUrl(author);
  const authorAvatar = author?.avatar;
  const authorUsername = author?.username ? `@${author.username.replace(/^@/, '')}` : null;

  const authorInitials = authorName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'Z';

  // Outside click and ESC listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu]);

  const audienceLabel = String(post?.audience || 'PUBLIC').toUpperCase();

  return (
    <div className="flex items-start justify-between gap-3 mb-3.5">
      {/* Author Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to={authorProfileUrl}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0 overflow-hidden ring-1 ring-white/10 hover:ring-brand-mint/40 bg-[#0E1726] flex items-center justify-center transition-all duration-200"
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
            <span className="text-xs font-bold text-brand-mint select-none tracking-wider">
              {authorInitials}
            </span>
          )}
        </Link>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Link
              to={authorProfileUrl}
              className="text-sm sm:text-[15px] font-semibold text-white hover:text-brand-mint transition-colors truncate max-w-[180px] sm:max-w-xs"
            >
              {authorName}
            </Link>

            {authorUsername && (
              <span className="hidden sm:inline text-xs text-text-faint truncate max-w-[120px]">
                {authorUsername}
              </span>
            )}

            {author?.role && author.role.toLowerCase() !== 'student' && (
              <Badge variant="mint" size="sm" className="py-0 px-1.5 h-4 text-[10px] capitalize font-medium">
                {author.role}
              </Badge>
            )}

            {post?.acceptedAnswerId && (
              <div className="bg-brand-mint/15 text-brand-mint px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border border-brand-mint/20">
                <Check className="w-3 h-3" /> Answered
              </div>
            )}
          </div>

          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
            <span>{formatRelativeTime(post?.createdAt)}</span>
            <span className="text-white/20">•</span>
            <span className="capitalize text-text-muted text-[11px]">
              {audienceLabel === 'PUBLIC' ? 'Public' : audienceLabel === 'COURSE' ? 'Course' : 'Private'}
            </span>
          </p>
        </div>
      </div>

      {/* Post Options Menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          id={`options-btn-${postId}`}
          data-testid="post-options-btn"
          type="button"
          onClick={() => setShowMenu((prev) => !prev)}
          className="min-w-[44px] min-h-[44px] p-2 text-text-muted hover:text-white hover:bg-white/[0.06] rounded-full transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-brand-mint"
          aria-label="Post options"
          aria-expanded={showMenu}
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
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onReport?.();
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                Report Post
              </button>

              {(isOwner || isAdmin) && (
                <>
                  <div className="h-px w-full bg-white/[0.06] my-1" />
                  <button
                    id={`delete-btn-${postId}`}
                    data-testid="post-delete-btn"
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete?.();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center justify-between cursor-pointer"
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
  );
}
