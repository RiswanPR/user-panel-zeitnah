import { useContext } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Trophy,
  ArrowRight,
  Crown,
  Medal,
  Star,
  User,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import leaderboardService from "../../services/leaderboardService";

/**
 * Skeleton loader for the LeaderboardPreview section.
 * Eliminates CLS by mirroring the exact 3-column / responsive dimensions.
 */
function LeaderboardPreviewSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-bg-card p-6 sm:p-8 animate-pulse relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-stretch gap-6 sm:gap-8">
        {/* Left Column Skeleton */}
        <div className="w-full lg:w-1/4 space-y-3 shrink-0">
          <div className="h-5 w-28 bg-white/[0.05] rounded-lg" />
          <div className="h-8 w-44 bg-white/[0.07] rounded-xl" />
          <div className="h-4 w-full bg-white/[0.04] rounded" />
          <div className="h-4 w-3/4 bg-white/[0.04] rounded" />
          <div className="h-9 w-40 bg-white/[0.06] rounded-xl mt-4" />
        </div>

        {/* Center Podium Skeleton */}
        <div className="flex-1 flex items-end justify-center gap-3 sm:gap-4 px-2 min-h-[190px]">
          <div className="w-20 sm:w-24 h-28 bg-white/[0.04] rounded-t-2xl" />
          <div className="w-24 sm:w-28 h-36 bg-white/[0.06] rounded-t-2xl" />
          <div className="w-20 sm:w-24 h-24 bg-white/[0.04] rounded-t-2xl" />
        </div>

        {/* Right Column Skeleton */}
        <div className="w-full lg:w-1/3 space-y-3 shrink-0">
          <div className="h-12 bg-white/[0.04] rounded-xl" />
          <div className="h-12 bg-white/[0.04] rounded-xl" />
          <div className="h-16 bg-white/[0.06] rounded-xl mt-2" />
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPreview() {
  const { user } = useContext(AuthContext);
  const currentUserId = user?._id || user?.userId;
  const shouldReduceMotion = useReducedMotion();

  // 1. Fetch top 5 learners for preview
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    isError: isErrorPreview,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ["leaderboard", "preview"],
    queryFn: () => leaderboardService.getGlobalLeaderboard({ page: 1, limit: 5 }),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // 2. Fetch authenticated student's personal position
  const {
    data: personalPosition,
    isLoading: isLoadingPosition,
  } = useQuery({
    queryKey: ["leaderboard", "position"],
    queryFn: () => leaderboardService.getMyLeaderboardPosition(),
    staleTime: 1000 * 60, // 1 minute
    enabled: Boolean(currentUserId),
  });

  // Handle Loading
  if (isLoadingPreview && !previewData) {
    return <LeaderboardPreviewSkeleton />;
  }

  // Handle Error (fails gracefully without breaking the Courses page)
  if (isErrorPreview && !previewData) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-bg-card/60 p-6 text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted">
          <AlertCircle className="w-4 h-4 text-text-muted" />
          <span>Leaderboard temporarily unavailable</span>
        </div>
        <p className="text-xs text-text-muted">
          Rankings could not be refreshed. Check back shortly.
        </p>
        <button
          type="button"
          onClick={() => refetchPreview()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const topPodium = previewData?.topPodium || [];
  const allLearners = previewData?.learners || [];
  const first = topPodium[0];
  const second = topPodium[1];
  const third = topPodium[2];

  // Compact rows for #4 and #5 (excluding top 3)
  const previewRows = allLearners.filter((s) => s.rank > 3).slice(0, 2);

  // Student telemetry
  const userPosition = personalPosition || previewData?.currentStudent;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Zeitnah Leaderboard Preview"
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-bg-card via-bg-surface to-bg-card p-6 sm:p-8 shadow-sm"
    >
      <div className="gradient-line-top" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-yellow/5 blur-[90px]" />
      <div className="pointer-events-none absolute left-1/4 bottom-0 h-48 w-48 rounded-full bg-brand-mint/5 blur-[80px]" />

      <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-6 sm:gap-8">
        {/* ══════════════════════════════════════════════════════════
            COLUMN 1: HEADER & MOTIVATION & CTA
            ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col justify-between w-full lg:w-1/4 shrink-0 space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20 px-2.5 py-1 text-[10px] font-bold text-brand-yellow uppercase tracking-[0.16em]">
              <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
              Leaderboard
            </div>

            <h2 className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight leading-tight">
              Learn. Progress. Rise.
            </h2>

            <p className="text-xs text-text-muted leading-relaxed">
              Track where you stand among top Zeitnah learners. Consistency and lecture completions drive your rank.
            </p>
          </div>

          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-mint/15 to-brand-navy/30 border border-brand-mint/25 text-xs font-bold text-brand-mint hover:bg-brand-mint/25 hover:border-brand-mint/40 transition-all shadow-sm cursor-pointer self-start group"
          >
            <span>View Full Leaderboard</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════════════
            COLUMN 2: TOP 3 PODIUM
            ══════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col justify-end min-w-0">
          {topPodium.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-text-muted">
              <Sparkles className="w-8 h-8 text-text-muted mb-2 opacity-60" />
              <p className="text-xs font-semibold text-white">Leaderboard is getting started.</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Complete lessons to earn XP and take the lead.
              </p>
            </div>
          ) : (
            <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-md mx-auto w-full pt-2">
              {/* #2 Place */}
              {second && (
                <div className="flex-1 flex flex-col items-center max-w-[110px] sm:max-w-[120px]">
                  <Link
                    to={second.username ? `/u/${encodeURIComponent(second.username)}` : "#"}
                    className="group flex flex-col items-center text-center mb-2 cursor-pointer focus:outline-none rounded-xl"
                  >
                    <div className="relative mb-1.5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-slate-300/40 bg-bg-surface flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        {second.avatar ? (
                          <img src={second.avatar} alt={second.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-text-muted" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-bg-base flex items-center justify-center text-[10px] font-bold shadow-sm">
                        <Medal className="w-3 h-3" />
                      </div>
                      {second.isYou && (
                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded bg-brand-yellow px-1 py-0.2 text-[7px] font-black uppercase text-bg-base">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-white truncate max-w-[90px] group-hover:text-brand-mint transition-colors">
                      {second.name}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-slate-300">
                      {(second.points || 0).toLocaleString()} <span className="text-[8px] text-text-muted">XP</span>
                    </p>
                  </Link>
                  <div className="w-full h-20 sm:h-24 rounded-t-xl border-t border-x border-slate-300/30 bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col items-center pt-2 shadow-inner">
                    <span className="text-lg font-black font-mono text-slate-300">#2</span>
                  </div>
                </div>
              )}

              {/* #1 Place (Center, Elevated) */}
              {first && (
                <div className="flex-1 flex flex-col items-center max-w-[120px] sm:max-w-[140px] -mt-3 sm:-mt-5 z-10">
                  <Link
                    to={first.username ? `/u/${encodeURIComponent(first.username)}` : "#"}
                    className="group flex flex-col items-center text-center mb-2 cursor-pointer focus:outline-none rounded-xl"
                  >
                    <div className="relative mb-1.5">
                      <div className="absolute inset-0 rounded-full bg-brand-yellow/15 blur-md group-hover:blur-lg transition-all" />
                      <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden border-2 border-brand-yellow/50 bg-bg-surface flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        {first.avatar ? (
                          <img src={first.avatar} alt={first.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-text-muted" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-yellow text-bg-base flex items-center justify-center text-xs font-black shadow-md">
                        <Crown className="w-3.5 h-3.5" />
                      </div>
                      {first.isYou && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-brand-yellow px-1.5 py-0.2 text-[8px] font-black uppercase text-bg-base shadow-sm">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white truncate max-w-[105px] group-hover:text-brand-mint transition-colors">
                      {first.name}
                    </p>
                    <p className="text-[11px] font-mono font-black text-brand-yellow">
                      {(first.points || 0).toLocaleString()} <span className="text-[8px] text-text-muted">XP</span>
                    </p>
                  </Link>
                  <div className="w-full h-28 sm:h-32 rounded-t-xl border-t border-x border-brand-yellow/40 bg-gradient-to-b from-brand-yellow/10 to-transparent flex flex-col items-center pt-2 shadow-inner">
                    <span className="text-2xl font-black font-mono text-brand-yellow">#1</span>
                  </div>
                </div>
              )}

              {/* #3 Place */}
              {third && (
                <div className="flex-1 flex flex-col items-center max-w-[110px] sm:max-w-[120px]">
                  <Link
                    to={third.username ? `/u/${encodeURIComponent(third.username)}` : "#"}
                    className="group flex flex-col items-center text-center mb-2 cursor-pointer focus:outline-none rounded-xl"
                  >
                    <div className="relative mb-1.5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-amber-600/40 bg-bg-surface flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        {third.avatar ? (
                          <img src={third.avatar} alt={third.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-text-muted" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                        <Medal className="w-3 h-3" />
                      </div>
                      {third.isYou && (
                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded bg-brand-yellow px-1 py-0.2 text-[7px] font-black uppercase text-bg-base">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-white truncate max-w-[90px] group-hover:text-brand-mint transition-colors">
                      {third.name}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-amber-500">
                      {(third.points || 0).toLocaleString()} <span className="text-[8px] text-text-muted">XP</span>
                    </p>
                  </Link>
                  <div className="w-full h-16 sm:h-20 rounded-t-xl border-t border-x border-amber-600/30 bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col items-center pt-2 shadow-inner">
                    <span className="text-lg font-black font-mono text-amber-500">#3</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            COLUMN 3: COMPACT ROWS (#4, #5) & YOUR POSITION CARD
            ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col justify-between w-full lg:w-1/3 shrink-0 space-y-3">
          {/* #4 and #5 compact preview rows */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Next In Rank
              </span>
              <div className="space-y-1.5">
                {previewRows.map((student) => (
                  <Link
                    key={student.id}
                    to={student.username ? `/u/${encodeURIComponent(student.username)}` : "#"}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer group ${
                      student.isYou
                        ? "bg-brand-yellow/[0.05] border-brand-yellow/25 hover:bg-brand-yellow/[0.08]"
                        : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 text-center font-mono font-black text-xs text-text-muted group-hover:text-white">
                        #{student.rank}
                      </span>
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-white/[0.08] bg-bg-surface flex items-center justify-center shrink-0">
                        {student.avatar ? (
                          <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-text-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-white truncate max-w-[120px] group-hover:text-brand-mint transition-colors">
                            {student.name}
                          </p>
                          {student.isYou && (
                            <span className="rounded bg-brand-yellow/15 border border-brand-yellow/30 px-1 py-0.2 text-[8px] font-black uppercase text-brand-yellow">
                              YOU
                            </span>
                          )}
                        </div>
                        {student.username && (
                          <p className="text-[10px] text-text-muted font-mono truncate">
                            @{student.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <span className="text-xs font-bold text-white">
                        {(student.points || 0).toLocaleString()}
                      </span>
                      <span className="text-[9px] text-text-muted ml-0.5">XP</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Current Student's Personal Position Card */}
          {userPosition && (
            <div className="rounded-xl border border-brand-mint/25 bg-gradient-to-r from-brand-mint/[0.06] to-brand-navy/30 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-bg-base/80 border border-brand-mint/30 font-mono font-black text-base text-brand-mint shrink-0 shadow-sm">
                  #{userPosition.rank || "—"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Your Position
                    </span>
                    <span className="rounded bg-brand-yellow px-1 py-0.2 text-[7px] font-black uppercase text-bg-base">
                      YOU
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.name || "Student"}
                  </p>
                  <p className="text-[10px] text-brand-mint font-semibold">
                    Level {userPosition.level || 1} • {userPosition.rankTitle || "Beginner"}
                  </p>
                </div>
              </div>

              <div className="text-right font-mono shrink-0">
                <p className="font-heading font-black text-sm text-white">
                  {(userPosition.points || 0).toLocaleString()}
                </p>
                <p className="text-[9px] font-bold text-brand-mint uppercase tracking-wider">
                  XP
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
