import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Trophy,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Clock,
} from "lucide-react";
import { getUploadUrl } from "../../utils/courseUi";

/**
 * Returns a human-friendly relative time string.
 * @param {string} dateString
 * @returns {string}
 */
function getRelativeTime(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Maps activity types to visual styling, icons, and labels.
 * @param {string} type
 */
function getActivityVisuals(type) {
  switch (type) {
    case "COURSE_COMPLETED":
      return {
        icon: Trophy,
        label: "Course Completed",
        color: "text-brand-mint",
        bg: "bg-brand-mint/10 border-brand-mint/20",
        badgeBg: "bg-brand-mint/15 text-brand-mint border-brand-mint/30",
        cardBorder: "border-brand-mint/20",
      };
    case "LESSON_COMPLETED":
      return {
        icon: CheckCircle2,
        label: "Lesson Completed",
        color: "text-sky-400",
        bg: "bg-sky-400/10 border-sky-400/20",
        badgeBg: "bg-sky-400/15 text-sky-300 border-sky-400/30",
        cardBorder: "border-sky-500/20",
      };
    case "ACHIEVEMENT_EARNED":
      return {
        icon: Sparkles,
        label: "Achievement Earned",
        color: "text-brand-yellow",
        bg: "bg-brand-yellow/10 border-brand-yellow/20",
        badgeBg: "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30",
        cardBorder: "border-brand-yellow/20",
      };
    case "STREAK_MILESTONE":
      return {
        icon: Flame,
        label: "Streak Milestone",
        color: "text-amber-400",
        bg: "bg-amber-400/10 border-amber-400/20",
        badgeBg: "bg-amber-400/15 text-amber-300 border-amber-400/30",
        cardBorder: "border-amber-500/20",
      };
    case "COURSE_JOINED":
    default:
      return {
        icon: GraduationCap,
        label: "Course Enrolled",
        color: "text-indigo-400",
        bg: "bg-indigo-400/10 border-indigo-400/20",
        badgeBg: "bg-indigo-400/15 text-indigo-300 border-indigo-400/30",
        cardBorder: "border-indigo-500/20",
      };
  }
}

/**
 * Derives user initials.
 * @param {string} name
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
 * NetworkActivityItem Component
 * Renders a single authentic learning activity event card.
 *
 * @param {Object} props
 * @param {import('../../services/networkActivityService').NetworkActivityItemData} props.activity
 */
export default function NetworkActivityItem({ activity }) {
  const shouldReduceMotion = useReducedMotion();
  const [avatarError, setAvatarError] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  if (!activity) return null;

  const { actor, type, context = {}, createdAt, relationship } = activity;
  const visuals = getActivityVisuals(type);
  const Icon = visuals.icon;

  const avatarSrc =
    actor?.avatarUrl && !avatarError ? getUploadUrl(actor.avatarUrl) : null;
  const initials = getInitials(actor?.name);
  const timeAgo = getRelativeTime(createdAt);
  const profileUrl = actor?.username
    ? `/network/profile/${encodeURIComponent(actor.username)}`
    : "#";

  const thumbnailSrc =
    context?.thumbnail && !thumbError
      ? getUploadUrl(context.thumbnail)
      : null;

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group relative flex items-start gap-3.5 sm:gap-4 rounded-2xl border border-white/[0.08] bg-[#0E1526]/80 p-4 sm:p-5 transition-all duration-200 hover:border-white/[0.14] hover:bg-[#121B30]/90 shadow-sm"
    >
      {/* ── Actor Avatar with Milestone Icon Badge ── */}
      <div className="relative shrink-0 mt-0.5">
        <Link
          to={profileUrl}
          className="block relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-white/[0.1] bg-bg-card overflow-hidden transition-transform group-hover:scale-105 focus-ring"
          title={`View ${actor?.name || "Student"}'s profile`}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={actor?.name || "Student"}
              onError={() => setAvatarError(true)}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-mint/10 text-xs sm:text-sm font-heading font-bold text-brand-mint">
              {initials}
            </div>
          )}
        </Link>

        {/* Milestone Badge Icon Overlay */}
        <div
          className={`absolute -bottom-1 -right-1 flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full border border-[#0E1526] ${visuals.bg} ${visuals.color} shadow-sm`}
          title={visuals.label}
        >
          <Icon className="h-2.5 w-2.5" aria-hidden="true" />
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* Header: Name, Handle, Relationship Badge, Time */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <Link
              to={profileUrl}
              className="truncate text-xs sm:text-sm font-bold text-white hover:text-brand-mint transition-colors focus-ring rounded"
            >
              {actor?.name || "Anonymous Student"}
            </Link>

            {actor?.isVerified && (
              <ShieldCheck
                className="h-3.5 w-3.5 text-brand-mint shrink-0"
                title="Verified Student"
                aria-label="Verified Student"
              />
            )}

            {actor?.username && (
              <span className="truncate text-[11px] font-mono text-text-muted">
                @{actor.username}
              </span>
            )}

            {relationship?.state === "connected" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-mint/10 border border-brand-mint/25 px-1.5 py-0.5 text-[10px] font-medium text-brand-mint">
                <UserCheck className="h-2.5 w-2.5" />
                <span>Connected</span>
              </span>
            )}
          </div>

          {/* Time with accessible title */}
          <time
            dateTime={createdAt}
            title={createdAt ? new Date(createdAt).toLocaleString() : ""}
            className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-text-muted"
          >
            <Clock className="h-3 w-3 text-text-faint" aria-hidden="true" />
            <span>{timeAgo}</span>
          </time>
        </div>

        {/* Action Header Pill & Milestone Narrative */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider ${visuals.badgeBg}`}
          >
            <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{visuals.label}</span>
          </span>
        </div>

        {/* ── Milestone Context Card (Factual & Direct) ── */}
        {type === "COURSE_COMPLETED" && (
          <div
            className={`flex items-center gap-3 rounded-xl border ${visuals.cardBorder} bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]`}
          >
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={context?.courseName || "Course"}
                onError={() => setThumbError(true)}
                className="h-11 w-16 rounded-lg object-cover border border-white/[0.08] shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-mint/10 text-brand-mint border border-brand-mint/20">
                <Trophy className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Graduated Course
              </p>
              {context?.courseId ? (
                <Link
                  to={`/courses/${context.courseId}`}
                  className="group/link inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-white hover:text-brand-mint transition-colors truncate"
                >
                  <span className="truncate">{context?.courseName || "Course Track"}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </Link>
              ) : (
                <p className="text-xs sm:text-sm font-semibold text-white truncate">
                  {context?.courseName || "Course Track"}
                </p>
              )}
            </div>
          </div>
        )}

        {type === "LESSON_COMPLETED" && (
          <div
            className={`flex items-center gap-3 rounded-xl border ${visuals.cardBorder} bg-white/[0.02] p-2.5 sm:p-3 transition-colors hover:bg-white/[0.04]`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-white truncate">
                {context?.lessonName || "Lecture Lesson"}
              </p>
              {context?.courseName && (
                <p className="text-[11px] text-text-muted truncate mt-0.5">
                  in <span className="text-text-secondary font-medium">{context.courseName}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {type === "COURSE_JOINED" && (
          <div
            className={`flex items-center gap-3 rounded-xl border ${visuals.cardBorder} bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]`}
          >
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={context?.courseName || "Course"}
                onError={() => setThumbError(true)}
                className="h-11 w-16 rounded-lg object-cover border border-white/[0.08] shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <BookOpen className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Enrolled in Curriculum
              </p>
              {context?.courseId ? (
                <Link
                  to={`/courses/${context.courseId}`}
                  className="group/link inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-white hover:text-indigo-300 transition-colors truncate"
                >
                  <span className="truncate">{context?.courseName || "Curriculum Track"}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </Link>
              ) : (
                <p className="text-xs sm:text-sm font-semibold text-white truncate">
                  {context?.courseName || "Curriculum Track"}
                </p>
              )}
            </div>
          </div>
        )}

        {type === "ACHIEVEMENT_EARNED" && (
          <div
            className={`flex items-center gap-3 rounded-xl border ${visuals.cardBorder} bg-brand-yellow/[0.03] p-3`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {context?.achievementName || "Milestone Badge"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Earned for active curriculum and learning progress.
              </p>
            </div>
          </div>
        )}

        {type === "STREAK_MILESTONE" && (
          <div
            className={`flex items-center gap-3 rounded-xl border ${visuals.cardBorder} bg-amber-500/[0.03] p-3`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Flame className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-white">
                {context?.streakDays || 7}-Day Learning Streak
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Demonstrating outstanding continuous study habits.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.article>
  );
}
