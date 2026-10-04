import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ReelItem from './ReelItem';
import CommentDrawer from '../comments/CommentDrawer';
import {
  useReactToPost,
  useSavePost,
  useRemoveSavedPost,
  useRecordPostView,
} from '../../../hooks/useCommunity';

/**
 * ReelsViewer — Master scroll-snap engine and viewport orchestrator for Zeitnah Reels.
 *
 * Core Features:
 * - Native CSS scroll-snap (scroll-snap-type: y mandatory) for 60fps butter-smooth scrolling.
 * - IntersectionObserver with 0.6 threshold to identify active reel without scroll event lag.
 * - Sliding window memory safety: only activeIndex ± 1 mounts HTMLVideoElement.
 * - Global session mute consistency: unmuting once persists across all watched reels.
 * - Direct deep-link synchronization via URL history state.
 * - Full keyboard controls: ArrowUp, ArrowDown, Spacebar, Escape, Mute (M).
 * - Centralized CommentDrawer integration with automatic playback pausing.
 */
export default function ReelsViewer({
  posts = [],
  initialPostId = null,
  onClose,
  onFetchNextPage,
  hasNextPage = false,
  isFetchingNextPage = false,
}) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const scrollContainerRef = useRef(null);
  const reelRefs = useRef({});

  // ── Session State ──
  const [isMuted, setIsMuted] = useState(true);
  const [activeCommentPost, setActiveCommentPost] = useState(null);

  // Determine starting index from initialPostId
  const startingIndex = useMemo(() => {
    if (!initialPostId || !posts.length) return 0;
    const foundIdx = posts.findIndex((p) => (p._id || p.id) === initialPostId);
    return foundIdx !== -1 ? foundIdx : 0;
  }, [initialPostId, posts]);

  const [activeIndex, setActiveIndex] = useState(startingIndex);
  const activeIndexRef = useRef(startingIndex);
  activeIndexRef.current = activeIndex;

  // React Query Mutations for Reactions & Saves
  const reactMutation = useReactToPost();
  const saveMutation = useSavePost();
  const unsaveMutation = useRemoveSavedPost();
  const recordViewMutation = useRecordPostView();

  // Scroll to starting reel on mount
  useEffect(() => {
    if (startingIndex > 0 && scrollContainerRef.current) {
      const targetEl = reelRefs.current[startingIndex];
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
  }, [startingIndex]);

  // Sync browser URL with active reel for deep-linkability without full route remount
  useEffect(() => {
    const activePost = posts[activeIndex];
    const postId = activePost?._id || activePost?.id;
    if (postId && window.location.pathname.startsWith('/community/reels')) {
      const targetPath = `/community/reels/${postId}`;
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath);
      }
    }
  }, [activeIndex, posts]);

  // IntersectionObserver to detect the single active reel smoothly
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-reel-index'));
            if (!Number.isNaN(index) && index !== activeIndexRef.current) {
              setActiveIndex(index);

              // Infinite prefetch when approaching bottom
              if (index >= posts.length - 2 && hasNextPage && !isFetchingNextPage && onFetchNextPage) {
                onFetchNextPage();
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6, // Reel must occupy >60% of viewport to become active
      }
    );

    const elements = Object.values(reelRefs.current).filter(Boolean);
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [posts.length, hasNextPage, isFetchingNextPage, onFetchNextPage]);

  // Scroll programmatic helper
  const scrollToIndex = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(index, posts.length - 1));
      const targetEl = reelRefs.current[clamped];
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: shouldReduceMotion ? 'instant' : 'smooth', block: 'start' });
      }
    },
    [posts.length, shouldReduceMotion]
  );

  // Keyboard Navigation: ArrowDown, ArrowUp, Space, Escape, M
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing inside an input/textarea (e.g. comment drawer)
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(activeIndexRef.current + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(activeIndexRef.current - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (activeCommentPost) {
          setActiveCommentPost(null);
        } else if (onClose) {
          onClose();
        } else {
          navigate('/community');
        }
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToIndex, activeCommentPost, onClose, navigate]);

  // Post Actions Handlers
  const handleLike = useCallback(
    (post) => {
      const postId = post?._id || post?.id;
      if (!postId) return;
      reactMutation.mutate({ postId, type: 'like' });
    },
    [reactMutation]
  );

  const handleToggleSave = useCallback(
    (post) => {
      const postId = post?._id || post?.id;
      if (!postId) return;
      if (post.isSaved) {
        unsaveMutation.mutate(postId);
      } else {
        saveMutation.mutate(postId);
      }
    },
    [saveMutation, unsaveMutation]
  );

  const handleRecordView = useCallback(
    (postId) => {
      if (!postId) return;
      recordViewMutation.mutate(postId);
    },
    [recordViewMutation]
  );

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/community');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070D] flex flex-col items-center justify-center select-none overflow-hidden overscroll-none">

      {/* ── TOP HEADER (Mobile Floating Back & Desktop Control Bar) ── */}
      <div className="absolute top-0 inset-x-0 z-40 p-3 sm:p-4 flex items-center justify-between pointer-events-none">
        {/* Left: Back Action */}
        <button
          type="button"
          onClick={handleClose}
          className="pointer-events-auto min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-2xl bg-black/55 hover:bg-black/80 text-white backdrop-blur-xl border border-white/10 flex items-center gap-1.5 shadow-2xl transition-all hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-mint"
          aria-label="Back to Zeitnah Community"
        >
          <ArrowLeft className="w-4 h-4 text-brand-mint" />
          <span className="text-xs font-semibold text-white/95">
            Zeitnah
          </span>
        </button>

        {/* Center: Zeitnah Reels Branding */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.08] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
          <span className="text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-brand-mint via-brand-yellow to-brand-mint bg-clip-text text-transparent">
            Reels
          </span>
        </div>

        {/* Right: Close (X) & Audio Indicator */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="hidden sm:flex min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-black/55 hover:bg-black/80 text-white backdrop-blur-xl border border-white/10 items-center justify-center transition-all cursor-pointer shadow-lg"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-brand-mint" />}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-black/55 hover:bg-black/80 text-white backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-lg"
            aria-label="Close Reels Viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── DESKTOP NAVIGATION SIDE-CHEVRONS ── */}
      <div className="hidden lg:flex flex-col gap-3 fixed right-8 top-1/2 -translate-y-1/2 z-40">
        <button
          type="button"
          disabled={activeIndex <= 0}
          onClick={() => scrollToIndex(activeIndex - 1)}
          className={`w-11 h-11 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xl ${
            activeIndex <= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 hover:border-brand-mint/40'
          }`}
          aria-label="Previous reel (ArrowUp)"
          title="Previous (ArrowUp)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          type="button"
          disabled={activeIndex >= posts.length - 1}
          onClick={() => scrollToIndex(activeIndex + 1)}
          className={`w-11 h-11 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xl ${
            activeIndex >= posts.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 hover:border-brand-mint/40'
          }`}
          aria-label="Next reel (ArrowDown)"
          title="Next (ArrowDown)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* ── VERTICAL SNAP FEED CONTAINER ── */}
      <div
        ref={scrollContainerRef}
        data-testid="reels-scroll-container"
        className="relative w-full h-[100dvh] overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scroll-smooth focus:outline-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {posts.map((post, idx) => {
          const postId = post?._id || post?.id || `reel-${idx}`;
          const isItemActive = idx === activeIndex && !activeCommentPost;
          // Memory windowing: only mount video tags for activeIndex - 1, activeIndex, activeIndex + 1
          const isMounted = Math.abs(idx - activeIndex) <= 1;

          return (
            <div
              key={postId}
              ref={(el) => {
                if (el) reelRefs.current[idx] = el;
              }}
              data-reel-index={idx}
              className="w-full h-[100dvh] snap-start shrink-0"
            >
              <ReelItem
                post={post}
                isActive={isItemActive}
                isMounted={isMounted}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((prev) => !prev)}
                onOpenComments={() => setActiveCommentPost(post)}
                onLike={handleLike}
                onToggleSave={handleToggleSave}
                onRecordView={handleRecordView}
              />
            </div>
          );
        })}

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-text-muted">
            <Sparkles className="w-12 h-12 text-brand-mint/40 mb-3" />
            <h3 className="text-white text-base font-semibold mb-1">No videos yet</h3>
            <p className="text-xs text-text-muted max-w-sm mb-4">
              Community members haven't posted any short videos yet. Be the first to share one!
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-brand-mint text-bg-base font-semibold text-xs cursor-pointer shadow-md"
            >
              Back to Community
            </button>
          </div>
        )}
      </div>

      {/* ── CENTRALIZED COMMENT DRAWER ── */}
      {Boolean(activeCommentPost) && (
        <CommentDrawer
          isOpen={Boolean(activeCommentPost)}
          post={activeCommentPost}
          onClose={() => setActiveCommentPost(null)}
        />
      )}
    </div>
  );
}
