import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Camera,
  FileText,
  Code2,
  GraduationCap,
  Briefcase,
  Award,
  Globe,
  Circle,
  CheckCircle2,
  ChevronRight,
  User,
  MapPin,
  Building,
} from "lucide-react";
import { Link } from "react-router-dom";

const iconMap = {
  camera: Camera,
  'file-text': FileText,
  code: Code2,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  award: Award,
  globe: Globe,
  sparkles: Sparkles,
  user: User,
  'map-pin': MapPin,
  building: Building,
};

/**
 * Animated Number Counter for Profile Strength & XP.
 * Respects prefers-reduced-motion and animates smoothly only on value change.
 */
function AnimatedCounter({ value, duration = 800 }) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion) {
      prevValueRef.current = value;
      return;
    }

    const start = prevValueRef.current;
    const end = value;
    if (start === end) return;

    const startTime = performance.now();
    let frameId;

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      } else {
        prevValueRef.current = end;
      }
    };

    frameId = requestAnimationFrame(update);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value, duration, prefersReducedMotion]);

  return <span>{prefersReducedMotion ? value : displayValue}</span>;
}

/**
 * World-Class Profile Strength & Guided Next Step Card.
 * Uses authoritative backend completion telemetry (completionPercent, remainingMilestones, potentialXp, nextBestActions).
 */
export default function ProfileCompletionCard({
  completionData,
  className = "",
}) {
  const prefersReducedMotion = useReducedMotion();
  const completion = Math.min(100, Math.max(0, completionData?.completionPercent ?? 0));
  const isComplete = completion >= 100;
  const remainingCount = completionData?.remainingMilestones?.length ?? 0;
  const potentialXp = completionData?.potentialXp ?? 0;
  const nextActions = completionData?.nextBestActions || [];

  const dominantAction = nextActions[0];
  const secondaryActions = nextActions.slice(1, 3);

  const DominantIcon = dominantAction ? iconMap[dominantAction.icon] || iconMap[dominantAction.category?.toLowerCase()] || Sparkles : Sparkles;

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* ── 01. PROFILE STRENGTH MODULE ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
        className={`relative overflow-hidden rounded-3xl border bg-bg-card p-6 sm:p-8 transition-all ${
          isComplete
            ? "border-brand-mint/30 shadow-[0_0_30px_rgba(159,213,178,0.06)]"
            : "border-border-default hover:border-brand-mint/20"
        }`}
      >
        <div className="gradient-line-top" />

        {/* Ambient subtle backdrop glow */}
        <div
          className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-[100px] pointer-events-none ${
            isComplete ? "bg-brand-mint/10" : "bg-brand-yellow/5"
          }`}
        />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Strength metrics & progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                  isComplete
                    ? "bg-brand-mint/10 border border-brand-mint/20 text-brand-mint"
                    : "bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow"
                }`}
              >
                {isComplete ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Profile Strength 100%
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    ✦ Profile Strength
                  </>
                )}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-heading font-black text-white tracking-tight">
                <AnimatedCounter value={completion} />%
              </h2>
              <span className="text-sm sm:text-base font-semibold text-text-secondary">
                {isComplete
                  ? "Identity fully established"
                  : completion === 0
                  ? "Your profile is just getting started"
                  : "Your profile is taking shape"}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-text-muted mt-1.5 max-w-xl leading-relaxed">
              {isComplete
                ? "All core identity sections, skills, education, and credentials have been verified."
                : completion === 0
                ? "Add a few details to introduce yourself, show your learning journey, and build your public identity."
                : `${remainingCount} meaningful step${remainingCount === 1 ? "" : "s"} remaining • Potential XP +${potentialXp} XP`}
            </p>

            {/* Authoritative Progress Bar with ARIA */}
            <div className="mt-5 max-w-md w-full">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                <span className="text-white font-mono">
                  <AnimatedCounter value={completion} />% Complete
                </span>
                <span className="text-brand-mint font-mono font-bold">
                  {isComplete ? "Milestones Achieved" : `+${potentialXp} XP Available`}
                </span>
              </div>

              <div
                role="progressbar"
                aria-valuenow={completion}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completion progress"
                className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5 border border-white/[0.04]"
              >
                <motion.div
                  initial={false}
                  animate={{ width: `${completion}%` }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isComplete
                      ? "bg-gradient-to-r from-brand-mint to-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.5)]"
                      : "bg-gradient-to-r from-brand-mint via-brand-yellow to-brand-yellow"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Right: Circular Gauge */}
          <div className="relative shrink-0 hidden sm:flex items-center justify-center">
            <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center">
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
                  initial={false}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 42 * (1 - completion / 100),
                  }}
                  transition={{ duration: prefersReducedMotion ? 0 : 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-heading font-black text-white leading-none">
                  <AnimatedCounter value={completion} />%
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted mt-1">
                  Strength
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 100% Celebration banner */}
        {isComplete && (
          <div className="mt-6 pt-4 border-t border-brand-mint/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-brand-mint font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-mint shrink-0" />
              <span>All profile completion milestones (+270 potential XP) claimed. Your identity represents you at your best.</span>
            </div>
            <Link
              to="/public-profile"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-mint hover:underline shrink-0"
            >
              View Public Profile
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </motion.div>

      {/* ── 02. YOUR NEXT STEP (DOMINANT ACTION MODULE) ── */}
      {!isComplete && dominantAction && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl border border-brand-mint/25 bg-gradient-to-r from-bg-card via-bg-elevated to-bg-card p-6 sm:p-7 shadow-sm group hover:border-brand-mint/40 transition-all"
        >
          <div className="gradient-line-top" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-mint/15 border border-brand-mint/25 flex items-center justify-center text-brand-mint shrink-0 group-hover:scale-105 transition-transform">
                <DominantIcon className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-mint">
                    Your Next Step
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow">
                    +{dominantAction.xp} XP
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-heading font-black text-white group-hover:text-brand-mint transition-colors">
                  {dominantAction.title}
                </h3>

                <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-xl">
                  {dominantAction.description}
                </p>
              </div>
            </div>

            <Link
              to={`/profile/edit?section=${dominantAction.targetSection}`}
              className="btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-2 py-3 px-6 shrink-0 w-full sm:w-auto cursor-pointer shadow-md"
            >
              <span>{dominantAction.actionLabel || "Continue"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Secondary Actions (Supporting) */}
          {secondaryActions.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                Next up after this:
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {secondaryActions.map((sec) => (
                  <Link
                    key={sec.id}
                    to={`/profile/edit?section=${sec.targetSection}`}
                    className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
                  >
                    <span>{sec.title}</span>
                    <span className="text-brand-yellow font-mono font-bold text-[10px]">
                      (+{sec.xp} XP)
                    </span>
                    <ChevronRight className="w-3 h-3 text-text-faint" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
