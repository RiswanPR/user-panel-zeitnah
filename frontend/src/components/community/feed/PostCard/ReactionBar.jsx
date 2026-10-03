import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Flame, Star, Lightbulb } from 'lucide-react';

const REACTIONS = [
  { id: 'like', icon: Heart, label: 'Like', color: 'text-rose-500', fill: 'fill-rose-500' },
  { id: 'love', icon: Flame, label: 'Love', color: 'text-amber-500', fill: 'fill-amber-500' },
  { id: 'celebrate', icon: Star, label: 'Celebrate', color: 'text-yellow-400', fill: 'fill-yellow-400' },
  { id: 'insightful', icon: Lightbulb, label: 'Insightful', color: 'text-brand-mint', fill: 'fill-brand-mint' },
];

/**
 * ReactionBar — Desktop hover & Mobile 400ms long-press reaction picker
 * Accessible keyboard navigation, smooth spring animation, and touch safety.
 */
export default function ReactionBar({
  postId,
  isLiked,
  myReactionType,
  onReact,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const touchTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  // Close picker on outside click or ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPicker]);

  const activeReaction = myReactionType
    ? REACTIONS.find((r) => r.id === myReactionType)
    : null;
  const ActiveIcon = activeReaction ? activeReaction.icon : Heart;

  const handleSelectReaction = (reactionId) => {
    setShowPicker(false);
    onReact?.(reactionId);
  };

  const handleDefaultClick = () => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    // Toggle like or remove current
    handleSelectReaction(myReactionType || 'like');
  };

  // Touch handlers for mobile long-press (400ms)
  const handleTouchStart = () => {
    isLongPressRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowPicker(true);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    // Scrolling cancels the long press
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  return (
    <div
      className="relative"
      ref={pickerRef}
      onMouseEnter={() => setShowPicker(true)}
      onMouseLeave={() => setShowPicker(false)}
    >
      {/* Floating Reaction Picker Popup */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 350 }}
            className="absolute bottom-full left-0 mb-2 bg-[#0E1726]/95 backdrop-blur-xl border border-white/[0.12] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1.5 flex items-center gap-1 z-30 ring-1 ring-white/10"
            role="toolbar"
            aria-label="Choose a reaction"
          >
            {REACTIONS.map((r) => {
              const isSelected = myReactionType === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectReaction(r.id)}
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/[0.1] active:scale-95 transition-all transform hover:scale-125 cursor-pointer ${
                    r.color
                  } ${isSelected ? 'bg-white/[0.08] ring-1 ring-white/20' : ''}`}
                  title={r.label}
                  aria-label={`React with ${r.label}`}
                >
                  <r.icon className={`w-5 h-5 ${r.fill}`} />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Reaction Trigger Button */}
      <button
        id={`like-btn-${postId}`}
        data-testid="post-like-btn"
        type="button"
        onClick={handleDefaultClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => {
          // Prevent browser context menu on long press
          if (isLongPressRef.current) e.preventDefault();
        }}
        className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
          isLiked
            ? `${activeReaction?.color || 'text-rose-500'} bg-white/[0.06] hover:bg-white/[0.1]`
            : 'text-text-muted hover:bg-white/[0.04] hover:text-white'
        }`}
        aria-label={isLiked ? `Remove ${activeReaction?.label || 'Like'}` : 'React to post'}
        aria-haspopup="true"
        aria-expanded={showPicker}
      >
        <ActiveIcon
          className={`w-4 h-4 transition-transform duration-200 active:scale-125 ${
            isLiked ? (activeReaction?.fill || 'fill-current') : ''
          }`}
        />
        <span className="hidden sm:inline font-medium">
          {activeReaction ? activeReaction.label : 'Like'}
        </span>
      </button>
    </div>
  );
}
