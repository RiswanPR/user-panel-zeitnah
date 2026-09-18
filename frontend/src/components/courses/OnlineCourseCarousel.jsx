import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import OnlineCourseCard from "./OnlineCourseCard";

/**
 * OnlineCourseCarousel
 *
 * Native CSS scroll-snap horizontal carousel for Online Courses.
 * - Snap scrolling with partial card peek
 * - Mouse drag + touch swipe + trackpad
 * - Prev/Next accessible buttons with ARIA labels
 * - Keyboard navigation (ArrowLeft / ArrowRight)
 * - Safe from horizontal page overflow
 */
export default function OnlineCourseCarousel({ courses }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Drag state
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 });

  /* ── Helpers ── */
  const getCardWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 320;
    const firstCard = track.querySelector(".carousel-card");
    if (!firstCard) return 320;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap) || 16;
    return firstCard.getBoundingClientRect().width + gap;
  }, []);

  const updateNavState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 4);

    const cardW = getCardWidth();
    const idx = Math.round(scrollLeft / cardW);
    setCurrentIndex(Math.max(0, Math.min(idx, courses.length - 1)));
  }, [getCardWidth, courses.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => updateNavState();
    track.addEventListener("scroll", onScroll, { passive: true });
    updateNavState();
    return () => track.removeEventListener("scroll", onScroll);
  }, [updateNavState]);

  /* ── Scroll actions ── */
  const scrollBy = useCallback(
    (direction) => {
      const track = trackRef.current;
      if (!track) return;
      const cardW = getCardWidth();
      track.scrollBy({ left: direction * cardW, behavior: "smooth" });
    },
    [getCardWidth]
  );

  const scrollToIndex = useCallback(
    (idx) => {
      const track = trackRef.current;
      if (!track) return;
      const cardW = getCardWidth();
      track.scrollTo({ left: cardW * idx, behavior: "smooth" });
    },
    [getCardWidth]
  );

  /* ── Mouse drag support ── */
  const handleMouseDown = (e) => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current = { active: true, startX: e.pageX, scrollLeft: track.scrollLeft };
    track.classList.add("cursor-grabbing");
  };

  const handleMouseMove = (e) => {
    if (!dragState.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();
    const dx = e.pageX - dragState.current.startX;
    track.scrollLeft = dragState.current.scrollLeft - dx;
  };

  const endDrag = () => {
    dragState.current.active = false;
    trackRef.current?.classList.remove("cursor-grabbing");
  };

  /* ── Keyboard accessible navigation ── */
  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollBy(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollBy(1);
    }
  };

  if (!courses || courses.length === 0) return null;

  return (
    <div className="relative w-full">
      {/* ── Carousel Header Controls (Desktop) ── */}
      {courses.length > 1 && (
        <div
          className="flex items-center justify-end gap-2 mb-4"
          aria-label="Carousel navigation controls"
        >
          {/* Numeric index indicator */}
          <span className="text-[11px] font-mono font-semibold text-text-muted tabular-nums mr-2 select-none">
            {String(currentIndex + 1).padStart(2, "0")}
            <span className="opacity-40 mx-0.5">/</span>
            {String(courses.length).padStart(2, "0")}
          </span>

          <button
            type="button"
            aria-label="Previous online classes"
            disabled={!canPrev}
            onClick={() => scrollBy(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-card border border-white/[0.08] text-white hover:bg-bg-elevated hover:border-brand-mint/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer focus-ring"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next online classes"
            disabled={!canNext}
            onClick={() => scrollBy(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-card border border-white/[0.08] text-white hover:bg-bg-elevated hover:border-brand-mint/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer focus-ring"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Carousel track ── */}
      <div
        ref={trackRef}
        role="region"
        aria-label="Online Courses carousel"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onKeyDown={handleKeyDown}
        className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1 px-0.5 -mx-0.5 outline-none cursor-grab"
      >
        {courses.map((course, i) => (
          <div
            key={course._id}
            className="carousel-card flex-none w-[calc(85vw-1rem)] sm:w-[320px] md:w-[340px] snap-start"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <OnlineCourseCard course={course} compact />
            </motion.div>
          </div>
        ))}

        {/* Right spacing buffer */}
        <div className="w-4 shrink-0" aria-hidden="true" />
      </div>

      {/* ── Dot Indicator (Mobile) ── */}
      {courses.length > 1 && (
        <div
          className="mt-4 flex items-center justify-center gap-1.5 sm:hidden"
          aria-hidden="true"
        >
          {courses.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-4 h-1.5 bg-brand-mint"
                  : "w-1.5 h-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
