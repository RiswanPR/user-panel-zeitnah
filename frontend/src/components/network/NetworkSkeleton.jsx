import { Skeleton, SkeletonCard } from "../ui/Skeleton";

/**
 * NetworkSkeleton Component
 * Skeleton loader representing the full /network layout structure to prevent layout shifts.
 */
export default function NetworkSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse" aria-busy="true" aria-label="Loading network content">
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-bg-surface/80 p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 w-full max-w-xl">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-9 w-3/4 rounded-xl" />
            <Skeleton className="h-4 w-5/6 rounded" />
          </div>

          <div className="h-20 w-full sm:w-64 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Skeletons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Skeleton className="h-11 w-72 rounded-2xl" />
        <Skeleton className="h-12 w-full sm:w-80 rounded-2xl" />
      </div>

      {/* Main Grid: Student Cards + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Cards Skeleton (2 columns on large screen) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-6 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="min-h-[220px]" />
            ))}
          </div>
        </div>

        {/* Activity Feed Skeleton (1 column) */}
        <div className="rounded-2xl border border-white/[0.08] bg-bg-surface/70 p-5 space-y-4">
          <Skeleton className="h-6 w-36 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.04]">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3 rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                  <Skeleton className="h-3 w-1/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
