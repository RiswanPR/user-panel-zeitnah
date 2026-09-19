import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Activity,
  Users,
  Award,
  Flame,
  CheckCircle2,
  BookOpen,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import NetworkActivityItem from "./NetworkActivityItem";
import { Skeleton } from "../ui/Skeleton";
import networkActivityService from "../../services/networkActivityService";

const SCOPE_OPTIONS = [
  { id: "all", label: "All Network" },
  { id: "connections", label: "My Connections" },
];

const TYPE_FILTERS = [
  { id: "all", label: "All Events", icon: Activity },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "streaks", label: "Streaks", icon: Flame },
  { id: "lessons", label: "Lessons", icon: CheckCircle2 },
];

/**
 * NetworkActivity Component
 * Server-driven learning timeline across Zeitnah LMS with scope, type filters,
 * pagination, summary telemetry, and accessible empty/error states.
 *
 * @param {Object} props
 * @param {string} [props.className=''] - Additional container styles
 * @param {Function} [props.onExploreDiscover] - Callback to switch to Discover tab if empty connections
 */
export default function NetworkActivity({
  className = "",
  onExploreDiscover,
}) {
  const [scope, setScope] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // ── 1. Telemetry Summary Query ──
  const { data: summary } = useQuery({
    queryKey: ["network", "activity", "summary"],
    queryFn: () => networkActivityService.fetchActivitySummary(),
    staleTime: 1000 * 60 * 2,
  });

  // ── 2. Infinite Activity Feed Query ──
  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["network", "activity", "feed", scope, selectedType],
    queryFn: ({ pageParam = 1 }) =>
      networkActivityService.fetchActivityFeed({
        page: pageParam,
        limit: 10,
        scope,
        type: selectedType,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage?.hasNextPage ? lastPage.page + 1 : undefined,
    staleTime: 1000 * 60 * 1,
  });

  // Flatten paginated records
  const activities = useMemo(() => {
    return infiniteData?.pages.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  const totalCount = infiniteData?.pages?.[0]?.total ?? 0;

  return (
    <section
      aria-labelledby="network-activity-heading"
      className={`rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/80 to-[#0A101D]/80 p-4 sm:p-6 backdrop-blur-xl shadow-lg space-y-5 ${className}`}
    >
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 shadow-sm">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="network-activity-heading"
              className="text-base font-heading font-extrabold text-white tracking-tight"
            >
              Network Activity
            </h2>
            <p className="text-xs text-text-muted">
              Authentic learning milestones across your community
            </p>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-mint opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-mint" />
          </span>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-mint">
            Community Stream
          </span>
        </div>
      </div>

      {/* ── Summary Telemetry Strip ── */}
      {summary && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 py-1">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3 text-center">
            <p className="text-sm sm:text-base font-heading font-extrabold text-white">
              {summary.activeConnectionsCount}
            </p>
            <p className="text-[10px] sm:text-[11px] text-text-muted truncate mt-0.5">
              Connections
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3 text-center">
            <p className="text-sm sm:text-base font-heading font-extrabold text-brand-mint">
              {summary.weeklyMilestonesCount}
            </p>
            <p className="text-[10px] sm:text-[11px] text-text-muted truncate mt-0.5">
              Milestones / 7d
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3 text-center">
            <p className="text-sm sm:text-base font-heading font-extrabold text-brand-yellow">
              {summary.weeklyAchievementsCount}
            </p>
            <p className="text-[10px] sm:text-[11px] text-text-muted truncate mt-0.5">
              Badges Earned / 7d
            </p>
          </div>
        </div>
      )}

      {/* ── Controls: Scope Tabs & Type Filter Pills ── */}
      <div className="space-y-3 pt-1">
        {/* Scope Selector: All vs My Connections */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setScope(opt.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus-ring ${
                scope === opt.id
                  ? "bg-brand-mint text-bg-surface shadow-sm"
                  : "text-text-muted hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TYPE_FILTERS.map((f) => {
            const FilterIcon = f.icon;
            const active = selectedType === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedType(f.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all focus-ring ${
                  active
                    ? "border-brand-mint/40 bg-brand-mint/15 text-brand-mint shadow-sm"
                    : "border-white/[0.06] bg-white/[0.02] text-text-muted hover:border-white/[0.12] hover:text-white"
                }`}
              >
                <FilterIcon className="h-3 w-3" aria-hidden="true" />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Activity Items Timeline ── */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3.5 rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4"
            >
              <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-1/3 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-red-400">
            Unable to load learning activities
          </p>
          <p className="text-xs text-text-muted">
            There was a problem fetching the community timeline.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.1] transition-colors focus-ring"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Try Again</span>
          </button>
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-3.5 pt-2">
          {activities.map((activity) => (
            <NetworkActivityItem key={activity.id} activity={activity} />
          ))}

          {/* Load More Button */}
          {hasNextPage && (
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/[0.08] hover:border-white/[0.2] disabled:opacity-50 focus-ring"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-mint" />
                    <span>Loading more activities...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Activities</span>
                    <span className="text-[11px] font-mono text-text-muted">
                      ({activities.length} of {totalCount})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-8 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-text-muted">
            {scope === "connections" ? (
              <Users className="h-5 w-5" />
            ) : (
              <Activity className="h-5 w-5" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-white">
              {scope === "connections"
                ? "No connection activities yet"
                : "No matching activities"}
            </p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {scope === "connections"
                ? "Connect with fellow students in Discover to see their course progress, achievements, and streaks here."
                : "No learning milestones have been recorded for this category yet. Check back soon!"}
            </p>
          </div>

          {scope === "connections" ? (
            <button
              type="button"
              onClick={() => {
                if (onExploreDiscover) {
                  onExploreDiscover();
                } else {
                  setScope("all");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-mint px-4 py-2 text-xs font-semibold text-bg-surface hover:bg-brand-mint/90 transition-colors shadow-sm focus-ring"
            >
              <span>{onExploreDiscover ? "Explore Discover" : "View All Network"}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : (
            selectedType !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedType("all")}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-mint hover:underline"
              >
                Clear filter
              </button>
            )
          )}
        </div>
      )}
    </section>
  );
}
