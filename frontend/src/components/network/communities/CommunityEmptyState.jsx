import { Users, RefreshCw } from "lucide-react";

/**
 * CommunityEmptyState Component
 * Displays helpful messaging when discovery or search results return empty.
 *
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {function(): void} [props.onReset]
 */
export default function CommunityEmptyState({
  title = "No learning spaces found",
  description = "Try adjusting your search keywords or exploring all community categories.",
  onReset,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-text-faint shadow-inner">
        <Users className="h-8 w-8" />
      </div>

      <h3 className="mt-4 text-base sm:text-lg font-heading font-bold text-white">
        {title}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-text-muted leading-relaxed">
        {description}
      </p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.08] hover:border-brand-mint/30 transition-all focus-ring"
        >
          <RefreshCw className="h-3.5 w-3.5 text-brand-mint" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
