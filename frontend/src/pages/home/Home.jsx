import { useContext } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Compass,
  BookOpen,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Trophy,
  ArrowRight,
  Layers,
  Sparkles,
  Users,
  CheckCircle2,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import BRAND from "../../constants/brand";
import ZeitnahZMotif from "../../components/courses/ZeitnahZMotif";

export default function Home() {
  const { user } = useContext(AuthContext);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen text-white font-body antialiased relative overflow-hidden pb-16">
      {/* ── AMBIENT ATMOSPHERIC BACKGROUND ── */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-brand-mint/5 blur-[140px]" />
        <div className="absolute bottom-1/3 left-10 w-[450px] h-[450px] rounded-full bg-[#12314C]/25 blur-[130px]" />
        <div className="absolute inset-0 bg-tech-grid opacity-25" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24 pt-4 sm:pt-8">
        
        {/* ══════════════════════════════════════════════════════════
            HERO BRAND PRESENTATION (SECTIONS 3, 4 & 5)
            Hierarchy:
            SEE THE UNSEEN
                  ↓
            Build, connect, discover
                  ↓
            Our mission...
            ══════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="brand-hero-heading"
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0D1522] via-[#090E17] to-[#070B14] p-6 sm:p-12 lg:p-16 shadow-2xl"
        >
          {/* Subtle decorative background motif */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -bottom-16 w-80 h-80 sm:w-96 sm:h-96 opacity-10 select-none"
          >
            <ZeitnahZMotif
              variant="gradient"
              animated={!shouldReduceMotion}
              glow={false}
              breathing={true}
              className="w-full h-full rotate-12"
            />
          </div>

          <div className="relative z-10 max-w-4xl space-y-8">
            
            {/* Top Identity Eyebrow */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest text-brand-mint bg-brand-mint/10 border border-brand-mint/25 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-mint animate-pulse" />
                {BRAND.name} Official Platform
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono text-text-muted bg-white/[0.03] border border-white/[0.08]">
                {BRAND.ecosystem.community}
              </span>
            </div>

            {/* 1. Official Primary Tagline (Hierarchy Step 1) */}
            <div className="space-y-3">
              <p className="text-xs sm:text-sm font-mono tracking-[0.24em] uppercase text-brand-mint font-bold">
                {BRAND.name}
              </p>
              <h1
                id="brand-hero-heading"
                className="font-heading font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white leading-[0.92] uppercase"
              >
                {BRAND.tagline}
              </h1>
            </div>

            {/* 2. Official Vision (Hierarchy Step 2) */}
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.1] backdrop-blur-md shadow-sm">
                <span className="text-sm sm:text-xl font-heading font-bold text-white tracking-wide">
                  {BRAND.vision}
                </span>
              </div>
            </div>

            {/* 3. Official Mission (Hierarchy Step 3 - Exact Wording) */}
            <div className="pt-2 max-w-3xl">
              <div className="relative border-l-2 border-brand-mint/60 pl-5 sm:pl-6 py-1">
                <p className="text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-widest text-brand-mint/90 mb-2">
                  Our Mission
                </p>
                <p className="text-base sm:text-lg md:text-xl font-medium text-white/90 leading-relaxed sm:leading-relaxed">
                  "{BRAND.mission}"
                </p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                to="/courses"
                className="zn-btn-primary px-6 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-mint/15"
              >
                <BookOpen className="w-4 h-4" />
                <span>Explore Courses</span>
              </Link>

              <Link
                to="/network"
                className="zn-btn-secondary px-6 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-brand-mint" />
                <span>Join Network</span>
              </Link>

              <Link
                to="/about"
                className="px-4 py-3 text-xs sm:text-sm font-medium text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>Read Full Mission</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-mint" />
              </Link>
            </div>

          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            THE THREE PILLARS (SECTION 3)
            Build • Connect • Discover
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="pillars-heading" className="space-y-8">
          <div className="text-center sm:text-left space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-brand-mint">
              The Ecosystem
            </span>
            <h2
              id="pillars-heading"
              className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight"
            >
              Build. Connect. Discover.
            </h2>
            <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
              Three foundational movements driving individual advancement and community success across the civil landscape.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PILLAR 1: BUILD */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7 flex flex-col justify-between hover:border-brand-mint/30 hover:bg-white/[0.03] transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-brand-mint/10 border border-brand-mint/25 flex items-center justify-center text-brand-mint">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-white tracking-tight">
                    {BRAND.pillars.build.title}
                  </h3>
                  <p className="text-xs text-brand-mint/80 font-mono mt-0.5">
                    {BRAND.pillars.build.tagline}
                  </p>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {BRAND.pillars.build.description}
                </p>

                {/* Focus List */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-semibold">
                    What You Build
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {BRAND.pillars.build.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-white/80 capitalize">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint/70 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  to="/courses"
                  className="text-xs font-semibold text-brand-mint group-hover:underline inline-flex items-center gap-1.5"
                >
                  <span>Explore Learning Modules</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* PILLAR 2: CONNECT */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7 flex flex-col justify-between hover:border-brand-mint/30 hover:bg-white/[0.03] transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#F6ED4A]/10 border border-[#F6ED4A]/25 flex items-center justify-center text-[#F6ED4A]">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-white tracking-tight">
                    {BRAND.pillars.connect.title}
                  </h3>
                  <p className="text-xs text-[#F6ED4A]/80 font-mono mt-0.5">
                    {BRAND.pillars.connect.tagline}
                  </p>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {BRAND.pillars.connect.description}
                </p>

                {/* Focus List */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-semibold">
                    Who You Connect With
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {BRAND.pillars.connect.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-white/80 capitalize">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#F6ED4A]/70 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  to="/network"
                  className="text-xs font-semibold text-[#F6ED4A] group-hover:underline inline-flex items-center gap-1.5"
                >
                  <span>Connect with Peers & Mentors</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* PILLAR 3: DISCOVER */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7 flex flex-col justify-between hover:border-brand-mint/30 hover:bg-white/[0.03] transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-400/10 border border-blue-400/25 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-white tracking-tight">
                    {BRAND.pillars.discover.title}
                  </h3>
                  <p className="text-xs text-blue-400/80 font-mono mt-0.5">
                    {BRAND.pillars.discover.tagline}
                  </p>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {BRAND.pillars.discover.description}
                </p>

                {/* Focus List */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-semibold">
                    What You Discover
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {BRAND.pillars.discover.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-white/80 capitalize">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400/70 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  to="/jobs"
                  className="text-xs font-semibold text-blue-400 group-hover:underline inline-flex items-center gap-1.5"
                >
                  <span>Discover Industry Opportunities</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            MEMBER QUICK ACCESS HUB (Preserving Workstation Access)
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="workspace-hub-heading" className="space-y-6 pt-4 border-t border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2
                id="workspace-hub-heading"
                className="font-heading font-bold text-xl text-white tracking-tight"
              >
                Member Command Center
              </h2>
              <p className="text-xs text-text-muted">
                Quick access to your profile parameters, active sessions, and security telemetry.
              </p>
            </div>
            <div className="text-[11px] font-mono text-text-faint">
              Active Session: <span className="text-emerald-400 font-semibold">{user?.name || "Member"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/profile"
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-brand-mint/30 transition-all flex flex-col justify-between h-36"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm text-white">Profile Identity</span>
                  <ArrowRight className="w-4 h-4 text-brand-mint" />
                </div>
                <p className="text-xs text-text-muted mt-2 line-clamp-2">
                  View and modify your public credentials, engineering bio, and disciplines.
                </p>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-text-faint">
                Identity Center
              </span>
            </Link>

            <Link
              to="/active-sessions"
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-brand-mint/30 transition-all flex flex-col justify-between h-36"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm text-white">Active Sessions</span>
                  <ArrowRight className="w-4 h-4 text-brand-mint" />
                </div>
                <p className="text-xs text-text-muted mt-2 line-clamp-2">
                  Inspect authorized devices, geographic endpoints, and active logins.
                </p>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-text-faint">
                Security Audit
              </span>
            </Link>

            <Link
              to="/career-intelligence"
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-brand-mint/30 transition-all flex flex-col justify-between h-36"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm text-white">Career Intelligence</span>
                  <ArrowRight className="w-4 h-4 text-brand-mint" />
                </div>
                <p className="text-xs text-text-muted mt-2 line-clamp-2">
                  AI-powered skill pathway mapping and industry role alignment.
                </p>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-text-faint">
                Intelligence
              </span>
            </Link>

            <Link
              to="/audit-logs"
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-brand-mint/30 transition-all flex flex-col justify-between h-36"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm text-white">Audit Logs</span>
                  <ArrowRight className="w-4 h-4 text-brand-mint" />
                </div>
                <p className="text-xs text-text-muted mt-2 line-clamp-2">
                  Chronological records of security events and parameter updates.
                </p>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-text-faint">
                Activity Stream
              </span>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}