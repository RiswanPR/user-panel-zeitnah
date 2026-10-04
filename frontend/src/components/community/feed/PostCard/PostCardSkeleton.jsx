/**
 * PostCardSkeleton — High-fidelity shimmer skeleton matching the exact PostCard social geometry.
 * Prevents layout shift during initial feed load and incremental pagination.
 */
export default function PostCardSkeleton({ className = '' }) {
  return (
    <article
      className={`zn-card bg-[#090E1A] sm:bg-[#0B111E] border-y border-white/[0.06] border-x-0 sm:border sm:border-white/[0.06] rounded-none sm:rounded-2xl sm:shadow-[0_2px_16px_rgba(0,0,0,0.25)] mb-3 sm:mb-6 overflow-hidden select-none ${className}`}
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

      {/* 2. Media Presentation Container (Directly under header - reserves 4:5 social geometry with aspect-video support) */}
      <div className="w-full aspect-[4/5] bg-[#070B14] border-y border-white/[0.04] overflow-hidden relative" data-aspect="aspect-video">
        <div className="absolute inset-0 bg-white/[0.03] shimmer" />
      </div>

      {/* 3. Actions Row */}
      <div className="flex items-center justify-between pt-2 px-3.5 sm:px-4 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
          <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
          <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
          <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
        </div>
        <div className="w-7 h-7 rounded-full bg-white/[0.05] shimmer" />
      </div>

      {/* 4. Engagement Line */}
      <div className="pt-1.5 px-3.5 sm:px-4 pb-0.5">
        <div className="w-24 h-3 bg-white/[0.06] rounded shimmer" />
      </div>

      {/* 5. Caption & Comment Teaser Placeholders */}
      <div className="space-y-1.5 px-3.5 sm:px-4 py-1.5">
        <div className="w-full h-3 bg-white/[0.05] rounded shimmer" />
        <div className="w-3/4 h-3 bg-white/[0.04] rounded shimmer" />
        <div className="w-24 h-2.5 bg-white/[0.03] rounded shimmer mt-1.5" />
      </div>
    </article>
  );
}
