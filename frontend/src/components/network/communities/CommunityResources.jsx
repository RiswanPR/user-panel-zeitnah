import { useState } from "react";
import {
  BookOpen,
  FileText,
  ExternalLink,
  PlusCircle,
  X,
  Send,
} from "lucide-react";

/**
 * CommunityResources Component
 * Shared materials, course references, and documentation for a learning community.
 *
 * @param {Object} props
 * @param {Array} props.resources
 * @param {boolean} props.isMember
 * @param {function(Object): Promise<void>} props.onCreateResource
 * @param {boolean} [props.isLoading]
 */
export default function CommunityResources({
  resources = [],
  isMember,
  onCreateResource,
  isLoading = false,
}) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("link");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      setError("Resource title must be at least 3 characters.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onCreateResource({
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim(),
      });
      setTitle("");
      setDescription("");
      setUrl("");
      setType("link");
      setShowModal(false);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to share resource.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResourceIcon = (t) => {
    switch (t) {
      case "course":
        return <BookOpen className="h-4 w-4 text-brand-mint" />;
      case "document":
        return <FileText className="h-4 w-4 text-purple-400" />;
      default:
        return <ExternalLink className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white">
            Shared Learning Materials
          </h3>
          <p className="text-xs text-text-muted">
            Curated resources, documentation, and course links shared by members.
          </p>
        </div>

        {isMember && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-mint px-4 py-2 text-xs sm:text-sm font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Share Resource</span>
          </button>
        )}
      </div>

      {/* Resource Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
            />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-text-faint" />
          <h4 className="mt-3 text-base font-heading font-bold text-white">
            No resources shared yet
          </h4>
          <p className="mt-1 text-xs text-text-muted max-w-md mx-auto">
            Help your fellow peers by sharing helpful articles, documentation,
            or course materials.
          </p>
          {isMember && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-mint px-5 py-2.5 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Share First Resource</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((res) => (
            <div
              key={res.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111A29]/90 to-[#0A101D]/90 p-4 backdrop-blur-xl transition-all hover:border-brand-mint/25 hover:shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center shrink-0">
                      {getResourceIcon(res.type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-heading font-bold text-white group-hover:text-brand-mint transition-colors">
                        {res.title}
                      </h4>
                      <span className="text-[10px] font-mono uppercase text-text-muted">
                        {res.type}
                      </span>
                    </div>
                  </div>

                  {res.url && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 text-text-muted hover:text-brand-mint hover:border-brand-mint/30 transition-all focus-ring shrink-0"
                      title="Open external resource"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {res.description && (
                  <p className="mt-2.5 text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {res.description}
                  </p>
                )}
              </div>

              {/* Creator Footer */}
              <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-text-muted">
                <span>Shared by {res.createdBy?.name || "Member"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Resource Modal */}
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
                Share a Learning Resource
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
                  Resource Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Python Quick Reference Guide"
                  required
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs sm:text-sm text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Resource Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-[#111A29] px-3 py-2 text-xs sm:text-sm text-white focus:border-brand-mint/50 focus:outline-none"
                >
                  <option value="link">Web Link / Article</option>
                  <option value="document">Document / PDF Reference</option>
                  <option value="course">Course Reference</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  URL / Reference Link
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs sm:text-sm text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief note on why this resource is useful..."
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] p-3 text-xs sm:text-sm text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none resize-none"
                />
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
                  <span>{isSubmitting ? "Sharing..." : "Share"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
