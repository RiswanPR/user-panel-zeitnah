import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ArrowUpRight, ArrowRight, Star } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import leaderboardService from "../../services/leaderboardService";

/**
 * Premium skeleton for the sidebar status capsule.
 * Uses exact proportional dimensions to prevent layout shifts.
 */
function LeaderboardSidebarSkeleton() {
  return (
    <div className="mx-2 my-2 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse space-y-3">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-white/[0.08]" />
          <div className="w-20 h-3 rounded bg-white/[0.06]" />
        </div>
        <div className="w-3.5 h-3.5 rounded bg-white/[0.06]" />
      </div>

      {/* Rank hero skeleton */}
      <div className="flex flex-col items-center py-2 space-y-1.5">
        <div className="w-16 h-2 rounded bg-white/[0.04]" />
        <div className="w-14 h-7 rounded-lg bg-white/[0.08]" />
        <div className="w-16 h-2 rounded bg-white/[0.04]" />
      </div>

      {/* Stats skeleton */}
      <div className="flex items-center justify-between pt-1">
        <div className="w-12 h-3 rounded bg-white/[0.05]" />
        <div className="w-14 h-3 rounded bg-white/[0.05]" />
      </div>

      {/* Progress skeleton */}
      <div className="w-full h-1 rounded-full bg-white/[0.06]" />

      {/* CTA skeleton */}
      <div className="h-5 w-full bg-white/[0.04] rounded-lg pt-1" />
    </div>
  );
}

/**
 * Signature Zeitnah Leaderboard Card — "Personal Competitive Status Capsule"
 * Elegant, minimal, aspirational status element living in the desktop sidebar
 * below the main navigation items and above the user identity block.
 */
export default function LeaderboardSidebarCard() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.userId;

  // Active state: when on /leaderboard or /leaderboard/:courseId
  const isLeaderboardActive =
    location.pathname === "/leaderboard" ||
    location.pathname.startsWith("/leaderboard/");

  // Authoritative student position query (cached with React Query)
  const {
    data: position,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["leaderboard", "position"],
    queryFn: () => leaderboardService.getMyLeaderboardPosition(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: Boolean(currentUserId),
    retry: 1,
  });

  // Loading state with branded skeleton
  if (isLoading && !position) {
    return <LeaderboardSidebarSkeleton />;
  }

  // Graceful failure state: preserves clean navigation without fake or broken ranks
  if (isError || !position?.rank) {
    return (
      <div className="mx-2 my-2">
        <Link
          to="/leaderboard"
          className={`block p-3 rounded-2xl border transition-all duration-200 group focus-ring ${
            isLeaderboardActive
              ? "bg-brand-yellow/[0.05] border-brand-yellow/35 text-white"
              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] text-text-muted hover:text-white"
          }`}
          aria-label="View Leaderboard"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-brand-yellow" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                Leaderboard
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>
    );
  }

  const rank = position.rank;
  const points = position.points || 0;
  const level = position.level || 1;
  const rankTitle = position.rankTitle || "Beginner";
  const nextLevel = level + 1;
  const levelProgress = position.levelProgress;
  const xpNeeded = levelProgress?.pointsNeededForNextLevel;
  const progressPercent = Math.min(100, Math.max(0, levelProgress?.progressPercent || 0));

  return (
    <div className="mx-2 my-2">
      <Link
        to="/leaderboard"
        aria-label={`Leaderboard, your current standing is rank ${rank} with ${points.toLocaleString()} XP`}
        className={`relative block rounded-2xl border p-3.5 transition-all duration-200 group overflow-hidden focus-ring ${
          isLeaderboardActive
            ? "border-brand-yellow/35 bg-gradient-to-b from-brand-yellow/[0.04] to-bg-card/95 shadow-[0_0_24px_rgba(234,179,8,0.06)]"
            : "border-white/[0.08] bg-gradient-to-b from-bg-card/95 to-bg-card/75 hover:border-white/[0.18] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        }`}
      >
        {/* Subtle top accent line */}
        <div
          className={`absolute inset-x-0 top-0 h-[1px] ${
            isLeaderboardActive
              ? "bg-gradient-to-r from-transparent via-brand-yellow/50 to-transparent"
              : "bg-gradient-to-r from-transparent via-white/[0.12] to-transparent group-hover:via-brand-yellow/30 transition-all duration-300"
          }`}
        />

        {/* ── 1. Header: Trophy + Label + ArrowUpRight ── */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <Trophy
              className="w-3.5 h-3.5 text-brand-yellow shrink-0 group-hover:scale-105 transition-transform duration-200"
              aria-hidden="true"
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 font-heading">
              Leaderboard
            </span>
          </div>

          <ArrowUpRight
            className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-yellow group-hover:translate-x-0.5 transition-all duration-200"
            aria-hidden="true"
          />
        </div>

        {/* ── 2. Signature Rank Display: Hero Number with Depth Glow ── */}
        <div className="relative py-2.5 text-center">
          {/* Subtle radial depth glow behind rank */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-xl pointer-events-none transition-all duration-300 ${
              isLeaderboardActive
                ? "bg-brand-yellow/[0.15]"
                : "bg-brand-yellow/[0.08] group-hover:bg-brand-yellow/[0.15]"
            }`}
          />

          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-muted relative z-10">
            Your Standing
          </p>

          <div className="my-0.5 relative z-10">
            <span className="font-heading font-black text-2xl sm:text-[28px] leading-tight font-mono tracking-tight tabular-nums text-white group-hover:text-brand-yellow transition-colors duration-200">
              #{rank}
            </span>
          </div>

          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-faint group-hover:text-text-muted relative z-10 transition-colors">
            Global Rank
          </p>
        </div>

        {/* ── 3. XP + Level Metadata ── */}
        <div className="flex items-center justify-between py-1.5 px-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
          <div className="text-left">
            <p className="text-[11px] font-mono font-bold tabular-nums text-white leading-none">
              {points.toLocaleString()}{" "}
              <span className="text-[9px] text-text-muted font-normal">XP</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-mono font-bold tabular-nums text-brand-mint leading-none flex items-center gap-1 justify-end">
              <Star className="w-2.5 h-2.5 text-brand-yellow fill-brand-yellow/30" />
              L{level}
              <span className="text-[9px] text-text-muted font-medium uppercase font-body truncate max-w-[70px]">
                • {rankTitle}
              </span>
            </p>
          </div>
        </div>

        {/* ── 4. Level Progress Bar (if data available) ── */}
        {xpNeeded && xpNeeded > 0 ? (
          <div className="pt-2 pb-1 space-y-1">
            <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-mint via-brand-yellow to-brand-yellow transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-text-muted font-mono tabular-nums">
              <span>{xpNeeded.toLocaleString()} XP to L{nextLevel}</span>
              <span className="text-text-faint">{progressPercent}%</span>
            </div>
          </div>
        ) : null}

        {/* ── 5. Premium Copy ── */}
        <p className="text-[9px] text-text-faint font-medium text-center pt-1.5 leading-snug">
          Keep learning. Keep climbing.
        </p>

        {/* ── 6. Interactive CTA ── */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-secondary group-hover:text-brand-yellow transition-colors">
          <span>View Leaderboard</span>
          <ArrowRight
            className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200"
            aria-hidden="true"
          />
        </div>
      </Link>
    </div>
  );
}
