import React from 'react';
import { Users, MessageSquare, CheckCircle2, ArrowRight } from 'lucide-react';
import { getUploadUrl } from '../../utils/courseUi';

/**
 * Zeitnah 2.0 Community Card (Phase 9 Visual Foundation)
 * Technical cohort & infrastructure community card representation.
 */
export default function CommunityCard({
  community,
  onJoin,
  onView,
  className = '',
}) {
  if (!community) return null;

  const {
    name,
    description,
    discipline,
    sector,
    memberCount = 0,
    activeDiscussions = 0,
    coverImage,
    logo,
    isJoined = false,
  } = community;

  const coverUrl = coverImage ? getUploadUrl(coverImage) : null;
  const logoUrl = logo ? getUploadUrl(logo) : null;

  return (
    <div
      className={`zn-card zn-card-interactive overflow-hidden flex flex-col group ${className}`}
      onClick={onView}
    >
      {/* Banner */}
      <div className="relative h-28 w-full overflow-hidden bg-[#0F1728]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#12314C]/50 via-[#0B111E] to-[#0F1728]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B111E] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Body with overlapping logo */}
      <div className="px-5 pb-5 pt-0 flex-1 flex flex-col justify-between -mt-8 relative z-10 space-y-4">
        <div className="space-y-3">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl bg-[#0B111E] border-2 border-white/[0.1] shadow-xl overflow-hidden flex items-center justify-center text-brand-mint shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <Users className="w-6 h-6" />
            )}
          </div>

          <div>
            <h3 className="text-base font-heading font-bold text-white group-hover:text-brand-mint transition-colors line-clamp-1">
              {name}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-text-muted line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Discipline / Sector Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {discipline && (
              <span className="zn-badge zn-badge-navy text-[10px]">
                {discipline}
              </span>
            )}
            {sector && (
              <span className="zn-badge zn-badge-mint text-[10px]">
                {sector}
              </span>
            )}
          </div>
        </div>

        {/* Footer Metrics & Action */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-text-muted font-mono">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-text-faint" />
              <span>{memberCount.toLocaleString()}</span>
            </span>
            {activeDiscussions > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-text-faint" />
                <span>{activeDiscussions} active</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onJoin?.(community);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] touch-manipulation cursor-pointer ${
              isJoined
                ? 'bg-white/10 text-brand-mint border border-brand-mint/30'
                : 'zn-btn-secondary text-xs py-1 px-3'
            }`}
          >
            {isJoined ? 'Joined' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}
