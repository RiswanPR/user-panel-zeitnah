import { Link } from "react-router-dom";
import { Sparkles, Compass, BookOpen, Briefcase, Trophy, TrendingUp, ShieldCheck } from "lucide-react";
import BRAND from "../../constants/brand";

export default function Footer({ className = "" }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      aria-label="Platform Footer"
      className={`hidden md:block border-t border-white/[0.08] bg-[#070B14]/90 backdrop-blur-xl text-white select-none relative z-10 transition-colors ${className}`}
    >
      {/* Subtle top ambient glow */}
      <div
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/20 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Brand Column (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <Link
              to="/courses"
              className="inline-flex items-center gap-3 group focus-ring rounded-lg py-0.5"
              aria-label={`${BRAND.name} home`}
            >
              <div className="w-8 h-8 rounded-lg border border-white/[0.12] bg-[#0E1726]/80 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-brand-mint/40 transition-colors">
                <img
                  src="/zeitnah-logo.png"
                  alt={`${BRAND.name} Logo`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  width={32}
                  height={32}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-base font-bold tracking-[0.14em] text-white group-hover:text-brand-mint transition-colors leading-none uppercase">
                  {BRAND.name}
                </span>
                <span className="text-[9px] font-mono tracking-[0.2em] text-brand-mint font-semibold uppercase leading-none mt-1">
                  {BRAND.tagline}
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-sm">
              A global civil community where members build skills, connect with industry leaders, and discover transformative opportunities through the freedom of knowledge.
            </p>

            {/* Vision Pill Strip */}
            <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-text-faint uppercase tracking-wider">
              <span className="text-white/80 font-semibold">{BRAND.pillars.build.title}</span>
              <span className="text-brand-mint">•</span>
              <span className="text-white/80 font-semibold">{BRAND.pillars.connect.title}</span>
              <span className="text-brand-mint">•</span>
              <span className="text-white/80 font-semibold">{BRAND.pillars.discover.title}</span>
            </div>
          </div>

          {/* Navigation Column 1: Platform (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-secondary">
              Platform
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/courses"
                  className="text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-text-faint" />
                  <span>Courses</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/network"
                  className="text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-text-faint" />
                  <span>Network</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/jobs"
                  className="text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5 text-text-faint" />
                  <span>Opportunities</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/career-intelligence"
                  className="text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-text-faint" />
                  <span>Career Intelligence</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 2: Community (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-secondary">
              Community
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/leaderboard"
                  className="text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-text-faint" />
                  <span>Leaderboard</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/businesses"
                  className="text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-text-faint" />
                  <span>Organizations</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/profile/verification"
                  className="text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-text-faint" />
                  <span>Verification Center</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-text-muted hover:text-white transition-colors"
                >
                  About & Mission
                </Link>
              </li>
            </ul>
          </div>

          {/* Mission Capsule Column (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-secondary">
              Our Vision
            </p>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2">
              <span className="font-heading font-bold text-xs text-white block">
                {BRAND.vision}
              </span>
              <p className="text-[11px] text-text-muted leading-relaxed line-clamp-3">
                {BRAND.mission}
              </p>
              <Link
                to="/about"
                className="text-[11px] text-brand-mint hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Read our mission</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & System Status */}
        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>
            &copy; {currentYear} {BRAND.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Network Operational
            </span>
            <span className="text-white/20">•</span>
            <Link to="/about" className="hover:text-white transition-colors">
              Brand Positioning
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
