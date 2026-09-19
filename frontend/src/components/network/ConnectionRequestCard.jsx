import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import RelationshipAction from "./RelationshipAction";

/**
 * Formats ISO date into relative time (e.g. "2 hours ago", "Yesterday").
 * @param {string} dateStr
 * @returns {string}
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * ConnectionRequestCard Component
 * Displays incoming or outgoing connection request items with contextual controls.
 *
 * @param {Object} props
 * @param {Object} props.request - Request item containing user and timestamp
 * @param {string} props.request.connectionId
 * @param {Object} props.request.user - DiscoverableStudent
 * @param {string} props.request.createdAt
 * @param {'incoming' | 'outgoing'} [props.type='incoming']
 * @param {function(Object): void} [props.onPreview]
 */
export default function ConnectionRequestCard({
  request,
  type = "incoming",
  onPreview,
}) {
  const student = request?.user || {};
  const connectionId = request?.connectionId;
  const createdAt = request?.createdAt;

  const initials = student.name
    ? student.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "ST";

  const isIncoming = type === "incoming";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-bg-surface/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-brand-mint/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
    >
      <div>
        {/* Direction Tag & Timestamp */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isIncoming
                ? "bg-brand-mint/10 text-brand-mint border border-brand-mint/20"
                : "bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20"
            }`}
          >
            {isIncoming ? (
              <>
                <ArrowDownLeft className="h-3 w-3" />
                <span>Received</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="h-3 w-3" />
                <span>Sent</span>
              </>
            )}
          </span>

          <div className="flex items-center gap-1 text-[11px] text-text-muted">
            <Clock className="h-3 w-3 text-text-faint" />
            <span>{formatRelativeTime(createdAt)}</span>
          </div>
        </div>

        {/* Header: Avatar, Name & Handles */}
        <div className="flex items-start gap-3.5">
          {/* Avatar with fallback */}
          <div className="relative shrink-0">
            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={`${student.name}'s profile avatar`}
                className="h-13 w-13 rounded-2xl object-cover border-2 border-white/[0.08] group-hover:border-brand-mint/40 transition-colors"
                loading="lazy"
              />
            ) : (
              <div
                className="flex h-13 w-13 items-center justify-center rounded-2xl border-2 border-white/[0.08] bg-gradient-to-br from-brand-mint/20 via-white/[0.06] to-brand-mint/5 font-heading font-bold text-white text-base group-hover:border-brand-mint/40 transition-colors"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}

            {student.isVerified && (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm"
                title="Verified Student"
              >
                <ShieldCheck className="h-3 w-3" />
              </span>
            )}
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
              <p className="truncate text-xs font-mono text-text-muted">
                @{student.username}
              </p>
            )}
          </div>
        </div>

        {/* Headline */}
        {student.headline && (
          <p className="mt-3 line-clamp-2 text-xs font-medium text-text-secondary leading-relaxed">
            {student.headline}
          </p>
        )}

        {/* Course */}
        {student.course && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-xs text-text-muted">
            <BookOpen className="h-3.5 w-3.5 text-brand-mint/80 shrink-0" aria-hidden="true" />
            <span className="truncate font-medium text-white/80">{student.course}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
        {/* View Profile Action */}
        <button
          type="button"
          onClick={() => onPreview?.(student)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] py-2 px-3 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-brand-mint/30 transition-all focus-ring"
        >
          <span>View Profile</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Relationship Actions (Accept / Decline OR Pending / Cancel) */}
          <RelationshipAction
            targetUserId={student.id}
            connectionId={connectionId}
            initialState={isIncoming ? "incoming_pending" : "outgoing_pending"}
            studentName={student.name}
            variant="compact"
          />

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
      </div>
    </motion.article>
  );
}
