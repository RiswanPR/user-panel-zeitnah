import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";
import { getCanonicalProfileUrl, normalizeUserRole } from "../../utils/roleNavigation";
import EcosystemRoleBadge from "./EcosystemRoleBadge";

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

function getInitials(name) {
  if (!name) return "ZU";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * ConnectionRequestCard Component
 * Elegant, compact relationship card for Connection Requests.
 *
 * Implements Section 8:
 * - Avatar (48px) with status & canonical profile link.
 * - Name + Role / Org.
 * - Context: "Wants to connect with you" (incoming) or "Request sent" (outgoing).
 * - Fast, accessible, visually differentiated actions:
 *   - Accept (brand mint)
 *   - Decline (neutral non-destructive styling)
 * - Safe canonical profile URLs.
 */
export default function ConnectionRequestCard({
  request,
  type = "incoming",
  onAccept,
  onDecline,
  onCancel,
  isAccepting = false,
  isDeclining = false,
  isCancelling = false,
  onPreview,
}) {
  const shouldReduceMotion = useReducedMotion();

  // Safely unpack member from user or requester wrapper
  const member =
    request?.user ||
    request?.requester ||
    request?.requesterId ||
    request?.recipient ||
    request?.recipientId ||
    {};

  const connectionId = request?.connectionId || request?._id || request?.id;
  const createdAt = request?.createdAt;
  const note = request?.note || request?.message;

  const isIncoming = type === "incoming";
  const avatarSrc = member?.avatarUrl || member?.avatar ? getUploadUrl(member.avatarUrl || member.avatar) : null;
  const initials = getInitials(member?.name);
  const canonicalUrl = getCanonicalProfileUrl(member);

  return (
    <motion.article
      layout
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/95 p-4 sm:p-5 shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-brand-mint/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
    >
      <div>
        {/* Direction Tag & Time Elapsed */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
              isIncoming
                ? "bg-brand-mint/10 text-brand-mint border border-brand-mint/20"
                : "bg-white/[0.04] text-text-muted border border-white/[0.08]"
            }`}
          >
            {isIncoming ? (
              <>
                <ArrowDownLeft className="h-3 w-3" />
                <span>Incoming</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="h-3 w-3" />
                <span>Outgoing</span>
              </>
            )}
          </span>

          <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
            <Clock className="h-3 w-3 text-text-muted/70" />
            <span>{formatRelativeTime(createdAt)}</span>
          </div>
        </div>

        {/* Member Identity: Avatar, Name & Context */}
        <div className="flex items-start gap-3.5">
          {/* Avatar (48px) */}
          <div className="relative shrink-0">
            <Link
              to={canonicalUrl}
              aria-label={`View ${member.name || "Member"}'s profile`}
              className="h-12 w-12 rounded-xl overflow-hidden border border-white/[0.08] bg-[#070B14] flex items-center justify-center group-hover:border-brand-mint/40 transition-colors block focus-ring"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={member.name || "Member"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-heading font-extrabold text-brand-mint tracking-wider select-none">
                  {initials}
                </span>
              )}
            </Link>

            {member.isVerified && (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-black shadow-sm"
                title="Verified Member"
              >
                <ShieldCheck className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Name & Headline */}
          <div className="min-w-0 flex-1">
            <Link
              to={canonicalUrl}
              className="font-heading font-bold text-sm sm:text-base text-white hover:text-brand-mint transition-colors truncate block focus-ring rounded"
            >
              {member.name || "Zeitnah Member"}
            </Link>

            {member.username && (
              <Link
                to={canonicalUrl}
                className="text-xs font-mono text-text-muted hover:text-brand-mint/80 transition-colors truncate block"
              >
                @{member.username}
              </Link>
            )}

            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <EcosystemRoleBadge role={normalizeUserRole(member)} size="xs" />
              {member.currentRole && (
                <span className="text-[11px] text-text-muted truncate">
                  • {member.currentRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Relationship Intent Headline */}
        <div className="mt-3.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-xs font-medium text-text-secondary leading-relaxed">
            {note ? (
              <span className="italic">"{note}"</span>
            ) : isIncoming ? (
              <span className="text-white/80">Wants to connect with you on Zeitnah</span>
            ) : (
              <span className="text-text-muted">Awaiting recipient response</span>
            )}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        {/* Secondary: Preview or Canonical Link */}
        {onPreview ? (
          <button
            type="button"
            onClick={() => onPreview(member)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            Preview
          </button>
        ) : (
          <Link
            to={canonicalUrl}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1"
          >
            <span>Profile</span>
            <ExternalLink className="w-3 h-3 text-text-muted" />
          </Link>
        )}

        {/* Relationship Action Buttons */}
        <div className="flex items-center gap-2">
          {isIncoming ? (
            <>
              {/* Decline: Restrained, non-destructive neutral surface */}
              <button
                type="button"
                onClick={() => onDecline?.(connectionId)}
                disabled={isDeclining || isAccepting}
                aria-label={`Decline request from ${member.name}`}
                className="px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-text-muted hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 min-h-[38px] inline-flex items-center gap-1.5 focus-ring"
              >
                {isDeclining ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>Decline</span>
              </button>

              {/* Accept: Primary brand-mint */}
              <button
                type="button"
                onClick={() => onAccept?.(connectionId)}
                disabled={isAccepting || isDeclining}
                aria-label={`Accept request from ${member.name}`}
                className="px-4 py-2 rounded-xl bg-brand-mint hover:bg-brand-mint/90 text-black text-xs font-bold transition-all cursor-pointer shadow-md shadow-brand-mint/15 disabled:opacity-50 min-h-[38px] inline-flex items-center gap-1.5 focus-ring"
              >
                {isAccepting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Accept</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onCancel?.(connectionId)}
              disabled={isCancelling}
              aria-label={`Cancel request sent to ${member.name}`}
              className="px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-rose-500/10 hover:border-rose-500/30 text-text-muted hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 min-h-[38px] inline-flex items-center gap-1.5 focus-ring"
            >
              {isCancelling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>Cancel Request</span>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
