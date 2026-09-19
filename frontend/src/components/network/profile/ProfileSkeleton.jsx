/**
 * ProfileSkeleton Component
 * Smooth layout-matched skeleton for student profile view to prevent layout shift.
 */
export default function ProfileSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse" aria-busy="true" aria-label="Loading profile">
      {/* Header Skeleton */}
      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-bg-surface/60 shadow-xl">
        {/* Cover banner skeleton */}
        <div className="h-44 sm:h-56 md:h-64 w-full bg-white/[0.03]" />

        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar skeleton */}
            <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-3xl bg-white/[0.08] border-4 border-bg-surface" />

            {/* Action buttons skeleton */}
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-28 rounded-xl bg-white/[0.06]" />
              <div className="h-10 w-10 rounded-xl bg-white/[0.04]" />
            </div>
          </div>

          {/* Name & Headline skeleton */}
          <div className="mt-4 space-y-3">
            <div className="h-7 w-48 rounded-lg bg-white/[0.08]" />
            <div className="h-4 w-72 rounded-md bg-white/[0.04]" />
            <div className="flex gap-4 pt-1">
              <div className="h-3.5 w-24 rounded bg-white/[0.03]" />
              <div className="h-3.5 w-32 rounded bg-white/[0.03]" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="h-11 w-80 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-white/[0.06] bg-bg-surface/60 p-4" />
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-48 rounded-2xl border border-white/[0.06] bg-bg-surface/60 p-6" />
          <div className="h-64 rounded-2xl border border-white/[0.06] bg-bg-surface/60 p-6" />
        </div>
        <div className="space-y-6">
          <div className="h-36 rounded-2xl border border-white/[0.06] bg-bg-surface/60 p-6" />
          <div className="h-48 rounded-2xl border border-white/[0.06] bg-bg-surface/60 p-6" />
        </div>
      </div>
    </div>
  );
}
