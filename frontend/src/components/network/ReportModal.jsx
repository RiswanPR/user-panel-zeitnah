import { useState } from "react";
import { X, Flag, AlertTriangle, Loader2 } from "lucide-react";
import moderationService from "../../services/moderationService";
import { useToast } from "../ui/Toast";

export default function ReportModal({ targetType, targetId, targetName, onClose }) {
  const toast = useToast();
  const [reason, setReason] = useState("INAPPROPRIATE_CONTENT");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;

    try {
      setSubmitting(true);
      await moderationService.createReport({
        targetType,
        targetId,
        reason,
        details,
      });
      toast.success("Report submitted. Our moderation team will review this factual report.");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-surface border border-white/10 shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Submit Report</h3>
            <p className="text-xs text-text-muted">Reporting {targetName || targetType.toLowerCase()}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-mint transition-colors"
            >
              <option value="INAPPROPRIATE_CONTENT">Inappropriate or Offensive Content</option>
              <option value="SPAM_OR_SCAM">Spam, Scam, or Misleading Information</option>
              <option value="IMPERSONATION">Impersonation or False Identity</option>
              <option value="HARASSMENT">Harassment or Unwanted Contact</option>
              <option value="OTHER">Other Factual Concern</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide factual context to help our team investigate..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-mint transition-colors placeholder:text-text-muted resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Submit Report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
