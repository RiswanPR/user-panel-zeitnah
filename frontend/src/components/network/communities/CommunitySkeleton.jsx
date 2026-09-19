/**
 * CommunitySkeleton Component
 * Modern shimmer loading placeholders for communities grid, hero, discussions, and members.
 */

export function CommunityCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
      <div>
        <div className="flex items-start gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.05] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-lg bg-white/[0.06]" />
            <div className="h-3 w-1/3 rounded-lg bg-white/[0.04]" />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-white/[0.04]" />
          <div className="h-3 w-4/5 rounded bg-white/[0.04]" />
        </div>

        <div className="mt-4 flex gap-2">
          <div className="h-5 w-14 rounded-lg bg-white/[0.04]" />
          <div className="h-5 w-16 rounded-lg bg-white/[0.04]" />
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between">
        <div className="h-8 w-24 rounded-xl bg-white/[0.04]" />
        <div className="h-8 w-20 rounded-xl bg-white/[0.05]" />
      </div>
    </div>
  );
}

export function CommunityHeroSkeleton() {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <div className="h-20 w-20 rounded-2xl bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-28 rounded-lg bg-white/[0.04]" />
          <div className="h-7 w-2/3 rounded-lg bg-white/[0.06]" />
          <div className="h-4 w-full max-w-xl rounded bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
