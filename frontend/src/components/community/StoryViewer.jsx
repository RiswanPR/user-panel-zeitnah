import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MoreHorizontal, Pause, Play } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function StoryViewer({ stories, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const currentStory = stories[currentIndex] || null;
  const duration = 5000; // 5 seconds per story
  const startTimeRef = useRef(0);
  const animationRef = useRef(null);
  
  useEffect(() => {
    if (startTimeRef.current === 0) startTimeRef.current = Date.now();
  }, []);
  
  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  }, [currentIndex]);

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

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative w-full max-w-[400px] h-[100dvh] sm:h-[80vh] sm:rounded-[2rem] bg-bg-surface overflow-hidden shadow-2xl flex flex-col">
          
          {/* Progress Bars */}
          <div className="absolute top-0 inset-x-0 pt-4 px-3 flex gap-1 z-20">
            {stories.map((story, idx) => (
              <div key={story.id} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all ease-linear"
                  style={{ 
                    width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header Info */}
          <div className="absolute top-6 inset-x-0 px-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-mint/20 border border-brand-mint/40 overflow-hidden">
                <img src={currentStory.author.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="text-shadow-sm">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {currentStory.author.name}
                  <span className="w-1 h-1 rounded-full bg-white/50" />
                  <span className="text-[10px] font-normal opacity-80">2h</span>
                </h4>
              </div>
            </div>
            <div className="flex gap-2">
              {isPaused ? <Play className="w-5 h-5 text-white drop-shadow" /> : <Pause className="w-5 h-5 text-white opacity-0 transition-opacity drop-shadow" />}
              <button className="text-white drop-shadow"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Media Content */}
          <div 
            className="flex-1 relative bg-black flex items-center justify-center cursor-pointer"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Click Areas for Prev/Next */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
            <div className="absolute inset-y-0 right-0 w-2/3 z-10" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

            {/* Story Visual */}
            <div className={`absolute inset-0 flex items-center justify-center p-8 ${currentStory.bg || 'bg-gradient-to-br from-brand-navy to-brand-mint/20'}`}>
               {currentStory.image ? (
                 <img src={currentStory.image} alt="Story" className="w-full h-full object-cover absolute inset-0" />
               ) : (
                 <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white text-center leading-tight">
                   {currentStory.text}
                 </h2>
               )}
            </div>
          </div>

          {/* Footer Interactions */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
             <input 
               type="text" 
               placeholder={`Reply to ${currentStory.author.name}...`}
               className="flex-1 bg-transparent border border-white/30 rounded-full px-5 py-2.5 text-sm text-white placeholder-white/70 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-sm"
               onFocus={() => setIsPaused(true)}
               onBlur={() => setIsPaused(false)}
             />
             <button className="p-3 rounded-full hover:bg-white/10 text-white transition-colors shrink-0">
               <Heart className="w-6 h-6" />
             </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
