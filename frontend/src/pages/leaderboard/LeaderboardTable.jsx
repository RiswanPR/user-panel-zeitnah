import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Star,
  Award,
  Flame,
  CheckCircle2,
  Navigation,
  X,
} from "lucide-react";

export default function LeaderboardTable({
  learners = [],
  totalLearners = 0,
  page = 1,
  totalPages = 1,
  onPageChange,
  searchQuery = "",
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  rankFilter,
  onRankFilterChange,
  isCourseMode = false,
  isLoading = false,
  currentUserId,
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const myRowRef = useRef(null);

  // Sync internal search input with external prop
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, onSearchChange]);

  const handleClearSearch = () => {
    setLocalSearch("");
    onSearchChange("");
  };

  const handleJumpToMe = () => {
    if (myRowRef.current) {
      myRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      myRowRef.current.classList.add("ring-2", "ring-brand-yellow");
      setTimeout(() => {
        myRowRef.current?.classList.remove("ring-2", "ring-brand-yellow");
      }, 2000);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const xpColumnHeader = isCourseMode ? "Course XP" : "Global XP";

  return (
    <div className="space-y-4">
      {/* ── Search and Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-bg-card border border-border-default shadow-sm">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search learners by name or handle..."
            aria-label="Search learners"
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-brand-mint/40 focus:ring-1 focus:ring-brand-mint/30 transition-all"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-0.5 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Level Filter */}
          <div className="relative shrink-0">
            <select
              value={levelFilter || ""}
              onChange={(e) =>
                onLevelFilterChange(e.target.value ? Number(e.target.value) : undefined)
              }
              aria-label="Filter by level"
              className="appearance-none rounded-xl bg-white/[0.03] border border-white/[0.08] px-3.5 py-2 pr-8 text-xs font-semibold text-text-secondary focus:outline-none focus:border-brand-mint/40 focus:text-white cursor-pointer transition-all"
            >
              <option value="" className="bg-bg-surface text-white">All Levels</option>
              {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                <option key={lvl} value={lvl} className="bg-bg-surface text-white">
                  Level {lvl}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Jump to Me Button */}
          <button
            type="button"
            onClick={handleJumpToMe}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-yellow/8 border border-brand-yellow/20 text-xs font-bold text-brand-yellow hover:bg-brand-yellow/15 transition-colors cursor-pointer shrink-0"
            title="Locate your position on the page"
          >
            <Navigation className="w-3 h-3" />
            <span>My Position</span>
          </button>
        </div>
      </div>

      {/* ── Table View for Desktop (>= 768px) ── */}
      <div className="hidden md:block rounded-2xl bg-bg-card border border-border-default overflow-hidden shadow-sm relative">
        <div className="gradient-line-top" />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" role="table">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01] text-[11px] font-bold uppercase tracking-wider text-text-muted">
                <th scope="col" className="py-3.5 pl-6 pr-3 w-16 text-center">Rank</th>
                <th scope="col" className="py-3.5 px-4">Learner</th>
                <th scope="col" className="py-3.5 px-4 text-center">Level</th>
                <th scope="col" className="py-3.5 px-4">Tier</th>
                <th scope="col" className="py-3.5 px-4 text-right font-mono">{xpColumnHeader}</th>
                <th scope="col" className="py-3.5 px-4 text-center">Classes Done</th>
                <th scope="col" className="py-3.5 pr-6 pl-4 text-right">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {learners.length > 0 ? (
                learners.map((student) => {
                  const isYou = student.isYou;
                  const profileUrl = student.username
                    ? `/u/${encodeURIComponent(student.username)}`
                    : "#";
                  const xp = isCourseMode ? student.courseXp || 0 : student.points || 0;

                  return (
                    <tr
                      key={student.id || student.username}
                      ref={isYou ? myRowRef : null}
                      className={`group transition-colors duration-150 ${
                        isYou
                          ? "bg-brand-yellow/[0.04] hover:bg-brand-yellow/[0.07]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Rank Number */}
                      <td className="py-4 pl-6 pr-3 text-center">
                        <span
                          className={`font-heading font-black text-sm font-mono ${
                            student.rank === 1
                              ? "text-brand-yellow"
                              : student.rank === 2
                              ? "text-slate-300"
                              : student.rank === 3
                              ? "text-amber-500"
                              : isYou
                              ? "text-brand-mint font-extrabold"
                              : "text-text-muted"
                          }`}
                        >
                          #{student.rank}
                        </span>
                      </td>

                      {/* Learner Identity */}
                      <td className="py-4 px-4">
                        <Link
                          to={profileUrl}
                          className="flex items-center gap-3 group-hover:text-brand-mint transition-colors cursor-pointer"
                        >
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/[0.08] bg-bg-surface flex items-center justify-center shrink-0">
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-text-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-white truncate max-w-[180px] group-hover:text-brand-mint transition-colors">
                                {student.name}
                              </span>
                              {isYou && (
                                <span className="rounded-md bg-brand-yellow/15 border border-brand-yellow/30 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-brand-yellow">
                                  YOU
                                </span>
                              )}
                            </div>
                            {student.username && (
                              <span className="text-[11px] text-text-muted font-mono block truncate">
                                @{student.username}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Level */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-md border border-brand-mint/20 bg-brand-mint/8 px-2 py-0.5 text-xs font-bold text-brand-mint font-mono">
                          <Star className="w-3 h-3 text-brand-yellow" />
                          L{student.level || 1}
                        </span>
                      </td>

                      {/* Rank Title */}
                      <td className="py-4 px-4">
                        <span className="text-xs font-medium text-text-secondary truncate block max-w-[120px]">
                          {student.rankTitle || "Beginner"}
                        </span>
                      </td>

                      {/* XP */}
                      <td className="py-4 px-4 text-right font-mono">
                        <span className="font-heading font-black text-sm text-white">
                          {xp.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-text-muted ml-1">XP</span>
                      </td>

                      {/* Completed Classes */}
                      <td className="py-4 px-4 text-center font-mono text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint/70" />
                          {student.completedClasses || 0}
                        </span>
                      </td>

                      {/* Streak / Activity */}
                      <td className="py-4 pr-6 pl-4 text-right font-mono text-xs text-text-muted">
                        {student.streak > 0 ? (
                          <span className="inline-flex items-center gap-1 text-brand-yellow">
                            <Flame className="w-3.5 h-3.5 fill-brand-yellow" />
                            {student.streak}d
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    <p className="text-sm font-semibold text-white mb-1">No Learners Found</p>
                    <p className="text-xs max-w-sm mx-auto">
                      {searchQuery
                        ? `No learners matching "${searchQuery}". Try adjusting your search or filters.`
                        : "No leaderboard entries available for this view."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Card View (< 768px) ── */}
      <div className="block md:hidden space-y-2.5">
        {learners.length > 0 ? (
          learners.map((student) => {
            const isYou = student.isYou;
            const profileUrl = student.username
              ? `/u/${encodeURIComponent(student.username)}`
              : "#";
            const xp = isCourseMode ? student.courseXp || 0 : student.points || 0;

            return (
              <div
                key={student.id || student.username}
                ref={isYou ? myRowRef : null}
                className={`rounded-2xl border p-4 transition-all ${
                  isYou
                    ? "bg-brand-yellow/[0.04] border-brand-yellow/25 shadow-sm"
                    : "bg-bg-card border-border-default"
                }`}
              >
                {/* Header: Rank + YOU + XP */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-heading font-black text-base font-mono ${
                        student.rank === 1
                          ? "text-brand-yellow"
                          : student.rank === 2
                          ? "text-slate-300"
                          : student.rank === 3
                          ? "text-amber-500"
                          : isYou
                          ? "text-brand-mint font-extrabold"
                          : "text-text-muted"
                      }`}
                    >
                      #{student.rank}
                    </span>
                    {isYou && (
                      <span className="rounded-md bg-brand-yellow/15 border border-brand-yellow/30 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-brand-yellow">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="text-right font-mono">
                    <span className="font-heading font-black text-sm text-white">
                      {xp.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-text-muted ml-1">XP</span>
                  </div>
                </div>

                {/* Identity: Avatar + Name + Handle */}
                <Link
                  to={profileUrl}
                  className="flex items-center gap-3 mb-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/[0.08] bg-bg-surface flex items-center justify-center shrink-0">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-text-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white truncate group-hover:text-brand-mint transition-colors">
                      {student.name}
                    </p>
                    {student.username && (
                      <p className="text-xs text-text-muted font-mono truncate">
                        @{student.username}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Bottom Metadata: Level + Rank + Classes Done */}
                <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.04] text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-brand-mint font-mono text-[11px]">
                      <Star className="w-3 h-3 text-brand-yellow" />
                      L{student.level || 1}
                    </span>
                    <span>•</span>
                    <span className="text-text-secondary text-[11px] truncate max-w-[110px]">
                      {student.rankTitle || "Beginner"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span>{student.completedClasses || 0} classes</span>
                    {student.streak > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-brand-yellow">
                        <Flame className="w-3 h-3 fill-brand-yellow" />
                        {student.streak}d
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-border-default bg-bg-card p-8 text-center text-text-muted">
            <p className="text-sm font-semibold text-white mb-1">No Learners Found</p>
            <p className="text-xs">
              {searchQuery
                ? `No learners matching "${searchQuery}".`
                : "No leaderboard data available."}
            </p>
          </div>
        )}
      </div>

      {/* ── Server-Side Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-bg-card border border-border-default shadow-sm">
          <p className="text-xs text-text-muted font-medium">
            Showing Page <span className="text-white font-bold">{page}</span> of{" "}
            <span className="text-white font-bold">{totalPages}</span> ({totalLearners.toLocaleString()} learners)
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-text-muted hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Current Page Indicator */}
            <span className="px-3 py-1 rounded-xl bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-bold font-mono">
              {page}
            </span>

            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-text-muted hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
