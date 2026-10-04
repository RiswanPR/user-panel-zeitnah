/**
 * PostCardSkeleton — High-fidelity shimmer skeleton matching the exact PostCard geometry
 * Prevents layout shift during initial feed load and incremental pagination.
 */
export default function PostCardSkeleton({ className = '' }) {
  return (
    <article
      className={`zn-card bg-[#0B111E] border border-white/[0.07] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-4 sm:p-5 mb-4 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. Header: Author Identity & Action Options */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/[0.06] shrink-0 shimmer" />
          <div className="space-y-1.5">
            <div className="w-32 h-4 bg-white/[0.08] rounded shimmer" />
            <div className="w-20 h-3 bg-white/[0.04] rounded shimmer" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/[0.04] shimmer" />
      </div>

      {/* 2. Content: Caption / Description */}
      <div className="space-y-2 my-3">
        <div className="w-full h-3.5 bg-white/[0.06] rounded shimmer" />
        <div className="w-4/5 h-3.5 bg-white/[0.05] rounded shimmer" />
        <div className="w-2/5 h-3 bg-white/[0.04] rounded shimmer" />
      </div>

      {/* 3. Media Presentation Container */}
      <div className="w-full aspect-video sm:aspect-[16/10] rounded-xl sm:rounded-2xl bg-[#070B14] border border-white/[0.06] overflow-hidden my-3 relative">
        <div className="absolute inset-0 bg-white/[0.03] shimmer" />
      </div>

      {/* 4. Actions Row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-16 h-9 rounded-xl bg-white/[0.05] shimmer" />
          <div className="w-20 h-9 rounded-xl bg-white/[0.05] shimmer" />
          <div className="w-16 h-9 rounded-xl bg-white/[0.05] shimmer" />
          <div className="w-16 h-9 rounded-xl bg-white/[0.05] shimmer" />
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/[0.05] shimmer" />
      </div>

      {/* 5. Engagement Metadata */}
      <div className="pt-3 px-1">
        <div className="w-28 h-3 bg-white/[0.05] rounded shimmer" />
      </div>
    </article>
  );
}
