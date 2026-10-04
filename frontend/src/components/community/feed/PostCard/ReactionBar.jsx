import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  const buttonRefs = useRef([]);
  const shouldReduceMotion = useReducedMotion();

  // Cleanup dangling touch timers on unmount
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    };
  }, []);

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

  // Keyboard navigation on main trigger
  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setShowPicker(true);
      setTimeout(() => {
        if (buttonRefs.current[0]) {
          buttonRefs.current[0].focus();
        }
      }, 50);
    }
  };

  // Keyboard navigation inside reaction picker
  const handlePickerKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (index + 1) % REACTIONS.length;
      buttonRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (index - 1 + REACTIONS.length) % REACTIONS.length;
      buttonRefs.current[prevIdx]?.focus();
    }
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
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.95 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.05 }
                : { type: 'spring', damping: 24, stiffness: 380 }
            }
            className="absolute bottom-full left-0 mb-2 bg-[#0E1726]/95 backdrop-blur-xl border border-white/[0.12] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1.5 flex items-center gap-1 z-30 ring-1 ring-white/10"
            role="toolbar"
            aria-label="Choose a reaction"
          >
            {REACTIONS.map((r, idx) => {
              const isSelected = myReactionType === r.id;
              return (
                <button
                  key={r.id}
                  ref={(el) => {
                    buttonRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => handleSelectReaction(r.id)}
                  onKeyDown={(e) => handlePickerKeyDown(e, idx)}
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/[0.1] active:scale-95 transition-all transform hover:scale-125 motion-reduce:hover:scale-100 motion-reduce:transform-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-mint/50 ${
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
        onKeyDown={handleTriggerKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => {
          // Prevent browser context menu on long press
          if (isLongPressRef.current) e.preventDefault();
        }}
        className={`min-h-[44px] min-w-[44px] p-2 rounded-full text-xs font-semibold flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 motion-reduce:transform-none focus:outline-none focus:ring-1 focus:ring-brand-mint/40 ${
          isLiked
            ? `${activeReaction?.color || 'text-rose-500'} bg-white/[0.05]`
            : 'text-text-muted hover:text-white hover:bg-white/[0.05]'
        }`}
        aria-label={isLiked ? `Remove ${activeReaction?.label || 'Like'}` : 'React to post'}
        aria-haspopup="true"
        aria-expanded={showPicker}
        title={isLiked ? (activeReaction?.label || 'Liked') : 'Like'}
      >
        <ActiveIcon
          className={`w-5 h-5 transition-transform duration-150 active:scale-125 motion-reduce:transform-none ${
            isLiked ? (activeReaction?.fill || 'fill-current') : ''
          }`}
        />
      </button>
    </div>
  );
}
