import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Layers,
  Trophy,
  Compass,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import PremiumCard from '../../ui/PremiumCard';
import Badge from '../../ui/Badge';

/**
 * CommunityContextSidebar — Phase 2A Desktop Supporting Area
 * 
 * Provides authentic community context, guidelines, and direct shortcuts
 * to verified platform resources. Strictly uses real routes and actual features.
 * Visible on desktop viewports (>=1024px / 1280px).
 */
export default function CommunityContextSidebar() {
  return (
    <aside className="space-y-5 sticky top-20" aria-label="Community Information & Guidelines">
      {/* 1. About Community Focus Card */}
      <PremiumCard variant="surface" accentLine={true} padding="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold tracking-widest text-text-faint uppercase">
            Platform Focus
          </span>
          <Badge variant="mint" size="sm">
            Civil & Infrastructure
          </Badge>
        </div>
        <h3 className="text-sm font-bold font-heading text-white mb-2 leading-snug">
          Civil Engineering Knowledge Exchange
        </h3>
        <p className="text-xs text-text-muted leading-relaxed mb-4">
          A dedicated space for engineers, students, and educators to share field updates, BIM workflows, structural inquiries, and project milestones.
        </p>

        <div className="pt-3 border-t border-white/[0.06] space-y-2">
          <div className="flex items-start gap-2 text-[11px] text-text-secondary">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint shrink-0 mt-0.5" />
            <span>Verified engineering identity & peer review</span>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-text-secondary">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint shrink-0 mt-0.5" />
            <span>Direct cohort and cross-disciplinary discussions</span>
          </div>
        </div>
      </PremiumCard>

      {/* 2. Community Guidelines Card */}
      <PremiumCard variant="panel" padding="p-4 sm:p-5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-brand-mint" />
          <span>Discussion Standards</span>
        </h4>
        <ul className="space-y-2.5 text-xs text-text-secondary leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-mint mt-1.5 shrink-0" />
            <span>Provide context, calculations, or visual evidence with technical questions.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-mint mt-1.5 shrink-0" />
            <span>Tag relevant disciplines (#BIM, #Structures, #Geotechnical, #ProjectManagement).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-mint mt-1.5 shrink-0" />
            <span>Maintain constructive, evidence-based, and respectful professional discourse.</span>
          </li>
        </ul>
      </PremiumCard>

      {/* 3. Quick Platform Navigation Shortcuts */}
      <PremiumCard variant="surface" padding="p-4 sm:p-5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          Verified Resources
        </h4>
        <div className="space-y-1">
          <Link
            to="/profile/portfolio"
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text-muted group-hover:text-brand-mint group-hover:border-brand-mint/30 transition-colors">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-white group-hover:text-brand-mint transition-colors truncate">
                  Engineering Portfolio
                </p>
                <p className="text-[10px] text-text-faint truncate">Showcase verified models & projects</p>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-text-faint group-hover:text-white transition-colors shrink-0 ml-2" />
          </Link>

          <Link
            to="/profile/verification"
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text-muted group-hover:text-brand-mint group-hover:border-brand-mint/30 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-white group-hover:text-brand-mint transition-colors truncate">
                  Verification Center
                </p>
                <p className="text-[10px] text-text-faint truncate">Degrees, credentials & trust badges</p>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-text-faint group-hover:text-white transition-colors shrink-0 ml-2" />
          </Link>

          <Link
            to="/leaderboard"
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text-muted group-hover:text-brand-yellow group-hover:border-brand-yellow/30 transition-colors">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-white group-hover:text-brand-yellow transition-colors truncate">
                  Global Leaderboard
                </p>
                <p className="text-[10px] text-text-faint truncate">Academic & platform rankings</p>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-text-faint group-hover:text-white transition-colors shrink-0 ml-2" />
          </Link>
        </div>
      </PremiumCard>

      {/* 4. Editorial Footer Note */}
      <div className="px-3 text-[11px] text-text-faint leading-relaxed">
        <p>
          Zeitnah Community is moderated in accordance with engineering ethics and academic integrity policies.
        </p>
      </div>
    </aside>
  );
}
