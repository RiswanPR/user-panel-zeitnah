import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, BookOpen, Clock, ShieldCheck } from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import RelationshipAction from "./RelationshipAction";
import EcosystemRoleBadge from "./EcosystemRoleBadge";
import AvailabilityBadge from "./AvailabilityBadge";
import { normalizeUserRole, getCanonicalProfileUrl, getProfileIdentifier } from "../../utils/roleNavigation";
import { resolveDisplayIdentity } from "../../utils/professionalIdentity";
import ProfileAvatar from "../profile/ProfileAvatar";

/**
 * Derives user initials from full name.
 */
function getInitials(name) {
  if (!name) return "Z";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Derives subtle relative presence label from lastActiveAt timestamp.
 */
function formatLastActive(lastActiveAt) {
  if (!lastActiveAt) return null;
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Active recently";
  if (diffHours < 24) return "Active today";
  if (diffHours < 168) return "Active this week";
  return null;
}

/**
 * StudentCard Component
 * Real-data student discovery card with presence, preview trigger, and future-ready connect state.
 *
 * @param {Object} props
 * @param {import('../../services/networkService').DiscoverableStudent} props.student - Student data object
 * @param {function(import('../../services/networkService').DiscoverableStudent): void} [props.onPreview] - Preview modal callback
 */
export default function StudentCard({ student, onPreview }) {
  const shouldReduceMotion = useReducedMotion();
  const [avatarError, setAvatarError] = useState(false);

  const avatarSrc = student?.avatarUrl && !avatarError ? getUploadUrl(student.avatarUrl) : null;
  const initials = getInitials(student?.name);
  const activeLabel = formatLastActive(student?.lastActiveAt);

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface-card p-5 shadow-lg transition-all duration-300 hover:border-brand-mint/30 hover:shadow-[0_8px_32px_-8px_rgba(159,213,178,0.12)]"
    >
      {/* Subtle Card Top Highlight */}
      <div className="gradient-line-top opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        {/* Header: Avatar + Identity */}
        <div className="flex items-start gap-3.5">
          {/* Avatar with Availability Frame */}
          <ProfileAvatar
            src={student.avatar}
            name={student.name}
            initials={initials}
            size="md"
            availability={student.availability}
            isVerified={student.isVerified}
            showVerificationBadge={true}
            isActive={student.isActive}
          />

          {/* Name & Username */}
          <div className="min-w-0 flex-1">
            <Link
              to={getCanonicalProfileUrl(student)}
              className="block text-left group/link focus-ring rounded w-full"
            >
              <h3 className="truncate text-base font-heading font-bold text-text-primary group-hover/link:text-brand-mint transition-colors">
                {student.name}
              </h3>
            </Link>
            {student.username && (
              <Link
                to={getCanonicalProfileUrl(student)}
                className="truncate text-xs font-mono text-text-muted hover:text-brand-mint transition-colors mt-0.5 block"
              >
                @{student.username}
              </Link>
            )}

            {/* Ecosystem Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <EcosystemRoleBadge role={normalizeUserRole(student)} size="xs" />
              <AvailabilityBadge availability={student.availability} size="xs" />
            </div>
          </div>
        </div>

        {/* Structured Professional Identity / Current Role */}
        {(() => {
          const displayIdentity = resolveDisplayIdentity(student);
          if (!displayIdentity.title && !displayIdentity.department) return null;
          return (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {displayIdentity.title && (
                <span className="text-xs font-semibold text-text-secondary truncate max-w-[200px]" title={displayIdentity.title}>
                  {displayIdentity.title}
                </span>
              )}
              {displayIdentity.department && (
                <span className="text-[10px] font-medium text-brand-mint bg-brand-mint/10 border border-brand-mint/20 px-1.5 py-0.2 rounded truncate max-w-[150px]" title={`Department: ${displayIdentity.department}`}>
                  {displayIdentity.department}
                </span>
              )}
            </div>
          );
        })()}

        {/* Educational Headline */}
        {student.headline && (
          <p className="mt-3 line-clamp-2 text-xs font-medium text-text-secondary leading-relaxed">
            {student.headline}
          </p>
        )}

        {/* Course / Primary Learning Context */}
        {student.course && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-2.5 py-1.5 text-xs text-text-muted">
            <BookOpen className="h-3.5 w-3.5 text-brand-mint/80 shrink-0" aria-hidden="true" />
            <span className="truncate font-medium text-text-secondary">{student.course}</span>
          </div>
        )}

        {/* Optional Interests Tags */}
        {student.interests && student.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Student interests">
            {student.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="rounded-lg border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-text-muted group-hover:border-brand-mint/15 transition-colors"
              >
                {interest}
              </span>
            ))}
            {student.interests.length > 3 && (
              <span className="rounded-lg bg-surface-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                +{student.interests.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Presence Status */}
        {activeLabel && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
            <Clock className="h-3 w-3 text-text-faint shrink-0" />
            <span>{activeLabel}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-border flex items-center gap-2">
        {/* View Profile Action */}
        <button
          type="button"
          onClick={() => onPreview?.(student)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-elevated py-2 px-3 text-xs font-semibold text-text-primary hover:bg-surface-card hover:border-brand-mint/30 transition-all focus-ring"
        >
          <span>View Profile</span>
        </button>

        {/* Real Relationship Action */}
        <RelationshipAction
          targetUserId={student.id}
          connectionId={student.connectionId}
          initialState={student.relationshipState || student.connectionStatus || "none"}
          studentName={student.name}
          variant="compact"
        />

        {/* Direct Link to canonical profile */}
        {getProfileIdentifier(student) && (
          <Link
            to={getCanonicalProfileUrl(student)}
            aria-label={`Open ${student.name}'s profile`}
            className="flex items-center justify-center rounded-xl border border-border bg-surface-elevated p-2 text-text-muted hover:border-brand-mint/30 hover:bg-surface-card hover:text-text-primary transition-all focus-ring"
            title="Open full profile"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </motion.article>
  );
}
