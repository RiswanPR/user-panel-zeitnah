import { useState, useEffect } from "react";
import { X, Flag, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import moderationService from "../../services/moderationService";
import { useToast } from "../ui/Toast";

export default function ReportModal({
  isOpen = true,
  targetType = "USER",
  targetId,
  targetName,
  onClose,
}) {
  const toast = useToast();
  const [reason, setReason] = useState("INAPPROPRIATE_CONTENT");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Close on Escape key (unless currently submitting)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submitting, onClose]);

  if (isOpen !== undefined && !isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || submitting) return;

    setSubmitError(null);
    try {
      setSubmitting(true);
      await moderationService.createReport({
        targetType,
        targetId,
        reason,
        details: details.trim(),
      });
      setIsSuccess(true);
      toast.success("Report submitted. Our moderation team will review this factual report.");
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to submit report. Please try again.";
      setSubmitError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[2px] transition-all animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose?.();
        }
      }}
    >
      <div className="relative w-full max-sm:rounded-t-3xl max-sm:rounded-b-none sm:rounded-3xl sm:max-w-lg bg-[#0C121E] border border-white/[0.12] shadow-2xl p-6 sm:p-7 max-sm:max-h-[90vh] overflow-y-auto">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2 mb-4 sm:hidden" />

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-mint/15 border border-brand-mint/30 text-brand-mint flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-heading font-bold text-white tracking-tight">
                Report Submitted
              </h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                Thank you for helping maintain safety and professional integrity across Zeitnah. Our moderation team will review this report factually.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="zn-btn-primary text-xs py-2.5 px-6 font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5 border-b border-white/[0.08] pb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 shrink-0">
                <Flag className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="report-modal-title" className="text-base font-heading font-bold text-white tracking-tight">
                  Submit Factual Report
                </h3>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  Reporting {targetName ? `${targetName}` : targetType?.toLowerCase()}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-text-muted bg-white/[0.02] border border-white/[0.06] p-3 rounded-xl mb-4 leading-relaxed">
              Reports are confidential and reviewed independently. Please provide accurate details to help our team take appropriate action.
            </p>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="report-reason"
                  className="block text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider mb-1.5"
                >
                  Reason for Report
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-mint transition-colors cursor-pointer"
                >
                  <option value="INAPPROPRIATE_CONTENT" className="bg-[#0C121E]">Inappropriate or Offensive Content</option>
                  <option value="SPAM_OR_SCAM" className="bg-[#0C121E]">Spam, Scam, or Misleading Information</option>
                  <option value="IMPERSONATION" className="bg-[#0C121E]">Impersonation or False Identity</option>
                  <option value="HARASSMENT" className="bg-[#0C121E]">Harassment or Unwanted Contact</option>
                  <option value="OTHER" className="bg-[#0C121E]">Other Factual Concern</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="report-details"
                    className="block text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider"
                  >
                    Additional Factual Context
                  </label>
                  <span className="text-[10px] text-text-faint font-mono">
                    {details.length}/500
                  </span>
                </div>
                <textarea
                  id="report-details"
                  rows={3}
                  value={details}
                  maxLength={500}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={submitting}
                  placeholder="Describe specific details to assist our team in investigating..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-mint transition-colors placeholder:text-text-muted/60 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer min-h-[38px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
