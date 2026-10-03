import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play, Send, Trash2, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useViewStory } from '../../../hooks/useCommunity';
import { communityApi } from '../../../services/communityApi';
import { getCanonicalProfileUrl } from '../../../utils/roleNavigation';
import { formatRelativeTime } from '../../../utils/communityFormatters';
import { AuthContext } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const STORY_DURATION_MS = 5000;

/**
 * StoryViewer — Fullscreen premium story modal with segmented progress,
 * pause/resume on hold, gesture navigation, keyboard controls, and reply bar.
 */
export default function StoryViewer({ stories = [], initialIndex = 0, onClose }) {
  const { user } = useContext(AuthContext);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const startTimeRef = useRef(0);
  const animationRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  const currentStory = stories[currentIndex] || null;
  const viewMutation = useViewStory();

  const currentUserId = user?._id || user?.id || user?.userId;
  const storyAuthorId = currentStory?.author?._id || currentStory?.author?.id || currentStory?.authorId;
  const isOwner = Boolean(
    currentUserId && storyAuthorId && String(currentUserId) === String(storyAuthorId)
  );
  const isAdmin = user?.role === 'admin' || user?.primaryRole === 'ADMIN';

  // Mark story as viewed on switch
  useEffect(() => {
    if (currentStory) {
      setMediaLoaded(false);
      setMediaError(false);
      viewMutation.mutate(currentStory._id || currentStory.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentStory]);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      progressRef.current = 0;
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      progressRef.current = 0;
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      progressRef.current = 0;
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  }, [currentIndex]);

  // Body scroll lock and focus restoration
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      if (previousActiveElementRef.current?.focus) {
        previousActiveElementRef.current.focus();
      }
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === ' ' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  // Timer progression using smooth requestAnimationFrame (without per-frame effect re-mounting)
  useEffect(() => {
    startTimeRef.current = Date.now() - (progressRef.current / 100) * STORY_DURATION_MS;

    const animate = () => {
      if (isPaused) {
        startTimeRef.current = Date.now() - (progressRef.current / 100) * STORY_DURATION_MS;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      progressRef.current = newProgress;
      setProgress(newProgress);

      if (newProgress >= 100) {
        handleNext();
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentIndex, isPaused, handleNext]);

  // Touch gesture handling: Swipe Left (Next), Swipe Right (Prev), Swipe Down (Close)
  const handleTouchStart = (e) => {
    setIsPaused(true);
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    if (touchStartXRef.current !== null && e.changedTouches && e.changedTouches[0]) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

      // Swipe Down to dismiss
      if (deltaY > 80 && Math.abs(deltaX) < 60) {
        onClose();
        return;
      }

      // Horizontal Swipes
      if (deltaX < -50) {
        handleNext();
      } else if (deltaX > 50) {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !currentStory || isSubmittingReply) return;

    try {
      setIsSubmittingReply(true);
      await communityApi.replyToStory(currentStory._id || currentStory.id, {
        content: replyText.trim(),
      });
      toast.success('Reply sent!');
      setReplyText('');
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    if (window.confirm('Delete this story?')) {
      try {
        await communityApi.deleteStory(currentStory._id || currentStory.id);
        toast.success('Story deleted');
        onClose();
      } catch {
        toast.error('Failed to delete story');
      }
    }
  };

  if (!currentStory) return null;

  const authorName = currentStory.author?.name || currentStory.author?.displayName || 'Zeitnah Member';
  const authorProfileUrl = getCanonicalProfileUrl(currentStory.author);
  const authorAvatar = currentStory.author?.avatar;
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  const mediaUrl = currentStory.media?.[0]?.url || currentStory.mediaUrl || currentStory.image;
  const isVideo =
    currentStory.media?.[0]?.type === 'video' ||
    (typeof mediaUrl === 'string' && mediaUrl.match(/\.(mp4|webm|mov)$/i));

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Story by ${authorName}`}
      >
        {/* Desktop Prev / Next Chevrons */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-all cursor-pointer z-30 shadow-lg border border-white/10"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {currentIndex < stories.length - 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-all cursor-pointer z-30 shadow-lg border border-white/10"
            aria-label="Next story"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Global Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full text-white transition-all z-50 cursor-pointer border border-white/10 shadow-lg"
          aria-label="Close story viewer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Main Story Stage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-[420px] h-[100dvh] sm:h-[86vh] sm:rounded-3xl bg-[#070B14] border border-white/[0.08] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Segmented Progress Bar */}
          <div className="absolute top-0 inset-x-0 pt-3 px-3 flex gap-1 z-30">
            {stories.map((s, idx) => (
              <div
                key={s._id || s.id || idx}
                className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all ease-linear"
                  style={{
                    width:
                      idx === currentIndex
                        ? `${progress}%`
                        : idx < currentIndex
                        ? '100%'
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author Header */}
          <div className="absolute top-6 inset-x-0 px-4 flex items-center justify-between z-30">
            <Link
              to={authorProfileUrl}
              onClick={onClose}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity min-w-0"
              aria-label={`View ${authorName}'s profile`}
            >
              <div className="w-9 h-9 rounded-full bg-[#0E1726] border border-white/[0.2] overflow-hidden flex items-center justify-center shrink-0">
                {authorAvatar ? (
                  <img
                    src={authorAvatar}
                    alt={authorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] font-bold text-brand-mint">
                    {authorInitials}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-white drop-shadow-sm truncate max-w-[170px]">
                  {authorName}
                </h4>
                <p className="text-[10px] text-white/70">
                  {formatRelativeTime(currentStory.createdAt)}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-1.5">
              {isVideo && (
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={isPaused ? 'Resume story' : 'Pause story'}
              >
                {isPaused ? (
                  <Play className="w-4 h-4 fill-current" />
                ) : (
                  <Pause className="w-4 h-4 fill-current" />
                )}
              </button>

              {(isOwner || isAdmin) && (
                <button
                  type="button"
                  onClick={handleDeleteStory}
                  className="p-2 rounded-full text-white/80 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Delete story"
                  aria-label="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Tap Area / Media Stage */}
          <div
            className="flex-1 relative bg-black flex items-center justify-center select-none overflow-hidden"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Click Tap Zones for Mobile & Desktop Navigation */}
            <div
              className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous story"
            />
            <div
              className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next story"
            />

            {/* Media Rendering */}
            {mediaError ? (
              <div className="p-6 text-center text-white/80 z-10">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                <p className="text-sm font-medium mb-2">Unable to load this story</p>
                <button
                  type="button"
                  onClick={() => setMediaError(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            ) : mediaUrl ? (
              isVideo ? (
                <video
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  onLoadedData={() => setMediaLoaded(true)}
                  onError={() => setMediaError(true)}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Story content"
                  onLoad={() => setMediaLoaded(true)}
                  onError={() => setMediaError(true)}
                  className="w-full h-full object-cover absolute inset-0"
                />
              )
            ) : (
              // Text Story Card
              <div
                className={`absolute inset-0 flex items-center justify-center p-6 ${
                  currentStory.backgroundColor ||
                  'bg-gradient-to-br from-[#0B111E] via-[#0E1726] to-[#121B2B]'
                }`}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-white text-center leading-relaxed max-w-xs break-words px-4">
                  {currentStory.text}
                </h2>
              </div>
            )}
          </div>

          {/* Sticky Reply Footer */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <form onSubmit={handleReply} className="flex gap-2">
              <input
                id="story-reply-input"
                data-testid="story-reply-input"
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                placeholder={`Reply to ${authorName}...`}
                className="flex-1 bg-white/[0.08] border border-white/20 focus:border-brand-mint/60 rounded-full px-4 py-2 text-xs sm:text-sm text-white placeholder-white/50 focus:outline-none transition-colors"
                maxLength={300}
              />
              <button
                id="story-reply-submit"
                data-testid="story-reply-submit"
                type="submit"
                disabled={!replyText.trim() || isSubmittingReply}
                className="p-2.5 rounded-full bg-brand-mint text-bg-base font-semibold hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 shadow-sm"
                aria-label="Send reply to story"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
