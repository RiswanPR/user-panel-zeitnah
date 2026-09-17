import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import OnlineCourseCard from "./OnlineCourseCard";

/**
 * OnlineCourseCarousel
 *
 * Native CSS scroll-snap horizontal carousel for Online Courses.
 * - No third-party carousel library
 * - scroll-snap-type: x mandatory
 * - Mouse drag + touch swipe + trackpad
 * - Prev/Next buttons with ARIA labels
 * - Keyboard navigation (ArrowLeft / ArrowRight)
 * - Partial card peek (next card visible at edge)
 * - No page-level horizontal overflow — only this container scrolls
 * - Progress indicator (01 / 04)
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
    if (!track) return 300;
    const firstCard = track.querySelector(".carousel-card");
    if (!firstCard) return 300;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap) || 16;
    return firstCard.getBoundingClientRect().width + gap;
  }, []);

  const updateNavState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanPrev(scrollLeft > 2);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 2);

    // Compute current index from scroll position
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

  /* ── Scroll by N cards ── */
  const scrollBy = useCallback((direction) => {
    const track = trackRef.current;
    if (!track) return;
    const cardW = getCardWidth();
    track.scrollBy({ left: direction * cardW, behavior: "smooth" });
  }, [getCardWidth]);

  const scrollToIndex = useCallback((idx) => {
    const track = trackRef.current;
    if (!track) return;
    const cardW = getCardWidth();
    track.scrollTo({ left: cardW * idx, behavior: "smooth" });
  }, [getCardWidth]);

  /* ── Mouse drag ── */
  const handleMouseDown = (e) => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current = { active: true, startX: e.pageX, scrollLeft: track.scrollLeft };
    track.classList.add("is-dragging");
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
    trackRef.current?.classList.remove("is-dragging");
  };

  /* ── Keyboard ── */
  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); scrollBy(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); scrollBy(1); }
  };

  if (!courses || courses.length === 0) return null;

  return (
    <div className="relative">

      {/* ── Skeleton animation wrapper ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >

        {/* ── Carousel track ── */}
        <div
          ref={trackRef}
          role="list"
          aria-label="Online Courses"
          tabIndex={0}
          className="carousel-track outline-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onKeyDown={handleKeyDown}
        >
          {courses.map((course, i) => (
            <div
              key={course._id}
              role="listitem"
              className="carousel-card w-[calc(85vw-1rem)] sm:w-[300px] md:w-[320px] lg:w-[340px]"
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <OnlineCourseCard course={course} compact />
              </motion.div>
            </div>
          ))}

          {/* Right peek spacer */}
          <div className="w-4 shrink-0" aria-hidden="true" />
        </div>
      </motion.div>

      {/* ── Navigation controls ── */}
      {courses.length > 1 && (
        <div
          className="absolute -top-[3.2rem] right-0 flex items-center gap-2"
          aria-label="Carousel navigation"
        >
          {/* Progress indicator */}
          <span className="text-[11px] font-mono font-semibold text-text-muted tabular-nums mr-1">
            {String(currentIndex + 1).padStart(2, "0")}
            <span className="opacity-40 mx-0.5">/</span>
            {String(courses.length).padStart(2, "0")}
          </span>

          <button
            type="button"
            aria-label="Previous online classes"
            disabled={!canPrev}
            onClick={() => scrollBy(-1)}
            className="carousel-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next online classes"
            disabled={!canNext}
            onClick={() => scrollBy(1)}
            className="carousel-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Dot indicator (mobile) ── */}
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
