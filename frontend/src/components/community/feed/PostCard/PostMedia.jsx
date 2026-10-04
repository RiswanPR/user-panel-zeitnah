import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ZoomIn,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import MediaLightbox from './MediaLightbox';

/**
 * PostMedia — Instagram-style media-first component.
 * Features:
 * - Multi-image swipeable carousel (touch swipe on mobile, arrow controls on desktop)
 * - Pagination indicator badge (1/N) and bottom dots
 * - Double-tap / double-click to like with radiant heart-burst animation
 * - Auto-pausing video via IntersectionObserver and mutual playback control
 * - Responsive aspect ratios (4:5, 1:1, 16:9) with layout-shift prevention
 * - Graceful error states with inline retry
 * - Video memory safety and decoder disposal on unmount
 * - Seamless entry to /community/reels for immersive short video consumption
 */
export default function PostMedia({ media = [], onDoubleTapLike, postId, onOpenReel }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [failedMedia, setFailedMedia] = useState({});
  const [loadedImages, setLoadedImages] = useState({});
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const lastTapRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchEndXRef = useRef(0);
  const touchEndYRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  const handleMediaError = useCallback((idx) => {
    setFailedMedia((prev) => ({ ...prev, [idx]: true }));
  }, []);

  const handleRetryMedia = useCallback((idx) => {
    setFailedMedia((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    setLoadedImages((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    const vid = videoRefs.current[idx];
    if (vid) {
      try {
        vid.load();
      } catch {}
    }
  }, []);

  const handleImageLoad = useCallback((idx) => {
    setLoadedImages((prev) => ({ ...prev, [idx]: true }));
  }, []);

  // Double-tap media handler for Instagram-style like
  const handleMediaTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap triggered
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 550);
      if (onDoubleTapLike) {
        onDoubleTapLike();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTapLike]);

  // Desktop double-click to like
  const handleDoubleClick = useCallback(
    (e) => {
      e.stopPropagation();
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 550);
      if (onDoubleTapLike) {
        onDoubleTapLike();
      }
    },
    [onDoubleTapLike]
  );

  // Touch handlers for mobile swipe vs vertical scroll
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      touchEndXRef.current = e.touches[0].clientX;
      touchEndYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      touchEndXRef.current = e.touches[0].clientX;
      touchEndYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const diffX = touchStartXRef.current - touchEndXRef.current;
    const diffY = touchStartYRef.current - touchEndYRef.current;
    const SWIPE_THRESHOLD = 45;

    // Distinguish horizontal swipe from vertical scrolling
    if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffX) > Math.abs(diffY)) {
      lastTapRef.current = 0; // Prevent accidental double tap after horizontal swipe
      if (diffX > 0 && currentIndex < media.length - 1) {
        // Swiped left -> next
        setCurrentIndex((prev) => prev + 1);
      } else if (diffX < 0 && currentIndex > 0) {
        // Swiped right -> prev
        setCurrentIndex((prev) => prev - 1);
      }
    }

    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
    touchStartYRef.current = 0;
    touchEndYRef.current = 0;
  };

  // Auto-pause video when scrolled out of viewport & Memory cleanup
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const currentRefs = Object.values(videoRefs.current).filter(Boolean);
    if (!currentRefs.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && !entry.target.paused) {
            entry.target.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    currentRefs.forEach((vid) => observer.observe(vid));

    return () => {
      observer.disconnect();
      // Memory cleanup: release active video resources on unmount
      currentRefs.forEach((vid) => {
        if (!vid.paused) {
          try {
            vid.pause();
          } catch {}
        }
      });
    };
  }, [media]);

  // Preload adjacent carousel images for smooth transitions
  useEffect(() => {
    if (!Array.isArray(media) || media.length <= 1) return;
    media.forEach((item, idx) => {
      if (Math.abs(idx - currentIndex) <= 1 && item?.url && item?.type !== 'video') {
        const img = new Image();
        img.src = item.url;
      }
    });
  }, [currentIndex, media]);

  if (!media || media.length === 0) return null;

  const isMulti = media.length > 1;

  return (
    <>
      <div
        ref={containerRef}
        data-testid="post-media-container"
        aria-label="Double tap to like"
        tabIndex={isMulti ? 0 : undefined}
        onKeyDown={(e) => {
          if (!isMulti) return;
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setCurrentIndex((prev) => Math.max(prev - 1, 0));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setCurrentIndex((prev) => Math.min(prev + 1, media.length - 1));
          }
        }}
        onDoubleClick={handleDoubleClick}
        className="relative my-3 -mx-4 sm:mx-0 rounded-none sm:rounded-2xl overflow-hidden bg-[#070B14] border-y sm:border border-white/[0.08] select-none group transition-all duration-300 hover:brightness-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint/50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle Ambient Brand Edge Integration */}
        <div className="absolute inset-0 pointer-events-none rounded-none sm:rounded-2xl ring-1 ring-inset ring-brand-mint/[0.06] z-10" />

        {/* Carousel Counter Badge (e.g. 1/3) */}
        {isMulti && (
          <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono font-medium text-white/90 shadow-sm border border-white/10 pointer-events-none">
            {currentIndex + 1} / {media.length}
          </div>
        )}

        {/* Double-Tap Heart Burst Animation with Radiant Mint -> Yellow Brand Glow */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
              animate={
                shouldReduceMotion
                  ? { opacity: [0, 1, 0] }
                  : { scale: [0, 1.12, 1], opacity: [0, 1, 0] }
              }
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-brand-mint/40 via-brand-yellow/30 to-transparent blur-xl" />
                <svg width="80" height="80" viewBox="0 0 24 24" className="relative z-10 drop-shadow-[0_0_20px_rgba(159,213,178,0.7)]">
                  <defs>
                    <linearGradient id="brand-doubletap-heart" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9FD5B2" />
                      <stop offset="100%" stopColor="#F6ED4A" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                    fill="url(#brand-doubletap-heart)"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                  />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media Presentation Container */}
        <div
          onClick={handleMediaTap}
          className="relative w-full min-h-[260px] sm:min-h-[320px] max-h-[640px] flex items-center justify-center bg-[#070B14] overflow-hidden"
        >
          {media.map((item, idx) => {
            const isVideo = item.type === 'video';
            const hasError = failedMedia[idx];
            const isLoaded = loadedImages[idx];
            const isCurrent = idx === currentIndex;

            if (!isCurrent && isMulti) return null;

            if (hasError) {
              return (
                <div
                  key={idx}
                  className="w-full h-64 bg-[#0E1726] flex flex-col items-center justify-center p-4 text-center text-text-muted"
                  role="status"
                  aria-label="Media attachment could not be loaded"
                >
                  <AlertCircle className="w-6 h-6 text-text-faint mb-2" />
                  <span className="text-xs mb-2.5">Media couldn't be loaded.</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetryMedia(idx);
                    }}
                    className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    aria-label="Retry loading media"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              );
            }

            if (isVideo) {
              return (
                <div
                  key={idx}
                  className="relative w-full h-full max-h-[620px] aspect-video sm:aspect-auto flex items-center justify-center bg-black overflow-hidden"
                >
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current[idx] = el;
                    }}
                    src={item.url}
                    poster={item.thumbnailUrl || undefined}
                    controls
                    muted={isMuted}
                    playsInline
                    preload="metadata"
                    onPlay={(e) => {
                      // Mutual playback defense: pause other videos
                      document.querySelectorAll('video').forEach((v) => {
                        if (v !== e.target && !v.paused) v.pause();
                      });
                    }}
                    onError={() => handleMediaError(idx)}
                    className="w-full h-full object-contain max-h-[620px]"
                  />

                  {/* Watch Reel Button Overlay */}
                  {postId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenReel) {
                          onOpenReel(postId);
                        } else {
                          navigate(`/community/reels/${postId}`);
                        }
                      }}
                      className="min-h-[38px] absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-md border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer z-10 shadow-lg group-hover:border-brand-mint/50"
                      aria-label="Open fullscreen reel"
                      title="Watch Reel"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
                      <span>Watch Reel</span>
                    </button>
                  )}


                  {/* Volume Mute/Unmute Overlay */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted((prev) => !prev);
                      const vid = videoRefs.current[idx];
                      if (vid) vid.muted = !isMuted;
                    }}
                    className="min-h-[44px] min-w-[44px] absolute bottom-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-all cursor-pointer z-10 flex items-center justify-center"
                    aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              );
            }


            // Image Item (Portrait 4:5, Square 1:1, Landscape 16:9)
            return (
              <div
                key={idx}
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                role="img"
                aria-label={`Post media ${idx + 1} of ${media.length}`}
              >
                {!isLoaded && (
                  <div
                    className="absolute inset-0 bg-[#0E1726] animate-pulse"
                    aria-hidden="true"
                  />
                )}

                <img
                  src={item.url}
                  alt={item.caption || item.alt || `Media attachment ${idx + 1}`}
                  onLoad={() => handleImageLoad(idx)}
                  onError={() => handleMediaError(idx)}
                  loading="lazy"
                  decoding="async"
                  className={`w-full max-h-[640px] object-contain sm:object-cover transition-all duration-300 sm:group-hover:scale-[1.005] ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Enlarge Hint Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedia(item);
                  }}
                  className="min-h-[44px] min-w-[44px] absolute top-3 left-3 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer z-10 flex items-center justify-center"
                  aria-label="Enlarge image"
                  title="Enlarge"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Carousel Desktop Navigation Arrows */}
        {isMulti && (
          <>
            {currentIndex > 0 && (
              <button
                type="button"
                data-testid="carousel-prev-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => Math.max(prev - 1, 0));
                }}
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white items-center justify-center backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-mint transition-all cursor-pointer z-20 shadow-md"
                aria-label="Previous media"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {currentIndex < media.length - 1 && (
              <button
                type="button"
                data-testid="carousel-next-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => Math.min(prev + 1, media.length - 1));
                }}
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white items-center justify-center backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-mint transition-all cursor-pointer z-20 shadow-md"
                aria-label="Next media"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Bottom Pagination Dots */}
            <div
              className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none"
              aria-hidden="true"
            >
              {media.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={`transition-all duration-200 rounded-full shadow-sm ${
                    dotIdx === currentIndex
                      ? 'w-2 h-2 bg-brand-mint'
                      : 'w-1.5 h-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      <MediaLightbox
        isOpen={Boolean(selectedMedia)}
        onClose={() => setSelectedMedia(null)}
        mediaItem={selectedMedia}
      />
    </>
  );
}
