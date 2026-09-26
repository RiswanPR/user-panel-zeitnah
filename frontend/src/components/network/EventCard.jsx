import React from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, Users, ArrowUpRight, Video } from 'lucide-react';
import { getUploadUrl } from '../../utils/courseUi';

/**
 * Zeitnah 2.0 Event Card (Phase 9 Visual Foundation)
 * Conference, webinar, and technical symposium card representation.
 */
export default function EventCard({
  event,
  onRsvp,
  onViewDetails,
  className = '',
}) {
  if (!event) return null;

  const {
    title,
    eventType = 'WEBINAR', // 'CONFERENCE' | 'WEBINAR' | 'WORKSHOP' | 'SITE_VISIT'
    date,
    time,
    location,
    isVirtual = true,
    host = {},
    attendeeCount = 0,
    coverImage,
    isAttending = false,
  } = event;

  const coverUrl = coverImage ? getUploadUrl(coverImage) : null;

  return (
    <div
      className={`zn-card zn-card-interactive overflow-hidden flex flex-col group ${className}`}
      onClick={onViewDetails}
    >
      {/* Event Cover Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0F1728]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#12314C]/40 via-[#0B111E] to-[#070B14] flex items-center justify-center">
            <Calendar className="w-10 h-10 text-brand-mint/40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B111E] via-transparent to-transparent pointer-events-none" />

        {/* Event Type Badge */}
        <div className="absolute top-3 left-3">
          <span className="zn-badge zn-badge-mint text-[10px] font-mono tracking-wider uppercase backdrop-blur-md">
            {eventType}
          </span>
        </div>

        {/* Virtual / Onsite Tag */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 backdrop-blur-md border border-white/10 text-white/90 flex items-center gap-1">
            {isVirtual ? <Video className="w-3 h-3 text-cyan-400" /> : <MapPin className="w-3 h-3 text-brand-yellow" />}
            <span>{isVirtual ? 'Virtual Stream' : 'On-Site'}</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Date & Time */}
          <div className="flex items-center gap-3 text-xs text-brand-mint font-medium font-mono">
            {date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{date}</span>
              </span>
            )}
            {time && (
              <span className="flex items-center gap-1 text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>{time}</span>
              </span>
            )}
          </div>

          <h3 className="text-base font-heading font-bold text-white group-hover:text-brand-mint transition-colors line-clamp-2">
            {title}
          </h3>

          {/* Location details */}
          {location && (
            <p className="text-xs text-text-muted flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-text-faint shrink-0" />
              <span>{location}</span>
            </p>
          )}
        </div>

        {/* Host Info & Footer CTA */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-brand-mint text-[11px] font-bold shrink-0">
              {host.name ? host.name[0].toUpperCase() : 'Z'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-white/90 truncate">{host.name || 'Zeitnah Host'}</p>
                {host.isVerified && <CheckCircle2 className="w-3 h-3 text-brand-mint shrink-0" />}
              </div>
              <p className="text-[10px] text-text-faint truncate">{host.organization || 'Ecosystem'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRsvp?.(event);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] touch-manipulation cursor-pointer ${
              isAttending
                ? 'bg-white/10 text-brand-mint border border-brand-mint/30'
                : 'zn-btn-primary py-1 px-3 text-[11px]'
            }`}
          >
            {isAttending ? 'RSVP Confirmed' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
