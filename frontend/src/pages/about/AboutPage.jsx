import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Compass,
  BookOpen,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Globe2,
  Users2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  Award,
} from "lucide-react";
import BRAND from "../../constants/brand";
import ZeitnahZMotif from "../../components/courses/ZeitnahZMotif";
import Footer from "../../components/navigation/Footer";

export default function AboutPage() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen text-white font-body antialiased relative overflow-hidden flex flex-col justify-between">
      {/* ── BACKGROUND AMBIENT GLOWS ── */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <div className="absolute top-12 left-1/3 w-[600px] h-[600px] rounded-full bg-brand-mint/5 blur-[160px]" />
        <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] rounded-full bg-[#12314C]/30 blur-[140px]" />
        <div className="absolute inset-0 bg-tech-grid opacity-20" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 pt-4 pb-16">
        {/* Top Floating Navigation */}
        <header className="flex items-center justify-between py-4 border-b border-white/[0.08]">
          <Link to="/" className="flex items-center gap-3 group focus-ring rounded-lg">
            <div className="w-8 h-8 rounded-lg border border-white/[0.12] bg-[#0E1726]/80 flex items-center justify-center overflow-hidden">
              <img src="/zeitnah-logo.png" alt="Zeitnah" className="w-full h-full object-cover" width={32} height={32} />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-sm font-bold tracking-[0.14em] text-white leading-none uppercase">
                {BRAND.name}
              </span>
              <span className="text-[8px] font-mono tracking-[0.16em] text-brand-mint font-semibold uppercase leading-none mt-1">
                {BRAND.tagline}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/courses" className="text-xs font-medium text-text-secondary hover:text-white transition-colors">
              Courses
            </Link>
            <Link to="/network" className="text-xs font-medium text-text-secondary hover:text-white transition-colors">
              Network
            </Link>
            <Link to="/login" className="zn-btn-primary text-xs px-3.5 py-1.5 min-h-[32px]">
              Sign In
            </Link>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════
            01. BRAND IDENTITY & HIERARCHY
            SEE THE UNSEEN
                  ↓
            Build, connect, discover
                  ↓
            Our mission...
            ══════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="about-brand-heading"
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0D1522] via-[#090E17] to-[#070B14] p-6 sm:p-12 lg:p-16 shadow-2xl text-center sm:text-left"
        >
          {/* Decorative Zeitnah Z in background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -bottom-20 w-96 h-96 opacity-10 select-none hidden sm:block"
          >
            <ZeitnahZMotif
              variant="gradient"
              animated={!shouldReduceMotion}
              glow={false}
              breathing={true}
              className="w-full h-full rotate-6"
            />
          </div>

          <div className="relative z-10 max-w-3xl space-y-8 mx-auto sm:mx-0">
            
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest text-brand-mint bg-brand-mint/10 border border-brand-mint/25 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-brand-mint" />
              <span>Official Brand Positioning</span>
            </div>

            {/* STEP 1: OFFICIAL PRIMARY TAGLINE */}
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-mono tracking-[0.26em] uppercase text-text-muted font-bold">
                {BRAND.name}
              </p>
              <h1
                id="about-brand-heading"
                className="font-heading font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white leading-[0.92] uppercase"
              >
                {BRAND.tagline}
              </h1>
            </div>

            {/* STEP 2: OFFICIAL VISION */}
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.1] backdrop-blur-md">
                <span className="text-base sm:text-2xl font-heading font-bold text-brand-mint tracking-wide">
                  {BRAND.vision}
                </span>
              </div>
            </div>

            {/* STEP 3: OFFICIAL MISSION (Exact Wording Preserved) */}
            <div className="pt-2">
              <div className="relative border-l-2 border-brand-mint/70 pl-5 sm:pl-6 py-1 text-left">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-brand-mint/90 block mb-2">
                  Our Mission
                </span>
                <p className="text-lg sm:text-2xl font-medium text-white/95 leading-relaxed sm:leading-relaxed">
                  "{BRAND.mission}"
                </p>
              </div>
            </div>

          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            02. THREE FOUNDATIONAL PILLARS
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="about-pillars-heading" className="space-y-8">
          <div className="text-center sm:text-left space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-brand-mint">
              Strategic Foundation
            </span>
            <h2
              id="about-pillars-heading"
              className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight"
            >
              The Three Pillars
            </h2>
            <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
              How the Zeitnah platform translates vision into tangible individual and community achievement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* BUILD */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 space-y-5 hover:border-brand-mint/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-mint/10 border border-brand-mint/25 flex items-center justify-center text-brand-mint">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-2xl text-white">
                  {BRAND.pillars.build.title}
                </h3>
                <p className="text-xs text-brand-mint font-mono font-semibold">
                  {BRAND.pillars.build.tagline}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                {BRAND.pillars.build.description}
              </p>

              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-semibold">
                  What we build
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BRAND.pillars.build.items.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 font-medium capitalize"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* CONNECT */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 space-y-5 hover:border-[#F6ED4A]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#F6ED4A]/10 border border-[#F6ED4A]/25 flex items-center justify-center text-[#F6ED4A]">
                <Users2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-2xl text-white">
                  {BRAND.pillars.connect.title}
                </h3>
                <p className="text-xs text-[#F6ED4A] font-mono font-semibold">
                  {BRAND.pillars.connect.tagline}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                {BRAND.pillars.connect.description}
              </p>

              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-semibold">
                  Who we connect
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BRAND.pillars.connect.items.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 font-medium capitalize"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* DISCOVER */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 space-y-5 hover:border-blue-400/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-400/10 border border-blue-400/25 flex items-center justify-center text-blue-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-2xl text-white">
                  {BRAND.pillars.discover.title}
                </h3>
                <p className="text-xs text-blue-400 font-mono font-semibold">
                  {BRAND.pillars.discover.tagline}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                {BRAND.pillars.discover.description}
              </p>

              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-semibold">
                  What we discover
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BRAND.pillars.discover.items.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 font-medium capitalize"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            03. FOUR PILLARS OF OUTCOMES
            Progress • Network • Opportunities • Success
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="outcomes-heading" className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-8 sm:p-12 space-y-8">
          <div className="max-w-2xl space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-brand-mint">
              Member Value
            </span>
            <h2
              id="outcomes-heading"
              className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight"
            >
              Progress Through the Freedom of Knowledge
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              When knowledge is liberated and accessible, community members achieve four self-reinforcing outcomes:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Progress",
                desc: "Continuous technical growth and mastery through rigorous curriculum.",
                icon: TrendingUp,
                accent: "text-brand-mint",
              },
              {
                title: "Network",
                desc: "High-signal professional connections across disciplines and global borders.",
                icon: Globe2,
                accent: "text-[#F6ED4A]",
              },
              {
                title: "Opportunities",
                desc: "Direct access to verified infrastructure roles, consultancies, and projects.",
                icon: Briefcase,
                accent: "text-blue-400",
              },
              {
                title: "Success",
                desc: "Enduring career elevation and verified portfolio credibility.",
                icon: Award,
                accent: "text-emerald-400",
              },
            ].map((outcome) => {
              const Icon = outcome.icon;
              return (
                <div
                  key={outcome.title}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3"
                >
                  <Icon className={`w-5 h-5 ${outcome.accent}`} />
                  <h3 className="font-heading font-bold text-base text-white">
                    {outcome.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {outcome.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════
            04. CALL TO ACTION STRIP
            ══════════════════════════════════════════════════════════ */}
        <section aria-labelledby="cta-heading" className="rounded-3xl border border-brand-mint/20 bg-gradient-to-r from-brand-mint/10 via-brand-mint/5 to-transparent p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 id="cta-heading" className="font-heading font-bold text-2xl text-white">
              Experience the Zeitnah Movement
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Join thousands of engineers, architects, educators, and infrastructure organizations shaping the future.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/courses"
              className="zn-btn-primary px-6 py-3 text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <span>Explore Courses</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/network"
              className="zn-btn-secondary px-6 py-3 text-xs sm:text-sm font-semibold"
            >
              <span>Join Network</span>
            </Link>
          </div>
        </section>

      </div>

      {/* ── Page Footer ── */}
      <Footer />
    </div>
  );
}
