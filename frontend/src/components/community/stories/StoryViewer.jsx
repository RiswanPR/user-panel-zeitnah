import { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
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
  RefreshCw,
  Heart,
  Flame,
  Star,
  Lightbulb,
  Building2,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useViewStory, useReactToStory } from '../../../hooks/useCommunity';
import { communityApi } from '../../../services/communityApi';
import { organizationService } from '../../../services/organizationService';
import { useActiveProfile } from '../../../context/ActiveProfileContext';
import { getCanonicalProfileUrl } from '../../../utils/roleNavigation';
import {
  getBusinessProfileUrl,
  resolveCanonicalBusinessIdentity,
  findBusinessById,
} from '../../../utils/businessProfile';
import BusinessLogo from '../../business/BusinessLogo';
import { formatRelativeTime } from '../../../utils/communityFormatters';
import { groupStoriesByUser } from '../../../utils/storyGrouping';
import { getUploadUrl } from '../../../utils/courseUi';
import { AuthContext } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import BrandAmbientShape from '../ui/BrandAmbientShape';

const STORY_DURATION_MS = 5000;

const QUICK_REACTIONS = [
  { id: 'like', icon: Heart, label: 'Like', color: 'text-rose-500', fill: 'fill-rose-500' },
  { id: 'love', icon: Flame, label: 'Love', color: 'text-amber-500', fill: 'fill-amber-500' },
  { id: 'celebrate', icon: Star, label: 'Celebrate', color: 'text-yellow-400', fill: 'fill-yellow-400' },
  { id: 'insightful', icon: Lightbulb, label: 'Insightful', color: 'text-brand-mint', fill: 'fill-brand-mint' },
];

/**
 * StoryViewer — Instagram-level fullscreen story experience.
 * Features:
 * - Viewport-safe fullscreen card (edge-to-edge mobile, centered rounded card desktop)
 * - True hold-to-pause (mouse & touch press >=180ms pauses media and suppresses accidental taps)
 * - Swipe / drag downward to dismiss with smooth transform and snap-back
 * - Video playback-synchronized progress with auto-advance on ended
 * - Controlled preloading of next immediate story asset (image or video poster)
 * - Flying quick reaction bursts with optimistic server mutation
 * - Memory-safe cleanup of video elements and animation frames on unmount
 * - Full keyboard controls (ArrowLeft, ArrowRight, Escape, Spacebar) and focus restoration
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
      const targetAuthorId =
        targetStory?.author?._id || targetStory?.author?.id || targetStory?.authorId;
      const foundIdx = normalizedGroups.findIndex((g) => g.userId === String(targetAuthorId));
      return foundIdx !== -1 ? foundIdx : 0;
    }
    return 0;
  }, [userGroups, initialUserIndex, stories, initialIndex, normalizedGroups]);

  const [currentGroupIndex, setCurrentGroupIndex] = useState(resolvedInitialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex || 0);
  const shouldReduceMotion = useReducedMotion();

  const activeGroup = normalizedGroups[currentGroupIndex] || null;
  const activeStories = useMemo(() => activeGroup?.stories || [], [activeGroup]);
  const currentStory = activeStories[currentStoryIndex] || null;

  const rawAuthorAvatar = activeGroup?.avatar || activeGroup?.avatarUrl || activeGroup?.profileImage;
  const authorAvatar = getUploadUrl(rawAuthorAvatar);

  // ── Business Identity & Metadata Resolution ──
  const { businesses } = useActiveProfile();

  const isBusinessStory = Boolean(
    currentStory?.organization ||
    currentStory?.organizationId ||
    activeGroup?.isBusiness ||
    activeGroup?.organization ||
    activeGroup?.organizationId
  );

  const directOrg =
    (currentStory?.organization && typeof currentStory.organization === 'object'
      ? currentStory.organization
      : (activeGroup?.organization && typeof activeGroup.organization === 'object'
          ? activeGroup.organization
          : null));

  const targetOrgId = useMemo(() => {
    if (!isBusinessStory) return null;
    const raw =
      currentStory?.organizationId ||
      activeGroup?.organizationId ||
      directOrg?._id ||
      directOrg?.id ||
      null;
    return raw ? String(raw) : null;
  }, [isBusinessStory, currentStory?.organizationId, activeGroup?.organizationId, directOrg]);

  const hasCompleteDirectMetadata = Boolean(directOrg?.name && (directOrg?.slug || directOrg?.logo));

  const matchedUserBusiness = useMemo(() => {
    if (!targetOrgId || hasCompleteDirectMetadata) return null;
    return findBusinessById(businesses, targetOrgId);
  }, [targetOrgId, hasCompleteDirectMetadata, businesses]);

  const {
    data: fetchedOrg,
    isLoading: isOrgLoading,
  } = useQuery({
    queryKey: ['public-business', targetOrgId],
    queryFn: () => organizationService.getOrganizationBySlug(targetOrgId),
    enabled: Boolean(
      isBusinessStory &&
      targetOrgId &&
      !hasCompleteDirectMetadata &&
      !matchedUserBusiness
    ),
    staleTime: 10 * 60 * 1000,
  });

  const effectiveBusinessIdentity = useMemo(() => {
    if (!isBusinessStory) return null;
    const sourceOrg = directOrg || matchedUserBusiness || fetchedOrg || null;
    return resolveCanonicalBusinessIdentity({
      organization: sourceOrg,
      organizationId: targetOrgId,
      knownOrganizations: businesses,
    });
  }, [isBusinessStory, directOrg, matchedUserBusiness, fetchedOrg, targetOrgId, businesses]);

  const isBusinessLoading = Boolean(
    isBusinessStory &&
    targetOrgId &&
    !effectiveBusinessIdentity?.isResolved &&
    isOrgLoading
  );

  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  useEffect(() => {
    setAvatarImgError(false);
  }, [authorAvatar]);

  // Gesture and Drag State
  const [dragY, setDragY] = useState(0);
  const touchStartYRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchStartTimeRef = useRef(0);
  const isHoldRef = useRef(false);
  const holdTimerRef = useRef(null);

  // Flying reaction animations
  const [flyingReactions, setFlyingReactions] = useState([]);
  const reactionCountRef = useRef(0);

  const startTimeRef = useRef(0);
  const animationRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const videoRef = useRef(null);
  const viewedStoryIdsRef = useRef(new Set());

  const viewMutation = useViewStory();
  const reactMutation = useReactToStory();

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
      if (storyId && !viewedStoryIdsRef.current.has(storyId)) {
        viewedStoryIdsRef.current.add(storyId);
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
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Memory cleanup: release active video resources on close
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const vid = videoRef.current;
      if (vid) {
        try {
          vid.pause();
          vid.removeAttribute('src');
          vid.load();
        } catch {}
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  // Media URL and type detection
  const mediaUrl =
    currentStory?.media?.[0]?.url ||
    currentStory?.mediaUrl ||
    currentStory?.image ||
    '';
  const isVideo =
    currentStory?.type === 'VIDEO' ||
    currentStory?.media?.[0]?.type === 'video' ||
    (typeof mediaUrl === 'string' && Boolean(mediaUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i)));

  // Video playback synchronization when pause state changes
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isPaused) {
      vid.pause();
    } else if (mediaLoaded && !mediaError) {
      vid.play().catch(() => {});
    }
  }, [isPaused, mediaLoaded, mediaError]);

  // Preload immediate NEXT story asset
  useEffect(() => {
    let nextStory = null;
    if (currentStoryIndex < activeStories.length - 1) {
      nextStory = activeStories[currentStoryIndex + 1];
    } else if (currentGroupIndex < normalizedGroups.length - 1) {
      const nextGroup = normalizedGroups[currentGroupIndex + 1];
      nextStory = nextGroup?.stories?.[0];
    }

    if (!nextStory) return;

    const nextUrl =
      nextStory?.media?.[0]?.url ||
      nextStory?.mediaUrl ||
      nextStory?.image ||
      '';

    if (nextUrl) {
      const isNextVideo =
        nextStory.type === 'VIDEO' ||
        nextStory?.media?.[0]?.type === 'video' ||
        Boolean(nextUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i));

      if (!isNextVideo) {
        const img = new Image();
        img.src = nextUrl;
      }
    }
  }, [currentGroupIndex, currentStoryIndex, activeStories, normalizedGroups]);

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

      let newProgress;
      if (isVideo && videoRef.current && videoRef.current.duration) {
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
  }, [currentGroupIndex, currentStoryIndex, currentStory, isPaused, isVideo, handleNext]);

  // Hold-to-pause & Swipe-to-dismiss gesture handling
  const handleTouchStart = (e) => {
    if (!e.touches || !e.touches[0]) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
    isHoldRef.current = false;

    // Start hold detection timer (180ms threshold)
    holdTimerRef.current = setTimeout(() => {
      isHoldRef.current = true;
      setIsPaused(true);
    }, 180);
  };

  const handleTouchMove = (e) => {
    if (!e.touches || !e.touches[0] || touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartYRef.current;
    const diffX = e.touches[0].clientX - (touchStartXRef.current || 0);

    // If dragging downward and vertical movement dominates, track drag offset
    if (diffY > 0 && Math.abs(diffY) > Math.abs(diffX)) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      setIsPaused(true);
      setDragY(diffY);
    }
  };

  const handleTouchEnd = (e) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    setIsPaused(false);

    // Check downward drag threshold (>= 90px triggers dismiss)
    if (dragY >= 90) {
      onClose?.();
      return;
    }
    setDragY(0);

    // If it was held, suppress tap navigation
    if (isHoldRef.current) {
      isHoldRef.current = false;
      return;
    }

    // Check horizontal swipe if not held
    if (touchStartXRef.current !== null && e.changedTouches && e.changedTouches[0]) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - (touchStartYRef.current || 0);

      if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Pointer hold handlers for desktop mouse
  const handlePointerDown = (e) => {
    if (e.button !== 0) return; // Primary left button only
    touchStartTimeRef.current = Date.now();
    isHoldRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      isHoldRef.current = true;
      setIsPaused(true);
    }, 180);
  };

  const handlePointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsPaused(false);
  };

  const handleTapZoneClick = (action) => {
    // Suppress tap navigation if pointer was held
    if (isHoldRef.current) {
      isHoldRef.current = false;
      return;
    }
    if (action === 'prev') {
      handlePrev();
    } else {
      handleNext();
    }
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

  const handleQuickReaction = (reaction) => {
    if (!currentStory) return;
    const storyId = currentStory._id || currentStory.id;

    // Trigger visual floating reaction burst
    reactionCountRef.current += 1;
    const reactionId = `${reaction.id}-${reactionCountRef.current}`;
    setFlyingReactions((prev) => [...prev, { id: reactionId, icon: reaction.icon, color: reaction.color }]);

    setTimeout(() => {
      setFlyingReactions((prev) => prev.filter((r) => r.id !== reactionId));
    }, 1200);

    // Call API mutation
    reactMutation.mutate({ storyId, type: reaction.id });
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

  const handleRetryMedia = () => {
    setMediaError(false);
    setMediaLoaded(false);
    if (videoRef.current) {
      try {
        videoRef.current.load();
      } catch {}
    }
  };

  if (!activeGroup || !currentStory) return null;

  const authorName = isBusinessStory
    ? (effectiveBusinessIdentity?.name || 'Company')
    : (activeGroup.displayName || 'Zeitnah Member');
  const authorProfileUrl = isBusinessStory
    ? (effectiveBusinessIdentity?.profileUrl || getBusinessProfileUrl(targetOrgId))
    : getCanonicalProfileUrl({
        id: activeGroup.userId,
        username: activeGroup.username,
      });
  const authorInitials = authorName.slice(0, 2).toUpperCase();
  const authorLogo = isBusinessStory ? (effectiveBusinessIdentity?.logo || null) : null;

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
          className="min-h-[44px] min-w-[44px] absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-4 sm:top-6 sm:right-6 p-2.5 bg-black/50 hover:bg-black/75 active:scale-95 rounded-full text-white transition-all z-50 cursor-pointer border border-white/15 shadow-xl flex items-center justify-center"
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

        {/* Main Story Container with Downward Swipe Drag Transform */}
        <motion.div
          key={`${activeGroup.userId}-${currentStory._id || currentStoryIndex}`}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: -4 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            transform: dragY > 0 ? `translateY(${dragY}px) scale(${1 - Math.min(dragY / 1000, 0.12)})` : undefined,
            transition: dragY === 0 ? 'transform 0.25s ease-out' : 'none',
          }}
          className="relative w-full max-w-[430px] h-[100dvh] sm:h-[88vh] sm:rounded-3xl bg-[#070B14] border border-white/[0.1] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)] flex flex-col z-20"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
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
              to={isBusinessLoading ? '#' : authorProfileUrl}
              onClick={isBusinessLoading ? (e) => e.preventDefault() : onClose}
              className={`flex items-center gap-2.5 hover:opacity-90 transition-opacity min-w-0 ${
                isBusinessLoading ? 'pointer-events-none' : ''
              }`}
              aria-label={
                isBusinessLoading
                  ? 'Loading business profile...'
                  : `View ${authorName}'s profile`
              }
            >
              <div className="w-9 h-9 rounded-full bg-[#0E1726] border border-white/[0.2] overflow-hidden flex items-center justify-center shrink-0">
                {isBusinessStory ? (
                  isBusinessLoading ? (
                    <div className="w-full h-full bg-white/10 animate-pulse flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white/40" />
                    </div>
                  ) : (
                    <BusinessLogo
                      logo={authorLogo}
                      name={authorName}
                      size="sm"
                      className="w-full h-full rounded-full object-cover"
                    />
                  )
                ) : authorAvatar && !avatarImgError ? (
                  <img
                    src={authorAvatar}
                    alt={authorName}
                    onError={() => setAvatarImgError(true)}
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
                  {isBusinessStory && isBusinessLoading ? (
                    <div className="h-4 w-28 bg-white/20 rounded animate-pulse my-0.5" />
                  ) : (
                    <h4 className="text-xs sm:text-sm font-bold text-white drop-shadow-sm truncate max-w-[160px]">
                      {authorName}
                    </h4>
                  )}
                  {isBusinessStory && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-mint/20 text-brand-mint border border-brand-mint/30 uppercase font-semibold">
                      Company
                    </span>
                  )}
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
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all cursor-pointer flex items-center justify-center"
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
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all cursor-pointer flex items-center justify-center"
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
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-black/40 hover:bg-rose-600/80 text-white transition-all cursor-pointer flex items-center justify-center"
                  title="Delete story"
                  aria-label="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Tap Zones (Left 35% = Prev, Right 65% = Next) */}
          <div className="absolute top-20 bottom-24 inset-x-0 z-20 flex">
            <div
              className="w-[35%] h-full cursor-pointer"
              onClick={() => handleTapZoneClick('prev')}
              aria-label="Previous story tap zone"
            />
            <div
              className="w-[65%] h-full cursor-pointer"
              onClick={() => handleTapZoneClick('next')}
              aria-label="Next story tap zone"
            />
          </div>

          {/* Media Stage */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {/* Loading Indicator for Slow Media */}
            {mediaUrl && !mediaLoaded && !mediaError && (
              <div
                className="absolute inset-0 bg-[#070B14] flex items-center justify-center z-10"
                aria-label="Loading story media"
              >
                <div className="w-8 h-8 rounded-full border-2 border-brand-mint/20 border-t-brand-mint animate-spin" />
              </div>
            )}

            {isVideo && mediaUrl ? (
              <video
                ref={videoRef}
                key={mediaUrl}
                src={mediaUrl}
                poster={currentStory.thumbnailUrl || undefined}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  mediaLoaded ? 'opacity-100' : 'opacity-0'
                }`}
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
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  mediaLoaded ? 'opacity-100' : 'opacity-0'
                }`}
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

            {/* Flying Quick Reactions Burst Animations */}
            <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
              {flyingReactions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 1, y: '80%', x: '75%', scale: 0.8 }}
                  animate={{ opacity: 0, y: '20%', x: '65%', scale: 1.6 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  className="absolute"
                >
                  <r.icon className={`w-8 h-8 ${r.color} fill-current drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]`} />
                </motion.div>
              ))}
            </div>

            {/* Graceful Error Fallback with Retry & Advance */}
            {mediaError && (
              <div
                className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-text-muted gap-3 z-20 px-6 text-center"
                role="status"
                aria-label="Story media could not be loaded"
              >
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <span className="text-xs text-white/80">Story couldn't be loaded.</span>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleRetryMedia}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-brand-mint text-bg-base text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Next story
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Interactive Bar: Quick Reactions + Reply Bar */}
          <div className="relative z-30 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/95 to-transparent border-t border-white/[0.08] space-y-2">
            {/* Quick Reactions Strip */}
            <div className="flex items-center justify-end gap-1.5 px-1">
              {QUICK_REACTIONS.map((qr) => (
                <button
                  key={qr.id}
                  type="button"
                  onClick={() => handleQuickReaction(qr)}
                  className={`min-h-[36px] min-w-[36px] p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 transition-all cursor-pointer flex items-center justify-center ${qr.color}`}
                  aria-label={`React with ${qr.label}`}
                  title={qr.label}
                >
                  <qr.icon className={`w-4 h-4 ${qr.fill}`} />
                </button>
              ))}
            </div>

            {/* Reply Input Form */}
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
