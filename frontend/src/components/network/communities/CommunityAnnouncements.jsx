import { useState } from "react";
import { Bell, Pin, PlusCircle, X, Send, Shield } from "lucide-react";

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

/**
 * CommunityAnnouncements Component
 * Timeline of official announcements from moderators/owners.
 *
 * @param {Object} props
 * @param {Array} props.announcements
 * @param {boolean} props.canModerate
 * @param {function(Object): Promise<void>} props.onCreateAnnouncement
 * @param {boolean} [props.isLoading]
 */
export default function CommunityAnnouncements({
  announcements = [],
  canModerate = false,
  onCreateAnnouncement,
  isLoading = false,
}) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      setError("Announcement title must be at least 3 characters.");
      return;
    }
    if (!content.trim() || content.trim().length < 5) {
      setError("Announcement content must be at least 5 characters.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onCreateAnnouncement({
        title: title.trim(),
        content: content.trim(),
        pinned,
      });
      setTitle("");
      setContent("");
      setPinned(false);
      setShowModal(false);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to post announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Moderation Action */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white">
            Official Announcements
          </h3>
          <p className="text-xs text-text-muted">
            Important updates, guidelines, and notices from space moderators.
          </p>
        </div>

        {canModerate && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-mint px-4 py-2 text-xs sm:text-sm font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Post Notice</span>
          </button>
        )}
      </div>

      {/* Announcements Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-28 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
            />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-text-faint" />
          <h4 className="mt-3 text-base font-heading font-bold text-white">
            No announcements yet
          </h4>
          <p className="mt-1 text-xs text-text-muted">
            Space moderators haven't posted any notices yet.
          </p>
          {canModerate && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-mint px-5 py-2.5 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Post First Announcement</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const relativeTime = formatRelativeTime(a.createdAt);

            return (
              <article
                key={a.id}
                className={`rounded-2xl border p-5 backdrop-blur-xl transition-all shadow-lg ${
                  a.pinned
                    ? "border-brand-mint/30 bg-gradient-to-b from-brand-mint/[0.08] via-[#121D2F] to-[#0A101D] shadow-[0_4px_24px_-4px_rgba(159,213,178,0.12)]"
                    : "border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-xs font-heading font-bold text-brand-mint">
                      {a.author?.avatarUrl ? (
                        <img
                          src={a.author.avatarUrl}
                          alt={a.author.name}
                          className="h-full w-full object-cover rounded-xl"
                        />
                      ) : (
                        a.author?.name?.[0]?.toUpperCase() || "M"
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white/90">
                          {a.author?.name || "Moderator"}
                        </span>
                        <span className="inline-flex items-center gap-0.5 rounded-md border border-brand-mint/30 bg-brand-mint/10 px-1 py-0.2 text-[9px] font-mono font-bold text-brand-mint">
                          <Shield className="h-2.5 w-2.5" />
                          <span>MOD</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted">
                        {relativeTime}
                      </span>
                    </div>
                  </div>

                  {a.pinned && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-brand-mint/30 bg-brand-mint/15 px-2 py-0.5 text-[10px] font-bold text-brand-mint">
                      <Pin className="h-3 w-3" />
                      <span>Pinned</span>
                    </span>
                  )}
                </div>

                <h4 className="text-base font-heading font-bold text-white mb-2">
                  {a.title}
                </h4>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {a.content}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* Post Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowModal(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-3xl border border-white/[0.1] bg-gradient-to-b from-[#141E30] to-[#0A101D] p-6 backdrop-blur-2xl shadow-2xl z-10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-heading font-bold text-white">
                Post Community Announcement
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-text-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekly Project Study Jam this Friday"
                  required
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs sm:text-sm text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Content *
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detailed announcement for community members..."
                  required
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] p-3 text-xs sm:text-sm text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="ann-pin"
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-brand-mint focus:ring-brand-mint"
                />
                <label
                  htmlFor="ann-pin"
                  className="text-xs font-semibold text-white/90 cursor-pointer"
                >
                  Pin this announcement to the top
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-white/[0.08] px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-mint px-4 py-2 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Publishing..." : "Publish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
