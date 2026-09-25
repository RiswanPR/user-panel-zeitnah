import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ExternalLink,
  ShieldCheck,
  MapPin,
  Briefcase,
  Layers,
  Sparkles,
  MessageSquare,
  Users,
  Compass,
} from 'lucide-react';
import { getUploadUrl } from '../../utils/courseUi';
import RelationshipAction from './RelationshipAction';
import EcosystemRoleBadge from './EcosystemRoleBadge';

function getInitials(name) {
  if (!name) return 'Z';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * InfrastructurePeopleCard Component
 * Premium infrastructure-focused discovery card displaying canonical taxonomy fields,
 * mutual connections, deterministic recommendation signals, relationship state,
 * and direct messaging / message request triggers.
 */
export default function InfrastructurePeopleCard({
  person,
  onPreview,
  onMessageRequest,
  onViewMutual,
}) {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);

  const avatarSrc = person?.avatarUrl && !avatarError ? getUploadUrl(person.avatarUrl) : null;
  const initials = getInitials(person?.name);

  // Experience formatting
  const expYears = Number(person?.yearsOfExperience) || 0;
  const expLabel = expYears > 0 ? `${expYears} yr${expYears > 1 ? 's' : ''}` : 'Entry level';
  const connCount = person?.connectionsCount ?? person?.connections?.length ?? 0;
  const mutualCount = person?.mutualConnectionsCount ?? 0;

  // Taxonomy tags (Software + Skills up to 3-4 items)
  const softwareSkills = Array.isArray(person?.softwareSkills) ? person.softwareSkills : [];
  const technicalSkills = Array.isArray(person?.skills) ? person.skills : [];
  const displayChips = Array.from(new Set([...softwareSkills, ...technicalSkills])).slice(0, 4);

  // Message capability
  const canMessage = person?.canMessage !== false;
  const messageAction = person?.messageAction || (person?.relationshipState === 'connected' ? 'message' : 'request');

  const handleMessageClick = () => {
    if (messageAction === 'request') {
      if (onMessageRequest) {
        onMessageRequest(person);
      }
    } else if (messageAction === 'message') {
      navigate(`/messages?user=${person.id || person._id}`);
    }
  };

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/95 to-[#0A101D]/95 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-brand-mint/30 hover:shadow-[0_8px_32px_-8px_rgba(159,213,178,0.12)]"
    >
      {/* Subtle Card Top Highlight */}
      <div className="gradient-line-top opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        {/* Header: Avatar + Identity */}
        <div className="flex items-start gap-3.5">
          {/* Avatar */}
          <div className="relative h-13 w-13 shrink-0">
            <div className="h-13 w-13 rounded-2xl border border-brand-mint/25 bg-gradient-to-br from-brand-mint/20 via-brand-navy/30 to-bg-card flex items-center justify-center overflow-hidden shadow-inner group-hover:border-brand-mint/40 transition-colors">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={person.name}
                  onError={() => setAvatarError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-heading font-bold text-brand-mint">
                  {initials}
                </span>
              )}
            </div>
            {person.isVerified ? (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm"
                title="Verified Professional"
              >
                <ShieldCheck className="h-3 w-3" />
              </span>
            ) : person.isActive ? (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-surface bg-brand-mint shadow-sm"
                aria-hidden="true"
              />
            ) : null}
          </div>

          {/* Name & Role */}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onPreview?.(person)}
              className="block text-left group/link focus-ring rounded w-full"
            >
              <h3 className="truncate text-base font-heading font-bold text-white group-hover/link:text-brand-mint transition-colors">
                {person.name}
              </h3>
            </button>
            {person.username && (
              <p className="truncate text-xs font-mono text-text-muted mt-0.5">
                @{person.username}
              </p>
            )}

            {/* Ecosystem Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <EcosystemRoleBadge role={person.primaryRole || person.role || 'PROFESSIONAL'} size="xs" />
            </div>
          </div>
        </div>

        {/* Professional Headline */}
        {person.headline && (
          <p className="mt-3 line-clamp-2 text-xs font-medium text-text-secondary leading-relaxed">
            {person.headline}
          </p>
        )}

        {/* Infrastructure Taxonomy details (Discipline, Sector, Location) */}
        <div className="mt-3 space-y-1 text-xs">
          {person.primaryDiscipline && (
            <div className="flex items-center gap-1.5 text-text-secondary truncate">
              <Briefcase className="h-3.5 w-3.5 text-brand-mint/80 shrink-0" />
              <span className="font-semibold text-white/90 truncate">{person.primaryDiscipline}</span>
              {person.specializations && person.specializations.length > 0 && (
                <span className="text-text-muted truncate">({person.specializations[0]})</span>
              )}
            </div>
          )}

          {person.infrastructureSectors && person.infrastructureSectors.length > 0 && (
            <div className="flex items-center gap-1.5 text-text-muted truncate">
              <Layers className="h-3.5 w-3.5 text-brand-gold/80 shrink-0" />
              <span className="truncate">{person.infrastructureSectors.slice(0, 2).join(', ')}</span>
            </div>
          )}

          {person.location && (
            <div className="flex items-center gap-1.5 text-text-faint truncate">
              <MapPin className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <span className="truncate">{person.location}</span>
            </div>
          )}
        </div>

        {/* Software & Skills Tags */}
        {displayChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills & Software">
            {displayChips.map((chip) => (
              <span
                key={chip}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-text-muted group-hover:border-brand-mint/15 transition-colors"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Smart Recommendation Reason (Deterministic) */}
        {person.recommendationReason && (
          <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-brand-mint/15 bg-brand-mint/[0.04] p-2 text-[11px] text-brand-mint/90">
            <Sparkles className="h-3.5 w-3.5 text-brand-mint shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-tight">{person.recommendationReason}</span>
          </div>
        )}

        {/* Experience • Connections Summary & Mutuals */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-white/[0.04]">
          <span className="font-mono">
            {expLabel} • {connCount} Connection{connCount !== 1 ? 's' : ''}
          </span>

          {mutualCount > 0 && (
            <button
              type="button"
              onClick={() => onViewMutual ? onViewMutual(person) : onPreview?.(person)}
              className="inline-flex items-center gap-1 text-brand-mint hover:underline font-medium"
            >
              <Users className="h-3 w-3" />
              <span>{mutualCount} mutual</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
        {/* View Profile Action */}
        <button
          type="button"
          onClick={() => onPreview?.(person)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] py-2 px-3 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-brand-mint/30 transition-all focus-ring min-w-[90px]"
        >
          <span>View Profile</span>
        </button>

        {/* Real Relationship Action (Connect / Pending / Connected) */}
        <RelationshipAction
          targetUserId={person.id || person._id}
          connectionId={person.connectionId}
          initialState={person.relationshipState || person.connectionStatus || 'none'}
          studentName={person.name}
          variant="compact"
        />

        {/* Message / Message Request Trigger */}
        {canMessage ? (
          <button
            type="button"
            onClick={handleMessageClick}
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition-all focus-ring ${
              messageAction === 'message'
                ? 'border-brand-mint/40 bg-brand-mint/10 text-brand-mint hover:bg-brand-mint/20'
                : 'border-white/[0.1] bg-white/[0.03] text-text-secondary hover:text-white hover:bg-white/[0.08]'
            }`}
            title={messageAction === 'message' ? 'Message directly' : 'Send message request'}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {messageAction === 'message' ? 'Message' : 'Request'}
            </span>
          </button>
        ) : (
          <span
            className="flex items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.02] py-2 px-2.5 text-xs text-text-faint cursor-not-allowed opacity-50"
            title="Messaging restricted by user's privacy settings"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </span>
        )}

        {/* Direct Link to full profile */}
        {person.username && (
          <Link
            to={`/network/profile/${encodeURIComponent(person.username)}`}
            aria-label={`Open ${person.name}'s profile`}
            className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-text-muted hover:border-brand-mint/30 hover:bg-white/[0.06] hover:text-white transition-all focus-ring"
            title="Open full profile"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </motion.article>
  );
}
