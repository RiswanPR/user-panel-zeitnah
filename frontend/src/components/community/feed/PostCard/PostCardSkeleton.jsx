/**
 * PostCardSkeleton — High-fidelity shimmer skeleton matching the exact PostCard social geometry.
 * Prevents layout shift during initial feed load and incremental pagination.
 */
export default function PostCardSkeleton({ className = '' }) {
  return (
    <article
      className={`zn-card bg-[#0B111E] border border-white/[0.08] rounded-none sm:rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] mb-4 sm:mb-6 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. Header: Author Identity & Options (~54px) */}
      <div className="flex items-center justify-between gap-3 h-14 px-3.5 sm:px-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.06] shrink-0 shimmer" />
          <div className="space-y-1.5">
            <div className="w-28 sm:w-32 h-3.5 bg-white/[0.08] rounded shimmer" />
            <div className="w-20 h-2.5 bg-white/[0.04] rounded shimmer" />
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/[0.04] shimmer" />
      </div>

      {/* 2. Media Presentation Container (Directly under header) */}
      <div className="w-full aspect-video sm:aspect-[4/5] max-h-[520px] bg-[#070B14] border-y sm:border-y border-white/[0.06] overflow-hidden relative">
        <div className="absolute inset-0 bg-white/[0.03] shimmer" />
      </div>

      {/* 3. Actions Row */}
      <div className="flex items-center justify-between pt-2.5 px-3.5 sm:px-4 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
          <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
          <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
          <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
        </div>
        <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
      </div>

      {/* 4. Engagement Line */}
      <div className="pt-1 px-3.5 sm:px-4 pb-1">
        <div className="w-24 h-3 bg-white/[0.06] rounded shimmer" />
      </div>

      {/* 5. Caption & Comment Teaser Placeholders */}
      <div className="space-y-1.5 px-3.5 sm:px-4 py-2">
        <div className="w-full h-3 bg-white/[0.05] rounded shimmer" />
        <div className="w-3/4 h-3 bg-white/[0.04] rounded shimmer" />
        <div className="w-28 h-2.5 bg-white/[0.03] rounded shimmer mt-2" />
      </div>
    </article>
  );
}
