import { Link } from "react-router-dom";
import {
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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

const ROLE_FILTERS = [
  { id: "all", label: "All Members" },
  { id: "moderator", label: "Moderators" },
  { id: "member", label: "Members" },
];

/**
 * CommunityMembers Component
 * Directory of members in a learning space with role filtering and search.
 *
 * @param {Object} props
 * @param {Array} props.members
 * @param {number} props.total
 * @param {number} props.page
 * @param {number} props.totalPages
 * @param {string} props.selectedRole
 * @param {function(string): void} props.onRoleChange
 * @param {function(number): void} props.onPageChange
 * @param {boolean} [props.isLoading]
 */
export default function CommunityMembers({
  members = [],
  total = 0,
  page = 1,
  totalPages = 1,
  selectedRole = "all",
  onRoleChange,
  onPageChange,
  isLoading = false,
}) {
  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {ROLE_FILTERS.map((r) => {
            const isSelected = selectedRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onRoleChange(r.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all focus-ring ${
                  isSelected
                    ? "border border-brand-mint/40 bg-brand-mint/15 text-brand-mint shadow-sm"
                    : "border border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-text-muted">
          <span className="font-semibold text-white">{total}</span>{" "}
          {total === 1 ? "member" : "members"}
        </p>
      </div>

      {/* Members Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-28 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
            />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-text-faint" />
          <h4 className="mt-3 text-base font-heading font-bold text-white">
            No members found
          </h4>
          <p className="mt-1 text-xs text-text-muted">
            There are no members matching the selected role.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {members.map((member) => {
            const joinedLabel = formatRelativeTime(member.joinedAt);

            const initials = member.name
              ? member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "ST";

            const isMod =
              member.role === "moderator" || member.role === "owner";

            return (
              <div
                key={member.id}
                className="group relative flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90 p-4 backdrop-blur-xl transition-all hover:border-brand-mint/25 hover:shadow-lg"
              >
                {/* Avatar */}
                <div className="relative h-11 w-11 shrink-0">
                  <div className="h-11 w-11 rounded-xl border border-white/[0.1] bg-white/[0.04] flex items-center justify-center overflow-hidden text-xs font-heading font-bold text-brand-mint">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  {isMod && (
                    <span
                      className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-mint text-bg-base shadow-sm"
                      title={member.role}
                    >
                      <Shield className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    {member.username ? (
                      <Link
                        to={`/network/profile/${encodeURIComponent(member.username)}`}
                        className="truncate text-xs font-heading font-bold text-white group-hover:text-brand-mint transition-colors"
                      >
                        {member.name}
                      </Link>
                    ) : (
                      <span className="truncate text-xs font-heading font-bold text-white">
                        {member.name}
                      </span>
                    )}

                    {isMod && (
                      <span className="rounded-md border border-brand-mint/30 bg-brand-mint/10 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase text-brand-mint shrink-0">
                        {member.role}
                      </span>
                    )}
                  </div>

                  {member.username && (
                    <p className="truncate text-[10px] font-mono text-text-muted">
                      @{member.username}
                    </p>
                  )}

                  {member.headline && (
                    <p className="mt-1 truncate text-[11px] text-text-secondary">
                      {member.headline}
                    </p>
                  )}

                  <p className="mt-1.5 text-[10px] text-text-faint">
                    Joined {joinedLabel}
                  </p>
                </div>

                {/* Profile Link */}
                {member.username && (
                  <Link
                    to={`/network/profile/${encodeURIComponent(member.username)}`}
                    className="shrink-0 p-1 text-text-faint hover:text-brand-mint transition-colors"
                    title="View Profile"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <p className="text-xs text-text-muted">
            Page <span className="font-semibold text-white">{page}</span> of{" "}
            <span className="font-semibold text-white">{totalPages}</span>
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
