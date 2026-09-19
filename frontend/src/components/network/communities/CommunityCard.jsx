import { motion, useReducedMotion } from "framer-motion";
import { Users, MessageSquare, Sparkles, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * CommunityCard Component
 * Displays a learning community in the discovery grid with membership state and recommendations.
 *
 * @param {Object} props
 * @param {Object} props.community
 * @param {function(string): void} [props.onJoin]
 * @param {boolean} [props.isJoining]
 */
export default function CommunityCard({ community, onJoin, isJoining = false }) {
  const shouldReduceMotion = useReducedMotion();
  const isMember =
    community?.membership?.state === "member" ||
    community?.membership?.state === "moderator" ||
    community?.membership?.state === "owner";
  const isPending = community?.membership?.state === "pending";

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-brand-mint/30 hover:shadow-[0_8px_32px_-8px_rgba(159,213,178,0.12)]"
    >
      {/* Subtle Card Top Highlight */}
      <div className="gradient-line-top opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        {/* Recommendation Tag if matched */}
        {community?.recommendationReason && (
          <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-full border border-brand-mint/30 bg-brand-mint/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-mint shadow-sm">
            <Sparkles className="h-3 w-3" />
            <span>{community.recommendationReason}</span>
          </div>
        )}

        {/* Header: Avatar / Icon & Name */}
        <div className="flex items-start gap-3.5">
          <div className="relative h-12 w-12 shrink-0">
            <div className="h-12 w-12 rounded-2xl border border-brand-mint/25 bg-gradient-to-br from-brand-mint/20 via-brand-navy/40 to-bg-card flex items-center justify-center overflow-hidden shadow-inner text-brand-mint font-heading font-bold text-lg">
              {community.avatarUrl ? (
                <img
                  src={community.avatarUrl}
                  alt={community.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                community.name?.slice(0, 2).toUpperCase() || "LC"
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <Link
              to={`/network/communities/${community.slug}`}
              className="block group/link focus-ring rounded"
            >
              <h3 className="truncate text-base font-heading font-bold text-white group-hover/link:text-brand-mint transition-colors">
                {community.name}
              </h3>
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
                {community.type || "general"}
              </span>
              {community.visibility === "private" && (
                <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                  Private
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {community.description && (
          <p className="mt-3 line-clamp-2 text-xs font-medium text-text-secondary leading-relaxed">
            {community.description}
          </p>
        )}

        {/* Topics Chips */}
        {community.topics && community.topics.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5" aria-label="Topics">
            {community.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-text-muted group-hover:border-brand-mint/15 transition-colors"
              >
                #{topic}
              </span>
            ))}
            {community.topics.length > 3 && (
              <span className="rounded-lg bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-text-muted">
                +{community.topics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-text-faint" />
            <span className="font-semibold text-white/90">
              {community.memberCount || 0}
            </span>
            <span>{community.memberCount === 1 ? "member" : "members"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-text-faint" />
            <span className="font-semibold text-white/90">
              {community.discussionCount || 0}
            </span>
            <span>{community.discussionCount === 1 ? "topic" : "topics"}</span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-2.5">
        <Link
          to={`/network/communities/${community.slug}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] py-2 px-3 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-brand-mint/30 transition-all focus-ring"
        >
          <span>View Space</span>
          <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
        </Link>

        {isMember ? (
          <span className="inline-flex items-center gap-1 rounded-xl border border-brand-mint/30 bg-brand-mint/10 px-3 py-2 text-xs font-semibold text-brand-mint">
            <Check className="h-3.5 w-3.5" />
            <span>Joined</span>
          </span>
        ) : isPending ? (
          <span className="inline-flex items-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs font-medium text-text-muted">
            Pending
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onJoin?.(community.id)}
            disabled={isJoining}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-mint px-3.5 py-2 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-sm focus-ring disabled:opacity-50"
          >
            {isJoining ? "Joining..." : "Join Space"}
          </button>
        )}
      </div>
    </motion.article>
  );
}
