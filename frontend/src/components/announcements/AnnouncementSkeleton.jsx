export default function AnnouncementSkeleton() {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] bg-bg-card p-5 sm:p-6 overflow-hidden relative"
      aria-hidden="true"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-3 w-28 shimmer rounded" />
            <div className="h-3 w-16 shimmer rounded-full" />
          </div>
          <div className="h-6 w-3/4 sm:w-1/2 shimmer rounded-lg" />
          <div className="h-4 w-full sm:w-4/5 shimmer rounded" />
        </div>
        <div className="h-10 w-32 shimmer rounded-xl shrink-0 self-start sm:self-center" />
      </div>
    </div>
  );
}
