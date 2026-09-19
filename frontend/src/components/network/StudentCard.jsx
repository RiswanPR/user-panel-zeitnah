import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, BookOpen, Clock, ShieldCheck } from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import RelationshipAction from "./RelationshipAction";

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
                  alt={student.name}
                  onError={() => setAvatarError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-heading font-bold text-brand-mint">
                  {initials}
                </span>
              )}
            </div>
            {/* Verified badge or active status */}
            {student.isVerified ? (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm"
                title="Verified Student"
              >
                <ShieldCheck className="h-3 w-3" />
              </span>
            ) : student.isActive ? (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-surface bg-brand-mint shadow-sm"
                aria-hidden="true"
              />
            ) : null}
          </div>

          {/* Name & Username */}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onPreview?.(student)}
              className="block text-left group/link focus-ring rounded w-full"
            >
              <h3 className="truncate text-base font-heading font-bold text-white group-hover/link:text-brand-mint transition-colors">
                {student.name}
              </h3>
            </button>
            {student.username && (
              <p className="truncate text-xs font-mono text-text-muted mt-0.5">
                @{student.username}
              </p>
            )}
          </div>
        </div>

        {/* Educational Headline */}
        {student.headline && (
          <p className="mt-3 line-clamp-2 text-xs font-medium text-text-secondary leading-relaxed">
            {student.headline}
          </p>
        )}

        {/* Course / Primary Learning Context */}
        {student.course && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-xs text-text-muted">
            <BookOpen className="h-3.5 w-3.5 text-brand-mint/80 shrink-0" aria-hidden="true" />
            <span className="truncate font-medium text-white/80">{student.course}</span>
          </div>
        )}

        {/* Optional Interests Tags */}
        {student.interests && student.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Student interests">
            {student.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-text-muted group-hover:border-brand-mint/15 transition-colors"
              >
                {interest}
              </span>
            ))}
            {student.interests.length > 3 && (
              <span className="rounded-lg bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-text-muted">
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
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-2">
        {/* View Profile Action */}
        <button
          type="button"
          onClick={() => onPreview?.(student)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] py-2 px-3 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-brand-mint/30 transition-all focus-ring"
        >
          <span>View Profile</span>
        </button>

        {/* Real Relationship Action */}
        <RelationshipAction
          targetUserId={student.id}
          connectionId={student.connectionId}
          initialState={student.relationshipState || "none"}
          studentName={student.name}
          variant="compact"
        />

        {/* Direct Link to /network/profile/:username */}
        {student.username && (
          <Link
            to={`/network/profile/${encodeURIComponent(student.username)}`}
            aria-label={`Open ${student.name}'s profile`}
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
