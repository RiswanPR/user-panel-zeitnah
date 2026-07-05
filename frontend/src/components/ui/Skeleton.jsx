/**
 * Skeleton loading primitives with shimmer animation.
 * Use these instead of raw `div className="shimmer"` for consistent loading states.
 */

export function Skeleton({ className = '', style }) {
  return <div className={`shimmer ${className}`} style={style} />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-4 rounded"
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
    <div className={`rounded-2xl border border-border-default bg-bg-card p-5 space-y-4 ${className}`}>
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

export default Skeleton;
