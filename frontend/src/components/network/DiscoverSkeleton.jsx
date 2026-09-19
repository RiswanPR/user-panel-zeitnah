import { Skeleton } from "../ui/Skeleton";

/**
 * DiscoverSkeleton Component
 * Matches the exact dimensions and hierarchy of StudentCard to prevent layout shifts.
 *
 * @param {Object} props
 * @param {number} [props.count=8] - Number of skeleton cards to render
 */
export default function DiscoverSkeleton({ count = 8 }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      aria-busy="true"
      aria-label="Loading student cards"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#111A29]/60 to-[#0A101D]/60 p-5 space-y-4"
        >
          <div>
            {/* Top: Avatar + Name + Username */}
            <div className="flex items-start gap-3.5">
              <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>

            {/* Headline */}
            <div className="mt-3 space-y-1.5">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>

            {/* Course Context */}
            <div className="mt-3">
              <Skeleton className="h-7 w-full rounded-xl" />
            </div>

            {/* Interest Chips */}
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-lg" />
              <Skeleton className="h-5 w-14 rounded-lg" />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2">
            <Skeleton className="h-8 flex-1 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
