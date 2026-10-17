/**
 * PostCardSkeleton — High-fidelity shimmer skeleton matching the exact PostCard social geometry.
 * Prevents layout shift during initial feed load and incremental pagination.
 */
export default function PostCardSkeleton({ variant = 'media', className = '' }) {
  const isMedia = variant !== 'text';

  return (
    <article
      className={`zn-card bg-surface-card border border-border rounded-2xl shadow-sm mb-3 sm:mb-4 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. Header: Author Identity & Options (~54px) */}
      <div className="flex items-center justify-between gap-3 h-14 px-3.5 sm:px-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-elevated shrink-0 shimmer" />
          <div className="space-y-1.5">
            <div className="w-28 sm:w-32 h-3.5 bg-surface-elevated rounded shimmer" />
            <div className="w-20 h-2.5 bg-surface-elevated/70 rounded shimmer" />
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-surface-elevated/70 shimmer" />
      </div>

      {/* 2. Media or Text Presentation */}
      {isMedia ? (
        <div className="w-full aspect-[4/5] sm:aspect-video bg-surface-elevated/60 border-y border-border overflow-hidden relative" data-aspect="aspect-video">
          <div className="absolute inset-0 bg-surface-elevated shimmer" />
        </div>
      ) : (
        <div className="px-3.5 sm:px-4 py-3.5 space-y-2">
          <div className="w-full h-3.5 bg-surface-elevated rounded shimmer" />
          <div className="w-5/6 h-3.5 bg-surface-elevated/80 rounded shimmer" />
          <div className="w-2/3 h-3 bg-surface-elevated/60 rounded shimmer" />
        </div>
      )}

      {/* 3. Actions Row */}
      <div className="flex items-center justify-between pt-2 px-3.5 sm:px-4 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-elevated/80 shimmer" />
          <div className="w-7 h-7 rounded-full bg-surface-elevated/80 shimmer" />
          <div className="w-7 h-7 rounded-full bg-surface-elevated/80 shimmer" />
          <div className="w-7 h-7 rounded-full bg-surface-elevated/80 shimmer" />
        </div>
        <div className="w-7 h-7 rounded-full bg-surface-elevated/80 shimmer" />
      </div>

      {/* 4. Engagement Line */}
      <div className="pt-1.5 px-3.5 sm:px-4 pb-0.5">
        <div className="w-24 h-3 bg-surface-elevated/80 rounded shimmer" />
      </div>

      {/* 5. Caption & Comment Teaser Placeholders for media posts */}
      {isMedia && (
        <div className="space-y-1.5 px-3.5 sm:px-4 py-2">
          <div className="w-full h-3 bg-surface-elevated/80 rounded shimmer" />
          <div className="w-3/4 h-3 bg-surface-elevated/60 rounded shimmer" />
        </div>
      )}
      <div className="h-2" />
    </article>
  );
}
