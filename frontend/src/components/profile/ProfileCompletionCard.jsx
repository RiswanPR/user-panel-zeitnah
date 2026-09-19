import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * High-impact Profile Completion Card.
 * Uses real profile completion metrics from the backend gamification engine.
 * Displays milestone targets (50%, 75%, 100%) and interactive links to complete missing fields.
 */
export default function ProfileCompletionCard({
  profile,
  onUploadAvatarClick,
  className = "",
}) {
  const gamification = profile?.gamification || {};
  const completion = Math.min(100, Math.max(0, gamification.profileCompletion ?? 0));
  const isComplete = completion >= 100;

  // Evaluate the 5 standard completion fields
  const items = [
    {
      id: "name",
      label: "Full Name",
      done: Boolean(profile?.name && profile.name.trim().length > 0),
      to: "/profile/edit",
    },
    {
      id: "email",
      label: "Verified Email",
      done: Boolean(profile?.email && profile.email.trim().length > 0),
      to: null,
    },
    {
      id: "avatar",
      label: "Profile Photo",
      done: Boolean(profile?.avatar && profile.avatar.trim().length > 0),
      action: onUploadAvatarClick,
    },
    {
      id: "bio",
      label: "Biography",
      done: Boolean(profile?.bio && profile.bio.trim().length > 0),
      to: "/profile/edit",
    },
    {
      id: "skills",
      label: "Skills & Specialties",
      done: Boolean(Array.isArray(profile?.skills) && profile.skills.length > 0),
      to: "/profile/edit",
    },
  ];

  const missingItems = items.filter((item) => !item.done);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`relative overflow-hidden rounded-2xl border bg-bg-card p-6 sm:p-7 transition-all ${
        isComplete
          ? "border-brand-mint/30 shadow-[0_0_30px_rgba(159,213,178,0.06)]"
          : "border-border-default hover:border-brand-mint/20"
      } ${className}`}
    >
      <div className="gradient-line-top" />

      {/* Ambient background glow */}
      <div
        className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-[100px] pointer-events-none ${
          isComplete ? "bg-brand-mint/10" : "bg-brand-yellow/5"
        }`}
      />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left info & progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                isComplete
                  ? "bg-brand-mint/10 border border-brand-mint/20 text-brand-mint"
                  : "bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow"
              }`}
            >
              {isComplete ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Identity 100% Complete
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Profile Completion
                </>
              )}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
            {isComplete ? "Your Zeitnah Identity is Fully Verified" : "Strengthen Your Zeitnah Presence"}
          </h2>

          <p className="text-xs sm:text-sm text-text-muted mt-1.5 max-w-xl leading-relaxed">
            {isComplete
              ? "All personal credentials, portfolio fields, and milestone badges have been unlocked."
              : "Complete missing identity fields to personalize your learning roadmap and earn milestone XP."}
          </p>

          {/* Progress bar */}
          <div className="mt-5 max-w-md w-full">
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              <span className="text-white font-mono">{completion}% Complete</span>
              <span className="text-brand-mint font-mono">
                {isComplete ? "Milestones Achieved" : `${missingItems.length} step${missingItems.length === 1 ? "" : "s"} left`}
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5 border border-white/[0.04]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  isComplete
                    ? "bg-gradient-to-r from-brand-mint to-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.5)]"
                    : "bg-gradient-to-r from-brand-mint via-brand-yellow to-brand-yellow"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Circular badge indicator on desktop */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="6"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={isComplete ? "#9FD5B2" : "#F6ED4A"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 42 * (1 - completion / 100),
                }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl sm:text-2xl font-heading font-black text-white leading-none">
                {completion}%
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted mt-1">
                Score
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Missing items checklist (if not 100%) */}
      {!isComplete && missingItems.length > 0 && (
        <div className="mt-6 pt-5 border-t border-white/[0.06]">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Suggested actions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {missingItems.map((item) => {
              if (item.action) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 hover:bg-white/[0.04] transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Circle className="w-4 h-4 text-brand-yellow shrink-0" />
                      <span className="text-xs font-medium text-white truncate">
                        Add {item.label}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-mint transition-colors shrink-0" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.to || "/profile/edit"}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 hover:bg-white/[0.04] transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Circle className="w-4 h-4 text-brand-yellow shrink-0" />
                    <span className="text-xs font-medium text-white truncate">
                      Add {item.label}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-mint transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed celebration banner */}
      {isComplete && (
        <div className="mt-6 pt-4 border-t border-brand-mint/15 flex items-center justify-between text-xs text-brand-mint font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-mint" />
            <span>All profile completion milestones (+100 XP) claimed.</span>
          </div>
          <Link
            to="/my-points"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-mint hover:underline"
          >
            View XP Roadmap
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
