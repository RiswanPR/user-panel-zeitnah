import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, HelpCircle, MessageSquare, FolderKanban, BookOpen, GraduationCap } from "lucide-react";

const DISCUSSION_TYPES = [
  { id: "discussion", label: "Discussion", icon: MessageSquare },
  { id: "question", label: "Question", icon: HelpCircle },
  { id: "project", label: "Project", icon: FolderKanban },
  { id: "resource", label: "Resource", icon: BookOpen },
  { id: "study_help", label: "Study Help", icon: GraduationCap },
];

/**
 * DiscussionComposerModal Component
 * Accessible modal dialog to create a new discussion topic in a community.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {function(): void} props.onClose
 * @param {function({ title: string, body: string, type: string }): Promise<void>} props.onSubmit
 * @param {string} [props.communityName]
 */
export default function DiscussionComposerModal({
  isOpen,
  onClose,
  onSubmit,
  communityName = "Learning Space",
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("discussion");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      setError("Please provide a title with at least 3 characters.");
      return;
    }
    if (!body.trim() || body.trim().length < 5) {
      setError("Please provide details with at least 5 characters.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        type,
      });
      setTitle("");
      setBody("");
      setType("discussion");
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to post topic.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="composer-modal-title"
          className="relative w-full max-w-2xl rounded-3xl border border-white/[0.1] bg-gradient-to-b from-[#141E30] to-[#0A101D] p-6 sm:p-7 backdrop-blur-2xl shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <h2
                id="composer-modal-title"
                className="text-lg sm:text-xl font-heading font-black text-white"
              >
                Start a Discussion
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Participating in {communityName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] p-2 text-text-muted hover:bg-white/[0.05] hover:text-white transition-colors focus-ring"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2">
                Topic Type
              </label>
              <div className="flex flex-wrap gap-2">
                {DISCUSSION_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all focus-ring ${
                        isSelected
                          ? "border-brand-mint/40 bg-brand-mint/15 text-brand-mint shadow-sm"
                          : "border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="discussion-title"
                  className="text-xs font-semibold text-text-secondary"
                >
                  Topic Title *
                </label>
                <span className="text-[10px] font-mono text-text-faint">
                  {title.length}/200
                </span>
              </div>
              <input
                id="discussion-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="What would you like to discuss or ask?"
                required
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none focus:ring-2 focus:ring-brand-mint/20 transition-all"
              />
            </div>

            {/* Body Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="discussion-body"
                  className="text-xs font-semibold text-text-secondary"
                >
                  Details & Context *
                </label>
                <span className="text-[10px] font-mono text-text-faint">
                  {body.length}/10,000
                </span>
              </div>
              <textarea
                id="discussion-body"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={10000}
                placeholder="Share your question, thoughts, or project details. Markdown is supported."
                required
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] p-3.5 text-sm text-white placeholder:text-text-faint focus:border-brand-mint/50 focus:outline-none focus:ring-2 focus:ring-brand-mint/20 transition-all resize-y"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-semibold text-text-muted hover:bg-white/[0.04] hover:text-white transition-colors focus-ring"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-mint px-5 py-2.5 text-xs font-bold text-bg-base hover:bg-brand-mint/90 transition-all shadow-md focus-ring disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Posting..." : "Publish Topic"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
