import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  MessageSquare,
  Pin,
  Lock,
  HelpCircle,
  FolderKanban,
  BookOpen,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "recently";
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

const TYPE_CONFIG = {
  question: {
    label: "Question",
    icon: HelpCircle,
    color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
  },
  discussion: {
    label: "Discussion",
    icon: MessageSquare,
    color: "text-brand-mint border-brand-mint/20 bg-brand-mint/10",
  },
  project: {
    label: "Project",
    icon: FolderKanban,
    color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
  },
  resource: {
    label: "Resource",
    icon: BookOpen,
    color: "text-purple-400 border-purple-500/20 bg-purple-500/10",
  },
  study_help: {
    label: "Study Help",
    icon: GraduationCap,
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
  },
};

/**
 * DiscussionCard Component
 * Displays a single discussion topic in the community list.
 *
 * @param {Object} props
 * @param {Object} props.discussion
 * @param {string} props.communitySlug
 */
export default function DiscussionCard({ discussion, communitySlug }) {
  const shouldReduceMotion = useReducedMotion();
  const typeInfo = TYPE_CONFIG[discussion.type] || TYPE_CONFIG.discussion;
  const TypeIcon = typeInfo.icon;

  const relativeTime = formatRelativeTime(discussion.createdAt);

  const authorInitials = discussion.author?.name
    ? discussion.author.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ST";

  const discussionUrl = `/network/communities/${communitySlug}/discussions/${discussion.id}`;

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 backdrop-blur-xl shadow-lg transition-all duration-300 ${
        discussion.isPinned
          ? "border-brand-mint/30 bg-gradient-to-b from-[#131F30]/90 to-[#0A101D]/90 shadow-[0_4px_24px_-4px_rgba(159,213,178,0.1)]"
          : "border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90 hover:border-brand-mint/25"
      }`}
    >
      <div>
        {/* Header: Author + Meta + Type Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Author Avatar */}
            <div className="relative h-9 w-9 shrink-0">
              <div className="h-9 w-9 rounded-xl border border-white/[0.1] bg-white/[0.04] flex items-center justify-center overflow-hidden text-xs font-heading font-bold text-brand-mint">
                {discussion.author?.avatarUrl ? (
                  <img
                    src={discussion.author.avatarUrl}
                    alt={discussion.author.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  authorInitials
                )}
              </div>
              {discussion.author?.isVerified && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-mint text-bg-base">
                  <ShieldCheck className="h-2.5 w-2.5" />
                </span>
              )}
            </div>

            {/* Author Name + Time */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {discussion.author?.username ? (
                  <Link
                    to={`/network/profile/${encodeURIComponent(discussion.author.username)}`}
                    className="truncate text-xs font-semibold text-white/90 hover:text-brand-mint transition-colors"
                  >
                    {discussion.author.name}
                  </Link>
                ) : (
                  <span className="truncate text-xs font-semibold text-white/90">
                    {discussion.author?.name || "Student"}
                  </span>
                )}
                <span className="text-[11px] text-text-faint">•</span>
                <span className="text-[11px] text-text-muted">{relativeTime}</span>
              </div>
              {discussion.author?.headline && (
                <p className="truncate text-[10px] text-text-muted">
                  {discussion.author.headline}
                </p>
              )}
            </div>
          </div>

          {/* Type Badge & Pin */}
          <div className="flex items-center gap-2 shrink-0">
            {discussion.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-md border border-brand-mint/30 bg-brand-mint/15 px-2 py-0.5 text-[10px] font-bold text-brand-mint">
                <Pin className="h-3 w-3" />
                <span>Pinned</span>
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${typeInfo.color}`}
            >
              <TypeIcon className="h-3 w-3" />
              <span>{typeInfo.label}</span>
            </span>
          </div>
        </div>

        {/* Discussion Title */}
        <Link to={discussionUrl} className="mt-3.5 block group/title focus-ring rounded">
          <h4 className="text-base font-heading font-bold text-white group-hover/title:text-brand-mint transition-colors line-clamp-2">
            {discussion.title}
          </h4>
        </Link>

        {/* Discussion Excerpt */}
        <p className="mt-2 line-clamp-3 text-xs font-normal text-text-secondary leading-relaxed">
          {discussion.body}
        </p>
      </div>

      {/* Footer: Replies & Status */}
      <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-text-muted">
        <Link
          to={discussionUrl}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5 text-brand-mint/80" />
          <span>
            {discussion.replyCount || 0}{" "}
            {discussion.replyCount === 1 ? "reply" : "replies"}
          </span>
        </Link>

        {discussion.status === "locked" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90">
            <Lock className="h-3 w-3" />
            <span>Closed</span>
          </span>
        )}
      </div>
    </motion.article>
  );
}
