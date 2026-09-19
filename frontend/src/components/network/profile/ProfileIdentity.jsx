import { useState } from "react";
import { BookOpen, GraduationCap, Award, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

/**
 * ProfileIdentity Component
 * Displays the student's learning identity, curriculum track, gamified rank,
 * academic context, and expandable interests chips.
 *
 * @param {Object} props
 * @param {Object} props.identity - Learning identity data
 * @param {string} [props.identity.course]
 * @param {number} [props.identity.level]
 * @param {string} [props.identity.rank]
 * @param {string[]} [props.identity.interests]
 * @param {string} [props.identity.institution]
 */
export default function ProfileIdentity({ identity }) {
  const [expandedInterests, setExpandedInterests] = useState(false);

  if (!identity) return null;

  const interests = identity.interests || [];
  const initialLimit = 5;
  const displayedInterests = expandedInterests
    ? interests
    : interests.slice(0, initialLimit);
  const remainingCount = interests.length - initialLimit;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-bg-surface/90 p-5 sm:p-6 shadow-lg backdrop-blur-xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand-mint" />
          <span>Learning Identity</span>
        </h2>

        {/* Level / Rank Badge */}
        {identity.rank && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand-mint/20 bg-brand-mint/10 px-2.5 py-1 text-xs font-bold text-brand-mint">
            <Award className="h-3.5 w-3.5" />
            <span>{identity.rank}</span>
            {identity.level ? <span className="text-[10px] text-brand-mint/70">• Lvl {identity.level}</span> : null}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Primary Enrolled Course */}
        {identity.course && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Primary Learning Track
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-sm font-bold text-white">
              <BookOpen className="h-4 w-4 text-brand-mint shrink-0" />
              <span className="truncate">{identity.course}</span>
            </div>
          </div>
        )}

        {/* Academic Institution */}
        {identity.institution && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Institution
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-white">
              <GraduationCap className="h-4 w-4 text-brand-yellow shrink-0" />
              <span className="truncate">{identity.institution}</span>
            </div>
          </div>
        )}
      </div>

      {/* Learning Interests & Competencies */}
      {interests.length > 0 && (
        <div className="pt-2 border-t border-white/[0.06]">
          <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2.5">
            Learning Focus & Competencies
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {displayedInterests.map((interest) => (
              <span
                key={interest}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-white/80 hover:border-brand-mint/25 transition-colors"
              >
                {interest}
              </span>
            ))}

            {remainingCount > 0 && (
              <button
                type="button"
                onClick={() => setExpandedInterests(!expandedInterests)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs font-semibold text-brand-mint hover:bg-white/[0.08] transition-colors focus-ring"
              >
                <span>
                  {expandedInterests ? "Show less" : `+${remainingCount} more`}
                </span>
                {expandedInterests ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
