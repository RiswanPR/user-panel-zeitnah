import { useState } from "react";
import {
  Users,
  MessageSquare,
  BookOpen,
  PlusCircle,
  Check,
  LogOut,
  Shield,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * CommunityHero Component
 * Cinematic banner for the community profile page.
 *
 * @param {Object} props
 * @param {Object} props.community
 * @param {function(): void} [props.onJoin]
 * @param {function(): void} [props.onLeave]
 * @param {function(): void} [props.onOpenComposer]
 * @param {boolean} [props.isActionLoading]
 */
export default function CommunityHero({
  community,
  onJoin,
  onLeave,
  onOpenComposer,
  isActionLoading = false,
}) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isMember =
    community?.membership?.state === "member" ||
    community?.membership?.state === "moderator" ||
    community?.membership?.state === "owner";
  const isPending = community?.membership?.state === "pending";
  const role = community?.membership?.role;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#152033]/90 via-[#0E1726]/95 to-[#080E1A]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-mint/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-brand-navy/30 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Identity */}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar / Emblem */}
          <div className="relative h-20 w-20 shrink-0 rounded-2xl border-2 border-brand-mint/30 bg-gradient-to-br from-brand-mint/20 via-brand-navy/50 to-bg-card flex items-center justify-center overflow-hidden shadow-xl text-brand-mint font-heading font-black text-2xl">
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

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider text-text-muted">
                {community.type || "Learning Space"}
              </span>

              {community.visibility === "private" ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                  <Lock className="h-3 w-3" />
                  <span>Private Space</span>
                </span>
              ) : (
                <span className="inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Public Space
                </span>
              )}

              {role && role !== "member" && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-brand-mint/30 bg-brand-mint/15 px-2 py-0.5 text-xs font-semibold text-brand-mint">
                  <Shield className="h-3 w-3" />
                  <span className="capitalize">{role}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
              {community.name}
            </h1>

            {community.description && (
              <p className="max-w-2xl text-sm font-medium text-text-secondary leading-relaxed">
                {community.description}
              </p>
            )}

            {/* Linked Course */}
            {community.course && (
              <div className="pt-1">
                <Link
                  to={`/course-learning/${community.course.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/90 hover:border-brand-mint/30 hover:bg-white/[0.06] transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5 text-brand-mint" />
                  <span>Associated Course: {community.course.name}</span>
                </Link>
              </div>
            )}

            {/* Topics Tags */}
            {community.topics && community.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {community.topics.map((t) => (
                  <span
                    key={t}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-text-muted"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Stats & Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-between gap-4 shrink-0">
          {/* Stats Bar */}
          <div className="flex items-center gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 backdrop-blur-md">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-lg font-heading font-black text-white">
                <Users className="h-4 w-4 text-brand-mint" />
                <span>{community.memberCount || 0}</span>
              </div>
              <p className="text-[11px] font-medium text-text-muted">Members</p>
            </div>
            <div className="h-8 w-px bg-white/[0.08]" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-lg font-heading font-black text-white">
                <MessageSquare className="h-4 w-4 text-brand-mint" />
                <span>{community.discussionCount || 0}</span>
              </div>
              <p className="text-[11px] font-medium text-text-muted">Topics</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {isMember ? (
              <>
                <button
                  type="button"
                  onClick={onOpenComposer}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-brand-mint px-4 py-2.5 text-xs sm:text-sm font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Start Topic</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-text-muted hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all focus-ring"
                    title="Community Options"
                  >
                    <Check className="h-4 w-4 text-brand-mint" />
                    <span>Joined</span>
                  </button>

                  {/* Leave confirmation dropdown */}
                  {showLeaveConfirm && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/[0.1] bg-bg-surface p-2 shadow-xl z-20">
                      <p className="px-2 py-1 text-xs text-text-muted">
                        Leave this learning space?
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLeaveConfirm(false);
                          onLeave?.();
                        }}
                        disabled={isActionLoading}
                        className="mt-1 w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Leave Community</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : isPending ? (
              <span className="inline-flex items-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-xs sm:text-sm font-medium text-text-muted">
                Membership Pending
              </span>
            ) : (
              <button
                type="button"
                onClick={onJoin}
                disabled={isActionLoading}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-brand-mint px-6 py-2.5 text-xs sm:text-sm font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring disabled:opacity-50"
              >
                <Users className="h-4 w-4" />
                <span>{isActionLoading ? "Joining..." : "Join Space"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
