import { motion, useReducedMotion } from "framer-motion";
import { Users, UserCheck, Clock, ShieldCheck, Sparkles, Compass } from "lucide-react";
import ZeitnahZMotif from "../courses/ZeitnahZMotif";
import NetworkSearch from "./NetworkSearch";

/**
 * NetworkHero Component
 * Cinematic, dark editorial, technical hero section for the Zeitnah Network.
 *
 * Requirements:
 * - Headline: "BUILD YOUR / PROFESSIONAL / CIRCLE." in large Degular typography.
 * - Deep navy/black foundation with subtle technical coordinate grid.
 * - Ambient mint lighting & subtle yellow accent.
 * - Real ZeitnahZMotif component.
 * - Subtle network-node visualization.
 * - Unified search integration.
 * - Real database metrics (no fabricated counts).
 */
export default function NetworkHero({
  searchQuery = "",
  onSearchChange,
  stats = {},
  isSearching = false,
  activeTabLabel = "People",
}) {
  const shouldReduceMotion = useReducedMotion();

  const connectionsCount = stats?.connections ?? stats?.connectionsCount ?? 0;
  const requestsCount = stats?.incomingRequestsCount ?? 0;
  const followersCount = stats?.followers ?? 0;
  const spacesCount = stats?.spacesCount;

  return (
    <section
      aria-labelledby="network-hero-headline"
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07090B] shadow-2xl transition-all duration-300"
    >
      {/* ── 1. Subtle Technical Engineering Grid ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-tech-grid opacity-60"
      />

      {/* ── 2. Ambient Mint Radial Lighting & Corner Vignette ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-mint/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-10 h-96 w-96 rounded-full bg-[#12314C]/40 blur-[130px]"
      />

      {/* Subtle Yellow Coordinate Line Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-12 h-[2px] w-24 bg-gradient-to-r from-transparent via-[#F6ED4A] to-transparent opacity-80"
      />

      {/* ── 3. Subtle Network-Node Vector Visualization ── */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-25 hidden md:block"
        viewBox="0 0 500 350"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="80" y1="90" x2="220" y2="170" stroke="#9FD5B2" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        <line x1="220" y1="170" x2="380" y2="110" stroke="#9FD5B2" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        <line x1="220" y1="170" x2="310" y2="280" stroke="#9FD5B2" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        <line x1="380" y1="110" x2="450" y2="230" stroke="#9FD5B2" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
        <line x1="310" y1="280" x2="450" y2="230" stroke="#9FD5B2" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

        {/* Nodes */}
        <circle cx="80" cy="90" r="4" fill="#9FD5B2" />
        <circle cx="220" cy="170" r="6" fill="#F6ED4A" fillOpacity="0.9" />
        <circle cx="380" cy="110" r="5" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="310" cy="280" r="4" fill="#9FD5B2" fillOpacity="0.7" />
        <circle cx="450" cy="230" r="5" fill="#9FD5B2" />

        {/* Tech Coordinate Text */}
        <text x="235" y="165" fill="#94A3B8" fontSize="8" fontFamily="monospace" letterSpacing="0.1em">
          NODE://ZEITNAH-PEER
        </text>
        <text x="325" y="275" fill="#94A3B8" fontSize="8" fontFamily="monospace" letterSpacing="0.1em">
          BIM/INFRA.01
        </text>
      </svg>

      {/* ── 4. Real Zeitnah Organic Z-Motif (Spatial Background Presence) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -bottom-16 sm:right-6 lg:right-12 w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 opacity-15 sm:opacity-20 transition-transform duration-700"
      >
        <ZeitnahZMotif
          variant="gradient"
          animated={!shouldReduceMotion}
          glow={true}
          breathing={true}
          className="w-full h-full rotate-[-6deg]"
        />
      </div>

      {/* ── 5. Hero Content ── */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12 space-y-6 sm:space-y-8 max-w-4xl">
        {/* Eyebrow & Brand Category Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-white/[0.04] border border-white/[0.1] text-brand-mint backdrop-blur-md"
          >
            <Compass className="w-3 h-3 text-brand-mint" aria-hidden="true" />
            <span>ZEITNAH INFRASTRUCTURE ECOSYSTEM</span>
          </motion.div>

          <span className="hidden sm:inline-block h-3 w-px bg-white/10" aria-hidden="true" />

          <motion.span
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-xs font-mono text-text-muted uppercase tracking-wider"
          >
            Professional Discovery & Network Directory
          </motion.span>
        </div>

        {/* ── Main Degular Black Editorial Headline ── */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-1"
        >
          <h1
            id="network-hero-headline"
            className="font-degular-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white uppercase tracking-tight leading-[0.92] select-none"
          >
            BUILD YOUR
            <br />
            <span className="text-white">PROFESSIONAL</span>
            <br />
            <span className="text-brand-mint drop-shadow-[0_0_24px_rgba(159,213,178,0.2)]">
              CIRCLE.
            </span>
          </h1>

          <p className="pt-2 text-xs sm:text-sm text-text-secondary leading-relaxed max-w-xl font-medium">
            Connect directly with verified infrastructure engineers, BIM modelers, project managers, faculty mentors, and partner employers across civil engineering.
          </p>
        </motion.div>

        {/* ── Unified Search Bar ── */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="max-w-xl pt-1"
        >
          <NetworkSearch
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={`Search ${activeTabLabel.toLowerCase()}, skills, organizations, disciplines...`}
            isLoading={isSearching}
          />
        </motion.div>

        {/* ── Real Telemetry Strip (No Fabricated Metrics) ── */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 border-t border-white/[0.06] text-xs"
        >
          {/* 1. Connections */}
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-brand-mint shrink-0" aria-hidden="true" />
            <span className="font-heading font-extrabold text-white text-sm sm:text-base tabular-nums">
              {Number(connectionsCount).toLocaleString()}
            </span>
            <span className="text-text-muted text-[11px]">
              {connectionsCount === 1 ? "Connection" : "Connections"}
            </span>
          </div>

          <span className="hidden sm:block h-3 w-px bg-white/10" aria-hidden="true" />

          {/* 2. Requests */}
          <div className="flex items-center gap-2">
            <Clock className={`w-3.5 h-3.5 shrink-0 ${requestsCount > 0 ? "text-[#F6ED4A]" : "text-text-muted"}`} aria-hidden="true" />
            <span className="font-heading font-extrabold text-white text-sm sm:text-base tabular-nums">
              {Number(requestsCount).toLocaleString()}
            </span>
            <span className="text-text-muted text-[11px]">
              {requestsCount === 1 ? "Pending Request" : "Pending Requests"}
            </span>
            {requestsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#F6ED4A]/15 text-[#F6ED4A] border border-[#F6ED4A]/30">
                Action Required
              </span>
            )}
          </div>

          {followersCount > 0 && (
            <>
              <span className="hidden sm:block h-3 w-px bg-white/10" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
                <span className="font-heading font-extrabold text-white text-sm sm:text-base tabular-nums">
                  {Number(followersCount).toLocaleString()}
                </span>
                <span className="text-text-muted text-[11px]">Followers</span>
              </div>
            </>
          )}

          {spacesCount !== undefined && spacesCount > 0 && (
            <>
              <span className="hidden sm:block h-3 w-px bg-white/10" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-mint shrink-0" aria-hidden="true" />
                <span className="font-heading font-extrabold text-white text-sm sm:text-base tabular-nums">
                  {Number(spacesCount).toLocaleString()}
                </span>
                <span className="text-text-muted text-[11px]">Learning Spaces</span>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
