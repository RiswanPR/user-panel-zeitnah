
/**
 * CommentSkeleton — Clean Zeitnah skeleton placeholder for comments loading state
 */
export default function CommentSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4 py-2" aria-busy="true" aria-label="Loading comments">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
        >
          {/* Avatar Skeleton */}
          <div className="w-8 h-8 rounded-full bg-white/[0.06] shrink-0 shimmer" />

          {/* Text Skeletons */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-24 h-3.5 bg-white/[0.08] rounded shimmer" />
              <div className="w-10 h-3 bg-white/[0.04] rounded shimmer" />
            </div>
            <div className="w-full h-3 bg-white/[0.05] rounded shimmer" />
            <div className="w-3/5 h-3 bg-white/[0.04] rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
