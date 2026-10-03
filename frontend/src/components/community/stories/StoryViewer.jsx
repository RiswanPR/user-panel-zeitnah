import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  Pause,
  Play,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useViewStory } from '../../../hooks/useCommunity';
import { communityApi } from '../../../services/communityApi';
import { getCanonicalProfileUrl } from '../../../utils/roleNavigation';
import { formatRelativeTime } from '../../../utils/communityFormatters';
import { groupStoriesByUser } from '../../../utils/storyGrouping';
import { AuthContext } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import BrandAmbientShape from '../ui/BrandAmbientShape';

const STORY_DURATION_MS = 5000;

/**
 * StoryViewer — Fullscreen premium story modal with segmented progress per user,
 * multi-user sequential transitions, video mute toggle, hold-to-pause, gestures,
 * keyboard controls, and reply bar.
 */
export default function StoryViewer({
  stories = [],
  userGroups = null,
  initialUserIndex = 0,
  initialStoryIndex = 0,
  initialIndex = 0, // legacy fallback index
  onClose,
}) {
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.id || user?.userId;

  // Normalized User Groups: use provided userGroups or group the raw stories
  const normalizedGroups = useMemo(() => {
    if (Array.isArray(userGroups) && userGroups.length > 0) {
      return userGroups;
    }
    const { allGroups } = groupStoriesByUser(stories, currentUserId);
    return allGroups;
  }, [userGroups, stories, currentUserId]);

  // Determine starting indices
  const resolvedInitialGroupIndex = useMemo(() => {
    if (userGroups && userGroups.length > 0) {
      return Math.min(Math.max(0, initialUserIndex), userGroups.length - 1);
    }
    if (stories.length > 0 && initialIndex > 0) {
      const targetStory = stories[initialIndex];
      const targetAuthorId = targetStory?.author?._id || targetStory?.author?.id || targetStory?.authorId;
      const foundIdx = normalizedGroups.findIndex((g) => g.userId === String(targetAuthorId));
      return foundIdx !== -1 ? foundIdx : 0;
    }
    return 0;
  }, [userGroups, initialUserIndex, stories, initialIndex, normalizedGroups]);

  const [currentGroupIndex, setCurrentGroupIndex] = useState(resolvedInitialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex || 0);
  const shouldReduceMotion = useReducedMotion();

  const activeGroup = normalizedGroups[currentGroupIndex] || null;
  const activeStories = activeGroup?.stories || [];
  const currentStory = activeStories[currentStoryIndex] || null;

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
  const videoRef = useRef(null);

  const viewMutation = useViewStory();

  const storyAuthorId = activeGroup?.userId || currentStory?.authorId;
  const isOwner = Boolean(
    currentUserId && storyAuthorId && String(currentUserId) === String(storyAuthorId)
  );
  const isAdmin = user?.role === 'admin' || user?.primaryRole === 'ADMIN';

  // Mark story as viewed whenever active story changes
  useEffect(() => {
    if (currentStory) {
      setMediaLoaded(false);
      setMediaError(false);
      progressRef.current = 0;
      setProgress(0);
      startTimeRef.current = Date.now();
      const storyId = currentStory._id || currentStory.id;
      if (storyId) {
        viewMutation.mutate(storyId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupIndex, currentStoryIndex, currentStory?._id]);

  // Navigate to Next Story or Next User Group
  const handleNext = useCallback(() => {
    if (currentStoryIndex < activeStories.length - 1) {
      // Advance to next story in current user's group
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (currentGroupIndex < normalizedGroups.length - 1) {
      // Current user's stories finished -> Advance to next user group!
      setCurrentGroupIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      // Last story of last user group -> Close viewer
      onClose?.();
    }
  }, [currentStoryIndex, activeStories.length, currentGroupIndex, normalizedGroups.length, onClose]);

  // Navigate to Previous Story or Previous User Group
  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      // Go to previous story in current user's group
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (currentGroupIndex > 0) {
      // Go to previous user group's last story
      const prevGroup = normalizedGroups[currentGroupIndex - 1];
      const prevStories = prevGroup?.stories || [];
      setCurrentGroupIndex((prev) => prev - 1);
      setCurrentStoryIndex(Math.max(0, prevStories.length - 1));
    } else {
      // Restart current story progress
      progressRef.current = 0;
      setProgress(0);
      startTimeRef.current = Date.now();
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [currentStoryIndex, currentGroupIndex, normalizedGroups]);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  // Timer progression using requestAnimationFrame
  useEffect(() => {
    if (!currentStory) return;

    startTimeRef.current = Date.now() - (progressRef.current / 100) * STORY_DURATION_MS;

    const animate = () => {
      if (isPaused) {
        startTimeRef.current = Date.now() - (progressRef.current / 100) * STORY_DURATION_MS;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // If video, calculate progress based on video playback currentTime if available
      let newProgress;
      if (videoRef.current && videoRef.current.duration) {
        newProgress = Math.min(
          100,
          (videoRef.current.currentTime / videoRef.current.duration) * 100
        );
      } else {
        const elapsed = Date.now() - startTimeRef.current;
        newProgress = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      }

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
  }, [currentGroupIndex, currentStoryIndex, currentStory, isPaused, handleNext]);

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
        onClose?.();
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
        onClose?.();
      } catch {
        toast.error('Failed to delete story');
      }
    }
  };

  if (!activeGroup || !currentStory) return null;

  const authorName = activeGroup.displayName || 'Zeitnah Member';
  const authorProfileUrl = getCanonicalProfileUrl({
    id: activeGroup.userId,
    username: activeGroup.username,
  });
  const authorAvatar = activeGroup.avatar;
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  const mediaUrl =
    currentStory.media?.[0]?.url ||
    currentStory.mediaUrl ||
    currentStory.image ||
    '';
  const isVideo =
    currentStory.type === 'VIDEO' ||
    currentStory.media?.[0]?.type === 'video' ||
    (typeof mediaUrl === 'string' && Boolean(mediaUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i)));

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl select-none"
        role="dialog"
        aria-modal="true"
        aria-label={`Story by ${authorName}`}
      >
        {/* Desktop Prev Button (Left Chevron) */}
        {(currentStoryIndex > 0 || currentGroupIndex > 0) && (
          <button
            type="button"
            onClick={handlePrev}
            className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white items-center justify-center transition-all cursor-pointer z-30 shadow-lg border border-white/10"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Desktop Next Button (Right Chevron) */}
        {(currentStoryIndex < activeStories.length - 1 ||
          currentGroupIndex < normalizedGroups.length - 1) && (
          <button
            type="button"
            onClick={handleNext}
            className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white items-center justify-center transition-all cursor-pointer z-30 shadow-lg border border-white/10"
            aria-label="Next story"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Global Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 sm:top-6 sm:right-6 p-2.5 bg-black/40 hover:bg-black/60 active:scale-95 rounded-full text-white transition-all z-50 cursor-pointer border border-white/10 shadow-lg"
          aria-label="Close story viewer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ambient Brand & Blurred Media Background */}
        <BrandAmbientShape variant="viewer" opacity={0.9} />
        {mediaUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 pointer-events-none scale-110 transition-all duration-700 select-none overflow-hidden"
            style={{ backgroundImage: `url(${mediaUrl})` }}
            aria-hidden="true"
          />
        )}

        {/* Main Story Container (Edge-to-edge on mobile, rounded card on desktop) */}
        <motion.div
          key={`${activeGroup.userId}-${currentStory._id || currentStoryIndex}`}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: -4 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[430px] h-[100dvh] sm:h-[88vh] sm:rounded-3xl bg-[#070B14] border border-white/[0.1] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)] flex flex-col z-20"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Segmented Progress Bar: One segment per story in active user's group */}
          <div className="absolute top-0 inset-x-0 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-3 px-3.5 flex gap-1.5 z-30">
            {activeStories.map((s, idx) => (
              <div
                key={s._id || s.id || idx}
                className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
              >
                <div
                  className={`h-full transition-all ease-linear ${
                    idx === currentStoryIndex
                      ? 'bg-gradient-to-r from-brand-mint via-[#D4E37A] to-brand-yellow shadow-[0_0_8px_rgba(159,213,178,0.6)]'
                      : 'bg-white'
                  }`}
                  style={{
                    width:
                      idx === currentStoryIndex
                        ? `${progress}%`
                        : idx < currentStoryIndex
                        ? '100%'
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author Header */}
          <div className="absolute top-[calc(1.75rem+env(safe-area-inset-top))] sm:top-6 inset-x-0 px-4 flex items-center justify-between z-30">
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
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-white drop-shadow-sm truncate max-w-[160px]">
                    {authorName}
                  </h4>
                  {activeStories.length > 1 && (
                    <span className="text-[10px] text-white/50 font-normal">
                      {currentStoryIndex + 1}/{activeStories.length}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/70">
                  {formatRelativeTime(currentStory.createdAt)}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-1.5">
              {/* Video Mute Toggle */}
              {isVideo && (
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all cursor-pointer"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Pause / Play Toggle */}
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all cursor-pointer"
                aria-label={isPaused ? 'Resume story' : 'Pause story'}
              >
                {isPaused ? (
                  <Play className="w-4 h-4 fill-white" />
                ) : (
                  <Pause className="w-4 h-4 fill-white" />
                )}
              </button>

              {/* Delete Story Button for Author or Admin */}
              {(isOwner || isAdmin) && (
                <button
                  type="button"
                  onClick={handleDeleteStory}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-rose-600/80 text-white transition-all cursor-pointer"
                  title="Delete story"
                  aria-label="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Tap Zones (Left 35% = Prev, Right 65% = Next) */}
          <div className="absolute inset-0 z-20 flex">
            <div
              className="w-[35%] h-full cursor-pointer"
              onClick={handlePrev}
              aria-label="Previous story tap zone"
            />
            <div
              className="w-[65%] h-full cursor-pointer"
              onClick={handleNext}
              aria-label="Next story tap zone"
            />
          </div>

          {/* Media Stage */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {isVideo && mediaUrl ? (
              <video
                ref={videoRef}
                key={mediaUrl}
                src={mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                loop={false}
                muted={isMuted}
                onLoadedData={() => setMediaLoaded(true)}
                onError={() => setMediaError(true)}
                onEnded={handleNext}
              />
            ) : mediaUrl ? (
              <img
                key={mediaUrl}
                src={mediaUrl}
                alt={`Story by ${authorName}`}
                className="w-full h-full object-cover"
                onLoad={() => setMediaLoaded(true)}
                onError={() => setMediaError(true)}
              />
            ) : (
              // Text Story with Rich Dynamic Background
              <div
                className={`w-full h-full flex items-center justify-center p-8 text-center ${
                  currentStory.backgroundColor ||
                  'bg-gradient-to-br from-[#12314C] via-[#0B1A28] to-[#070B14]'
                }`}
              >
                <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed drop-shadow-md max-w-sm">
                  {currentStory.text || '✨'}
                </p>
              </div>
            )}

            {/* Subtle Gradient Overlays for Readability */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

            {/* Optional Media Caption Overlay */}
            {currentStory.text && mediaUrl && (
              <div className="absolute bottom-20 inset-x-4 z-20 text-center pointer-events-none">
                <span className="inline-block px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-medium shadow-md">
                  {currentStory.text}
                </span>
              </div>
            )}

            {/* Error Fallback */}
            {mediaError && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-text-muted gap-2 z-20">
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <span className="text-xs">Story media unavailable</span>
              </div>
            )}
          </div>

          {/* Bottom Reply Bar */}
          <div className="relative z-30 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/90 to-transparent border-t border-white/[0.08]">
            <form onSubmit={handleReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${authorName}...`}
                className="flex-1 bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.15] border border-white/[0.1] rounded-full px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-brand-mint transition-all"
                disabled={isSubmittingReply}
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSubmittingReply}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-gradient-to-r from-brand-mint to-brand-yellow text-[#070B14] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 shadow-md font-bold"
                aria-label="Send reply"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
