import {
  MessageSquare,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import DiscussionCard from "./DiscussionCard";

const DISCUSSION_FILTERS = [
  { id: "all", label: "All Topics" },
  { id: "discussion", label: "Discussions" },
  { id: "question", label: "Questions" },
  { id: "project", label: "Projects" },
  { id: "resource", label: "Resources" },
  { id: "study_help", label: "Study Help" },
];

/**
 * CommunityDiscussions Component
 * List of discussions with category filtering, pagination, and composer trigger.
 *
 * @param {Object} props
 * @param {Array} props.discussions
 * @param {number} props.total
 * @param {number} props.page
 * @param {number} props.totalPages
 * @param {string} props.communitySlug
 * @param {boolean} props.isMember
 * @param {string} props.selectedType
 * @param {function(string): void} props.onTypeChange
 * @param {function(number): void} props.onPageChange
 * @param {function(): void} props.onOpenComposer
 * @param {boolean} [props.isLoading]
 */
export default function CommunityDiscussions({
  discussions = [],
  total = 0,
  page = 1,
  totalPages = 1,
  communitySlug,
  isMember,
  selectedType = "all",
  onTypeChange,
  onPageChange,
  onOpenComposer,
  isLoading = false,
}) {
  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {DISCUSSION_FILTERS.map((f) => {
            const isSelected = selectedType === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onTypeChange(f.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all focus-ring ${
                  isSelected
                    ? "border border-brand-mint/40 bg-brand-mint/15 text-brand-mint shadow-sm"
                    : "border border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Start Topic Action */}
        {isMember && (
          <button
            type="button"
            onClick={onOpenComposer}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-mint px-4 py-2 text-xs sm:text-sm font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Start Topic</span>
          </button>
        )}
      </div>

      {/* Discussions Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-32 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
            />
          ))}
        </div>
      ) : discussions.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-text-faint" />
          <h4 className="mt-3 text-base font-heading font-bold text-white">
            No topics in this category
          </h4>
          <p className="mt-1 text-xs text-text-muted max-w-md mx-auto">
            There are currently no discussions matching this filter. Start one
            to begin collaborating with other learners.
          </p>
          {isMember && (
            <button
              type="button"
              onClick={onOpenComposer}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-mint px-5 py-2.5 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Start the First Topic</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {discussions.map((discussion) => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              communitySlug={communitySlug}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <p className="text-xs text-text-muted">
            Page <span className="font-semibold text-white">{page}</span> of{" "}
            <span className="font-semibold text-white">{totalPages}</span> (
            {total} {total === 1 ? "topic" : "topics"})
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:pointer-events-none focus-ring"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:pointer-events-none focus-ring"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
