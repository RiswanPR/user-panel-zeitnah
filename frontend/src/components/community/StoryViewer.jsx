import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play, Send, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useViewStory } from '../../hooks/useCommunity';
import { communityApi } from '../../services/communityApi';
import { getCanonicalProfileUrl } from '../../utils/roleNavigation';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function StoryViewer({ stories = [], initialIndex = 0, onClose }) {
  const { user } = useContext(AuthContext);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');

  const currentStory = stories[currentIndex] || null;
  const duration = 5000; // 5 seconds per story
  const startTimeRef = useRef(0);
  const animationRef = useRef(null);

  const viewMutation = useViewStory();

  const currentUserId = user?._id || user?.id || user?.userId;
  const storyAuthorId = currentStory?.author?._id || currentStory?.author?.id || currentStory?.authorId;
  const isOwner = Boolean(
    currentUserId && storyAuthorId && String(currentUserId) === String(storyAuthorId)
  );
  const isAdmin = user?.role === 'admin' || user?.primaryRole === 'ADMIN';

  // Track story views
  useEffect(() => {
    if (currentStory) {
      viewMutation.mutate(currentStory._id || currentStory.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentStory]);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  }, [currentIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  const handleReply = async () => {
    if (!replyText.trim() || !currentStory) return;
    try {
      await communityApi.replyToStory(currentStory._id || currentStory.id, {
        content: replyText.trim(),
      });
      toast.success('Reply sent!');
      setReplyText('');
    } catch {
      toast.error('Failed to send reply');
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

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now() - (progress / 100) * duration;

    const animate = () => {
      if (isPaused) {
        startTimeRef.current = Date.now() - (progress / 100) * duration;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = (elapsed / duration) * 100;

      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [currentIndex, isPaused, duration, handleNext, progress]);

  if (!currentStory) return null;

  const authorName =
    currentStory.author?.name || currentStory.author?.displayName || 'Zeitnah Member';
  const authorProfileUrl = getCanonicalProfileUrl(currentStory.author);
  const authorAvatar = currentStory.author?.avatar;
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  const mediaUrl =
    currentStory.media?.[0]?.url || currentStory.mediaUrl || currentStory.image;
  const isVideo =
    currentStory.media?.[0]?.type === 'video' ||
    (typeof mediaUrl === 'string' && mediaUrl.match(/\.(mp4|webm|mov)$/i));

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 cursor-pointer"
          aria-label="Close story viewer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-[420px] h-[100dvh] sm:h-[84vh] sm:rounded-3xl bg-[#070B14] border border-white/[0.08] overflow-hidden shadow-2xl flex flex-col">
          {/* Progress Indicators */}
          <div className="absolute top-0 inset-x-0 pt-3 px-3 flex gap-1 z-20">
            {stories.map((s, idx) => (
              <div
                key={s._id || s.id || idx}
                className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
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

          {/* Header Info */}
          <div className="absolute top-5 inset-x-0 px-4 flex items-center justify-between z-20">
            <Link
              to={authorProfileUrl}
              onClick={onClose}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-[#0E1726] border border-white/[0.2] overflow-hidden flex items-center justify-center">
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
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white drop-shadow-sm truncate max-w-[180px]">
                  {authorName}
                </h4>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused((prev) => !prev)}
                className="p-1.5 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer"
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
                  onClick={handleDeleteStory}
                  className="p-1.5 rounded-full text-white/80 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Delete story"
                  aria-label="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Media Content */}
          <div
            className="flex-1 relative bg-black flex items-center justify-center cursor-pointer select-none"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Click Tap Zones */}
            <div
              className="absolute inset-y-0 left-0 w-1/3 z-10"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous story"
            />
            <div
              className="absolute inset-y-0 right-0 w-2/3 z-10"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next story"
            />

            {/* Story Visual */}
            <div
              className={`absolute inset-0 flex items-center justify-center p-6 ${
                currentStory.backgroundColor ||
                'bg-gradient-to-br from-[#0B111E] to-[#0D1522]'
              }`}
            >
              {mediaUrl ? (
                isVideo ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Story visual"
                    className="w-full h-full object-cover absolute inset-0"
                  />
                )
              ) : (
                <h2 className="text-xl sm:text-2xl font-bold text-white text-center leading-relaxed max-w-xs break-words px-4">
                  {currentStory.text}
                </h2>
              )}
            </div>
          </div>

          {/* Footer Interactions */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 flex gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleReply();
              }}
              placeholder={`Reply to ${authorName}...`}
              className="flex-1 bg-white/[0.08] border border-white/20 focus:border-brand-mint/60 rounded-full px-4 py-2 text-xs sm:text-sm text-white placeholder-white/60 focus:outline-none transition-colors"
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="p-2.5 rounded-full bg-brand-mint text-bg-base font-semibold transition-opacity disabled:opacity-40 cursor-pointer"
              aria-label="Send reply"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
