export default function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Hero Skeleton */}
      <div className="h-44 bg-bg-card rounded-2xl border border-border-default p-6 flex flex-col justify-between" />

      {/* Personal Position Card Skeleton */}
      <div className="h-32 bg-bg-card rounded-2xl border border-border-default p-6" />

      {/* Podium Skeleton */}
      <div className="flex items-end justify-center gap-4 max-w-2xl mx-auto px-4 pt-6">
        <div className="w-1/3 h-44 bg-bg-card rounded-t-2xl border-t border-x border-border-default" />
        <div className="w-1/3 h-56 bg-bg-card rounded-t-2xl border-t border-x border-border-default" />
        <div className="w-1/3 h-36 bg-bg-card rounded-t-2xl border-t border-x border-border-default" />
      </div>

      {/* Controls Skeleton */}
      <div className="h-14 bg-bg-card rounded-2xl border border-border-default" />

      {/* Table Skeleton */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-bg-card rounded-xl border border-border-default"
          />
        ))}
      </div>
    </div>
  );
}
