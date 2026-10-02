import { motion, useReducedMotion } from "framer-motion";
import {
  Users,
  UserCheck,
  Clock,
  Sparkles,
  Compass,
  Filter,
} from "lucide-react";
import ZeitnahZMotif from "../courses/ZeitnahZMotif";
import NetworkSearch from "./NetworkSearch";

/**
 * NetworkHero Component
 * Premium, sophisticated, modern networking header for the Zeitnah Platform.
 *
 * Requirements Met:
 * - Refined editorial typography ("NETWORK" headline + supportive description).
 * - Compact, non-bloated vertical footprint.
 * - Ambient brand mint lighting and subtle engineering coordinate grid.
 * - Unified command surface search with debouncing and shortcut hint.
 * - Refined live network statistics strip (Connections, Pending, People, Followers).
 * - Real API data metrics (zero fabricated numbers).
 * - Interactive stat modules to filter/jump directly to relevant views.
 */
export default function NetworkHero({
  searchQuery = "",
  onSearchChange,
  stats = {},
  isSearching = false,
  activeTabLabel = "People",
  onStatClick,
  onOpenFilters,
  activeFiltersCount = 0,
  showFilterButton = true,
}) {
  const shouldReduceMotion = useReducedMotion();

  const connectionsCount = stats?.connections ?? stats?.connectionsCount ?? 0;
  const requestsCount = stats?.incomingRequestsCount ?? 0;
  const followersCount = stats?.followers ?? 0;
  const directoryCount = stats?.directoryCount ?? stats?.peopleCount ?? stats?.totalPeople ?? null;

  return (
    <header
      aria-label="Network Overview & Search"
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0C121A] via-[#090D13] to-[#07090B] p-6 sm:p-8 lg:p-9 shadow-2xl transition-all duration-300"
    >
      {/* ── 1. Subtle Engineering Grid Background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-tech-grid opacity-35"
      />

      {/* ── 2. Ambient Mint Radial Glow ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -left-28 h-80 w-80 rounded-full bg-brand-mint/[0.08] blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-[#12314C]/30 blur-[110px]"
      />

      {/* ── 3. Subtle Zeitnah Motif in Background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -bottom-10 w-52 h-52 sm:w-64 sm:h-64 opacity-10 select-none"
      >
        <ZeitnahZMotif
          variant="gradient"
          animated={!shouldReduceMotion}
          glow={false}
          breathing={true}
          className="w-full h-full rotate-[-8deg]"
        />
      </div>

      {/* ── 4. Main Header Content ── */}
      <div className="relative z-10 space-y-6 sm:space-y-7">
        {/* Top Eyebrow & Brand Category Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest text-brand-mint bg-brand-mint/10 border border-brand-mint/20 backdrop-blur-md">
              <Compass className="w-3 h-3 text-brand-mint" aria-hidden="true" />
              <span>ZEITNAH PROFESSIONAL NETWORK</span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium text-text-muted bg-white/[0.03] border border-white/[0.06]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-mint animate-pulse" />
              Live Network
            </span>
          </div>

          <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider hidden md:inline-block">
            Civil • Structural • BIM • MEP
          </span>
        </div>

        {/* Headline & Editorial Identity (Section 11) */}
        <div className="space-y-2 max-w-2xl">
          <motion.h1
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="font-degular-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight uppercase leading-[0.94] select-none"
          >
            NETWORK
          </motion.h1>

          <p className="text-base sm:text-lg font-heading font-bold text-white/95 tracking-tight leading-snug">
            Your professional graph, in one place.
          </p>

          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="text-xs sm:text-sm text-text-secondary leading-relaxed font-normal"
          >
            Build, connect, discover through knowledge, community, and opportunity.
          </motion.p>
        </div>

        {/* ── 5. Search Command Surface & Filter Trigger (Section 12) ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-0.5">
          <div className="flex-1 max-w-2xl">
            <NetworkSearch
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={`Search ${activeTabLabel.toLowerCase()}, roles, organizations, disciplines...`}
              isLoading={isSearching}
              size="default"
            />
          </div>

          {showFilterButton && onOpenFilters && (
            <button
              type="button"
              onClick={onOpenFilters}
              aria-label="Open filter options"
              className={`h-11 sm:h-12 px-4 rounded-2xl border text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 shrink-0 select-none focus-ring ${
                activeFiltersCount > 0
                  ? "bg-brand-mint/15 text-brand-mint border-brand-mint/40 shadow-sm"
                  : "bg-[#070B14] hover:bg-[#0A0F14] text-text-muted hover:text-white border-white/[0.08] hover:border-white/[0.16]"
              }`}
            >
              <Filter className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-brand-mint text-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── 6. Editorial Telemetry Statistics Strip (Section 16) ── */}
        <div
          role="region"
          aria-label="Network Telemetry"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-4 border-t border-white/[0.06]"
        >
          {/* Telemetry 1: Connections */}
          <button
            type="button"
            onClick={() => onStatClick?.("connections")}
            className="text-left group cursor-pointer focus-ring rounded-xl p-1 -m-1 transition-opacity hover:opacity-90"
          >
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight tabular-nums group-hover:text-brand-mint transition-colors">
              {Number(connectionsCount).toLocaleString()}
            </p>
            <p className="text-xs text-text-muted font-medium mt-0.5 group-hover:text-white/80 transition-colors">
              Connections
            </p>
          </button>

          {/* Telemetry 2: Pending Requests */}
          <button
            type="button"
            onClick={() => onStatClick?.("requests")}
            className="text-left group cursor-pointer focus-ring rounded-xl p-1 -m-1 transition-opacity hover:opacity-90"
          >
            <div className="flex items-baseline gap-2">
              <p
                className={`text-2xl sm:text-3xl font-heading font-extrabold tracking-tight tabular-nums ${
                  requestsCount > 0 ? "text-amber-300" : "text-white"
                } group-hover:text-amber-200 transition-colors`}
              >
                {requestsCount < 10 && requestsCount > 0 ? `0${requestsCount}` : Number(requestsCount).toLocaleString()}
              </p>
              {requestsCount > 0 && (
                <span className="text-[10px] font-mono font-bold text-amber-300/90 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded-md">
                  Action
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted font-medium mt-0.5 group-hover:text-white/80 transition-colors">
              Pending
            </p>
          </button>

          {/* Telemetry 3: Directory */}
          <button
            type="button"
            onClick={() => onStatClick?.("people")}
            className="text-left group cursor-pointer focus-ring rounded-xl p-1 -m-1 transition-opacity hover:opacity-90"
          >
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight tabular-nums group-hover:text-brand-mint transition-colors">
              {directoryCount !== null ? Number(directoryCount).toLocaleString() : "—"}
            </p>
            <p className="text-xs text-text-muted font-medium mt-0.5 group-hover:text-white/80 transition-colors">
              Directory
            </p>
          </button>

          {/* Telemetry 4: Followers */}
          <button
            type="button"
            onClick={() => onStatClick?.("followers")}
            className="text-left group cursor-pointer focus-ring rounded-xl p-1 -m-1 transition-opacity hover:opacity-90"
          >
            <p className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight tabular-nums group-hover:text-brand-mint transition-colors">
              {Number(followersCount).toLocaleString()}
            </p>
            <p className="text-xs text-text-muted font-medium mt-0.5 group-hover:text-white/80 transition-colors">
              Followers
            </p>
          </button>
        </div>
      </div>
    </header>
  );
}
