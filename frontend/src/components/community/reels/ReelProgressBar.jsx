import { useEffect, useRef, useCallback } from 'react';

/**
 * ReelProgressBar — High-performance, zero-rerender video progress bar.
 * Updates an inner bar directly using CSS hardware-accelerated transforms (scaleX)
 * without triggering React state updates 60 times per second.
 */
export default function ReelProgressBar({ videoRef, isSeekingAllowed = true }) {
  const barRef = useRef(null);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Direct DOM transform update on video timeupdate
  useEffect(() => {
    const video = videoRef?.current;
    const bar = barRef.current;
    if (!video || !bar) return;

    const handleTimeUpdate = () => {
      if (isDraggingRef.current) return;
      if (!video.duration || Number.isNaN(video.duration)) {
        bar.style.transform = 'scaleX(0)';
        return;
      }
      const progress = Math.min(Math.max(video.currentTime / video.duration, 0), 1);
      bar.style.transform = `scaleX(${progress})`;
    };

    const handleEnded = () => {
      if (!isDraggingRef.current) {
        bar.style.transform = 'scaleX(1)';
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoRef]);

  // Scrubbing / Seek handler
  const handleSeek = useCallback(
    (clientX) => {
      const video = videoRef?.current;
      const container = containerRef.current;
      const bar = barRef.current;
      if (!video || !container || !video.duration) return;

      const rect = container.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = clickX / rect.width;

      if (bar) {
        bar.style.transform = `scaleX(${percentage})`;
      }
      video.currentTime = percentage * video.duration;
    },
    [videoRef]
  );

  const handlePointerDown = (e) => {
    if (!isSeekingAllowed) return;
    e.stopPropagation();
    isDraggingRef.current = true;
    handleSeek(e.clientX);

    const onPointerMove = (moveEvent) => {
      if (isDraggingRef.current) {
        handleSeek(moveEvent.clientX);
      }
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="absolute bottom-0 inset-x-0 h-1 sm:h-1.5 bg-white/20 hover:h-2 transition-all cursor-pointer z-30 select-none group touch-none"
      role="progressbar"
      aria-label="Video playback progress"
    >
      <div
        ref={barRef}
        className="h-full w-full bg-gradient-to-r from-brand-mint via-brand-yellow to-brand-mint origin-left transform scale-x-0 will-change-transform shadow-[0_0_8px_rgba(159,213,178,0.8)]"
      />
    </div>
  );
}
