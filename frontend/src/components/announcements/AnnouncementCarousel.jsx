import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AnnouncementCard from "./AnnouncementCard";

export default function AnnouncementCarousel({ announcements, onDismiss }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const count = announcements.length;
  const safeIndex = Math.min(currentIndex, Math.max(0, count - 1));
  const currentAnnouncement = announcements[safeIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Subtle auto-advance every 10 seconds (paused on hover / focus)
  useEffect(() => {
    if (count <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      handleNext();
    }, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, isPaused, handleNext]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  if (!currentAnnouncement) return null;

  const paginationStr = `${String(safeIndex + 1).padStart(2, "0")} / ${String(
    count
  ).padStart(2, "0")}`;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Announcements Carousel"
      className="relative outline-none group/carousel"
    >
      <AnimatePresence mode="wait">
        <AnnouncementCard
          key={currentAnnouncement.id}
          announcement={currentAnnouncement}
          onDismiss={onDismiss}
          pagination={paginationStr}
        />
      </AnimatePresence>

      {/* Subtle arrow controls */}
      {count > 1 && (
        <div className="absolute right-4 bottom-5 sm:bottom-6 flex items-center gap-1.5 z-20">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous announcement"
            className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-text-muted hover:text-white flex items-center justify-center transition-all cursor-pointer focus-ring"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next announcement"
            className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-text-muted hover:text-white flex items-center justify-center transition-all cursor-pointer focus-ring"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
