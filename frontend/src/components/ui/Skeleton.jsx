/**
 * Zeitnah 2.0 Skeleton Loading Primitives
 * Provides uniform shimmer loading skeletons matching actual editorial layouts.
 */

export function Skeleton({ className = '', style }) {
  return <div className={`shimmer ${className}`} style={style} />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-4 rounded-md"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 48, className = '' }) {
  return (
    <div
      className={`shimmer rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-bg-card/70 p-5 space-y-4 ${className}`}>
      <div className="shimmer h-40 rounded-xl" />
      <div className="space-y-2">
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-3 w-1/2 rounded" />
      </div>
      <div className="shimmer h-10 rounded-xl" />
    </div>
  );
}

export function SkeletonImage({ className = '', aspectRatio = '16/9' }) {
  return (
    <div
      className={`shimmer rounded-xl w-full ${className}`}
      style={{ aspectRatio }}
    />
  );
}

export function SkeletonProfile({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-bg-card/80 p-6 space-y-6 ${className}`}>
      <div className="flex items-center gap-4">
        <SkeletonCircle size={72} />
        <div className="space-y-2 flex-1">
          <div className="shimmer h-6 w-48 rounded" />
          <div className="shimmer h-4 w-32 rounded" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <div className="shimmer h-9 w-28 rounded-xl" />
        <div className="shimmer h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] bg-bg-card/60 p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SkeletonCircle size={40} />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="shimmer h-4 w-36 rounded" />
              <div className="shimmer h-3 w-24 rounded" />
            </div>
          </div>
          <div className="shimmer h-8 w-20 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage({ className = '' }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-2 pb-4 border-b border-white/[0.06]">
        <div className="shimmer h-3 w-24 rounded-full" />
        <div className="shimmer h-8 w-64 rounded-lg" />
        <div className="shimmer h-4 w-96 max-w-full rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export default Skeleton;
