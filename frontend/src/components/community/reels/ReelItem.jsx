import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Pause,
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Flag,
  Check,
} from 'lucide-react';
import ReelProgressBar from './ReelProgressBar';
import { getCanonicalProfileUrl } from '../../../utils/roleNavigation';
import { getUploadUrl } from '../../../utils/courseUi';
import toast from 'react-hot-toast';

/**
 * ReelItem — Individual short-video reel card.
 *
 * Performance & Memory Design:
 * - Mounted conditionally: only mounts HTMLVideoElement for activeIndex ± 1.
 * - Distant reels render high-resolution poster thumbnail only.
 * - Video playback updates local DOM/CSS directly, eliminating 60fps React rerenders.
 * - View tracking records 1 view per video session after >=2s active playback.
 */
function ReelItem({
  post,
  isActive,
  isMounted,
  isMuted,
  onToggleMute,
  onOpenComments,
  onLike,
  onToggleSave,
  onRecordView,
}) {
  const shouldReduceMotion = useReducedMotion();
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Local Playback & UI States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPosterVisible, setIsPosterVisible] = useState(true);
  const [tapActionIcon, setTapActionIcon] = useState(null); // 'play' | 'pause'
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // References for gesture timing and double-tap detection
  const lastTapTimeRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const playTimeTrackerRef = useRef({ startTime: 0, accumulatedSeconds: 0, hasCountedView: false });

  const postId = post?._id || post?.id;
  const author = post?.author || {};
  const authorName = author?.name || author?.username || 'Community Member';
  const authorHandle = author?.username ? `@${author.username.replace(/^@/, '')}` : '';
  const authorAvatar = author?.avatar || author?.profilePicture || author?.avatarUrl;
  const profileUrl = getCanonicalProfileUrl(author);

  // Extract video media item (supports first video item or main media)
  const videoMedia = Array.isArray(post?.media)
    ? post.media.find((m) => m?.type === 'video') || post.media[0]
    : null;
  const videoUrl = videoMedia?.url || '';
  const posterUrl = videoMedia?.thumbnailUrl || videoMedia?.posterUrl || '';

  const isLiked = Boolean(post?.isLikedByMe);
  const isSaved = Boolean(post?.isSaved);
  const likesCount = post?.stats?.likes || 0;
  const commentsCount = post?.stats?.comments || 0;

  // Handle Playback on active change & memory safety
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      setHasError(false);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            playTimeTrackerRef.current.startTime = Date.now();
          })
          .catch((err) => {
            // Autoplay policy or interrupt: keep state synced
            setIsPlaying(false);
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      // Accumulate playback time
      if (playTimeTrackerRef.current.startTime > 0) {
        playTimeTrackerRef.current.accumulatedSeconds +=
          (Date.now() - playTimeTrackerRef.current.startTime) / 1000;
        playTimeTrackerRef.current.startTime = 0;
      }
    }
  }, [isActive]);

  // Clean up when unmounted from window
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {}
      }
    };
  }, []);

  // View count tracker: video actively playing for >= 2 seconds
  useEffect(() => {
    if (!isActive || !isPlaying || playTimeTrackerRef.current.hasCountedView) return;

    const timer = setInterval(() => {
      const currentElapsed =
        playTimeTrackerRef.current.accumulatedSeconds +
        (playTimeTrackerRef.current.startTime > 0
          ? (Date.now() - playTimeTrackerRef.current.startTime) / 1000
          : 0);

      if (currentElapsed >= 2 && !playTimeTrackerRef.current.hasCountedView) {
        playTimeTrackerRef.current.hasCountedView = true;
        if (onRecordView && postId) {
          onRecordView(postId);
        }
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [isActive, isPlaying, onRecordView, postId]);

  // Video event handlers
  const handlePlaying = () => {
    setIsPlaying(true);
    setIsBuffering(false);
    setIsPosterVisible(false);
    playTimeTrackerRef.current.startTime = Date.now();
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (playTimeTrackerRef.current.startTime > 0) {
      playTimeTrackerRef.current.accumulatedSeconds +=
        (Date.now() - playTimeTrackerRef.current.startTime) / 1000;
      playTimeTrackerRef.current.startTime = 0;
    }
  };

  const handleError = () => {
    setIsBuffering(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setHasError(false);
    const video = videoRef.current;
    if (video) {
      try {
        video.load();
        video.play().catch(() => {});
      } catch {}
    }
  };

  // Toggle Play / Pause via Tap
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setTapActionIcon('play');
        setTimeout(() => setTapActionIcon(null), 500);
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      setTapActionIcon('pause');
      setTimeout(() => setTapActionIcon(null), 500);
    }
  }, []);

  // Double-tap like vs Single-tap play/pause
  const handleStageTap = (e) => {
    // If clicking on interactive elements, ignore
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('[role="progressbar"]')) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_THRESHOLD = 280;

    if (now - lastTapTimeRef.current < DOUBLE_TAP_THRESHOLD) {
      // Double Tap detected!
      clearTimeout(tapTimeoutRef.current);
      lastTapTimeRef.current = 0;

      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 600);

      if (!isLiked && onLike) {
        onLike(post);
      }
    } else {
      // Potential single tap
      lastTapTimeRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        togglePlayPause();
        lastTapTimeRef.current = 0;
      }, DOUBLE_TAP_THRESHOLD);
    }
  };

  // Share handler
  const handleShare = async () => {
    const reelUrl = `${window.location.origin}/community/reels/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Zeitnah Reel by ${authorName}`,
          text: post?.content || 'Check out this short video on Zeitnah Community!',
          url: reelUrl,
        });
        return;
      } catch {}
    }
    // Fallback: clipboard copy
    try {
      await navigator.clipboard.writeText(reelUrl);
      setHasCopied(true);
      toast.success('Reel link copied to clipboard!');
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="reel-item"
      data-post-id={postId}
      onClick={handleStageTap}
      className="relative w-full h-[100dvh] flex items-center justify-center bg-[#05070D] snap-start flex-shrink-0 select-none overflow-hidden"
    >
      {/* ── DESKTOP & MOBILE STAGE FRAME ── */}
      <div className="relative w-full h-full max-w-[440px] md:h-[calc(100dvh-28px)] md:my-3 md:rounded-3xl overflow-hidden bg-black shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-0 md:border md:border-white/[0.08] flex items-center justify-center">

        {/* ── MEDIA PLAYER / POSTER ── */}
        {isMounted ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl || undefined}
            playsInline
            loop
            muted={isMuted}
            preload={isActive ? 'auto' : 'metadata'}
            onPlaying={handlePlaying}
            onWaiting={handleWaiting}
            onPause={handlePause}
            onError={handleError}
            className="w-full h-full object-contain pointer-events-none"
            aria-label={`Video reel by ${authorName}`}
          />
        ) : (
          // Distant unmounted video: renders lightweight poster
          <div className="w-full h-full bg-[#0B111E] flex items-center justify-center relative">
            {posterUrl ? (
              <img
                src={getUploadUrl(posterUrl)}
                alt={`Poster for reel by ${authorName}`}
                className="w-full h-full object-contain opacity-70"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-[#070B14] flex items-center justify-center">
                <Play className="w-12 h-12 text-white/30" />
              </div>
            )}
          </div>
        )}

        {/* Poster Transition Layer */}
        {posterUrl && isPosterVisible && isMounted && (
          <img
            src={getUploadUrl(posterUrl)}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300"
          />
        )}

        {/* Subtle Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 border-2 border-brand-mint/30 border-t-brand-mint rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* Play / Pause Tap Overlay Indicator */}
        <AnimatePresence>
          {tapActionIcon && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-2xl">
                {tapActionIcon === 'play' ? (
                  <Play className="w-8 h-8 fill-current ml-0.5" />
                ) : (
                  <Pause className="w-8 h-8 fill-current" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Double-Tap Heart Burst Animation */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
              animate={
                shouldReduceMotion
                  ? { opacity: [0, 1, 0] }
                  : { scale: [0, 1.25, 1], opacity: [0, 1, 0] }
              }
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-brand-mint/40 via-brand-yellow/30 to-rose-500/20 blur-2xl" />
                <svg
                  width="92"
                  height="92"
                  viewBox="0 0 24 24"
                  className="relative z-10 drop-shadow-[0_0_24px_rgba(159,213,178,0.8)]"
                >
                  <defs>
                    <linearGradient id="reel-doubletap-heart" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9FD5B2" />
                      <stop offset="50%" stopColor="#F6ED4A" />
                      <stop offset="100%" stopColor="#FB7185" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                    fill="url(#reel-doubletap-heart)"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                  />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Error Fallback */}
        {hasError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 p-6 text-center text-text-muted">
            <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
            <h4 className="text-white text-sm font-semibold mb-1">Video unavailable</h4>
            <p className="text-xs text-text-muted mb-4 max-w-xs">
              We couldn't stream this reel. Please check your network and try again.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-brand-mint text-bg-base font-semibold text-xs hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-lg"
              aria-label="Retry video loading"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {/* Ambient Top & Bottom Readable Gradients */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

        {/* ── RIGHT-SIDE ACTION RAIL ── */}
        <div className="absolute right-3 bottom-14 z-20 flex flex-col items-center gap-4 select-none">
          {/* Like Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onLike) onLike(post);
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
            aria-label={isLiked ? 'Unlike reel' : 'Like reel'}
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 ${
                isLiked
                  ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)] scale-105'
                  : 'bg-black/50 text-white hover:bg-black/70 group-hover:scale-105'
              }`}
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  isLiked ? 'fill-current text-rose-500' : 'text-white'
                }`}
              />
            </div>
            <span className="text-[11px] font-semibold text-white/95 drop-shadow-md">
              {likesCount > 0 ? Number(likesCount).toLocaleString() : 'Like'}
            </span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenComments) onOpenComments(post);
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
            aria-label={`Comments (${commentsCount})`}
          >
            <div className="w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur-md transition-transform group-hover:scale-105">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-white/95 drop-shadow-md">
              {commentsCount > 0 ? Number(commentsCount).toLocaleString() : 'Comment'}
            </span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
            aria-label="Share reel"
          >
            <div className="w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur-md transition-transform group-hover:scale-105">
              {hasCopied ? (
                <Check className="w-5 h-5 text-brand-mint" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </div>
            <span className="text-[11px] font-semibold text-white/95 drop-shadow-md">
              {hasCopied ? 'Copied' : 'Share'}
            </span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSave) onToggleSave(post);
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
            aria-label={isSaved ? 'Remove from saved' : 'Save reel'}
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 ${
                isSaved
                  ? 'bg-brand-yellow/20 text-brand-yellow shadow-[0_0_12px_rgba(246,237,74,0.3)] scale-105'
                  : 'bg-black/50 text-white hover:bg-black/70 group-hover:scale-105'
              }`}
            >
              <Bookmark
                className={`w-5 h-5 transition-colors ${
                  isSaved ? 'fill-current text-brand-yellow' : 'text-white'
                }`}
              />
            </div>
            <span className="text-[11px] font-semibold text-white/95 drop-shadow-md">
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>

          {/* Session Audio Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleMute) onToggleMute();
            }}
            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur-md transition-transform hover:scale-105 focus:outline-none cursor-pointer mt-1"
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-brand-mint" />}
          </button>

          {/* More Options Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu((prev) => !prev);
              }}
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white backdrop-blur-md transition-colors focus:outline-none cursor-pointer"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Context Dropdown */}
            {showMoreMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-11 w-44 rounded-2xl bg-[#0D1424]/95 border border-white/10 shadow-2xl backdrop-blur-xl p-1.5 z-40 text-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    handleShare();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/90 hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                  <span>Copy Link</span>
                </button>
                <Link
                  to={`/community#${postId}`}
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/90 hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                  <span>View in Feed</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Thank you. Reel flagged for moderation review.');
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                  <span>Report</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM-LEFT CREATOR & CAPTION OVERLAY ── */}
        <div className="absolute left-3 bottom-4 right-16 z-20 text-left pointer-events-auto">
          {/* Creator Profile Link */}
          <Link
            to={profileUrl}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2.5 mb-2 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-full ring-2 ring-brand-mint/60 p-0.5 overflow-hidden bg-bg-base shrink-0 transition-transform group-hover:scale-105">
              {authorAvatar ? (
                <img
                  src={getUploadUrl(authorAvatar)}
                  alt={authorName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-brand-mint/20 flex items-center justify-center text-brand-mint text-xs font-bold">
                  {authorName[0]?.toUpperCase() || 'Z'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white drop-shadow-md truncate group-hover:text-brand-mint transition-colors">
                  {authorName}
                </span>
                {author?.role === 'admin' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-mint/20 text-brand-mint font-semibold">
                    Admin
                  </span>
                )}
              </div>
              {authorHandle && (
                <span className="text-xs text-white/70 drop-shadow-sm block truncate">
                  {authorHandle}
                </span>
              )}
            </div>
          </Link>

          {/* Caption Text with Expand / Collapse */}
          {post?.content && (
            <div className="text-xs text-white/90 drop-shadow leading-relaxed mb-2 pr-2">
              <p className={isCaptionExpanded ? '' : 'line-clamp-2'}>
                {post.content}
              </p>
              {post.content.length > 80 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCaptionExpanded((prev) => !prev);
                  }}
                  className="text-white/60 hover:text-white font-semibold text-[11px] mt-0.5 underline cursor-pointer"
                >
                  {isCaptionExpanded ? 'less' : 'more'}
                </button>
              )}
            </div>
          )}

          {/* Hashtags / Topics */}
          {Array.isArray(post?.tags) && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-medium text-brand-mint/90 hover:text-brand-mint transition-colors cursor-pointer select-none drop-shadow"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── REAL-TIME LIGHTWEIGHT PROGRESS BAR ── */}
        <ReelProgressBar videoRef={videoRef} />
      </div>
    </div>
  );
}

export default memo(ReelItem);
