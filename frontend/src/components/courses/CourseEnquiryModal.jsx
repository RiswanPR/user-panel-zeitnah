import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  CheckCircle2,
  Phone,
  Mail,
  User,
  MessageSquare,
  GraduationCap,
  AlertCircle,
  Loader2,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import api from "../../services/api";

function CourseEnquiryModal({ isOpen, onClose, course }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Adjust state during render when modal opens (official React 19 pattern)
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setFormData({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        message: "",
      });
      setSuccess(false);
      setError("");
      setLoading(false);
    }
  }

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !course) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      setError("Please fill in all required fields (Name, Email, and Phone).");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await api.post("/courses/enquiry", {
        courseId: course._id,
        courseName: course.name,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
      });

      setSuccess(true);
    } catch (err) {
      console.error("Course enquiry failed:", err);
      setError(
        err.response?.data?.message ||
          "Failed to submit enquiry. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-labelledby="course-enquiry-modal-title"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-bg-surface shadow-2xl z-10"
        >
          <div className="gradient-line-top" />

          {/* Header */}
          <div className="relative flex items-center justify-between p-5 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3
                  id="course-enquiry-modal-title"
                  className="font-heading font-extrabold text-base sm:text-lg text-white tracking-tight"
                >
                  Course Enquiry
                </h3>
                <p className="text-xs font-medium text-text-muted">
                  Get enrollment details directly from our advisors
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6">
            {/* Course Summary Banner */}
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              {course.coverImage ? (
                <img
                  src={course.coverImage}
                  alt={course.name}
                  className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center border border-white/10 shrink-0">
                  <GraduationCap className="w-5 h-5 text-brand-mint" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-mint">
                  Target Course
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {course.name}
                </h4>
              </div>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-heading font-extrabold text-white">
                  Enquiry Submitted
                </h4>
                <p className="text-xs sm:text-sm text-text-muted max-w-sm leading-relaxed">
                  Thank you for your interest in{" "}
                  <span className="text-white font-semibold">{course.name}</span>.
                  Our team will reach out to you shortly.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 transition-all cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Your Name <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm focus-ring"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Email Address <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. alex@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm focus-ring"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Phone Number <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +1 555 123 4567"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm focus-ring"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Message{" "}
                    <span className="text-text-faint font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
                    <textarea
                      rows={3}
                      placeholder="Questions about schedule or syllabus..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full glass-input pl-10 pr-4 py-2.5 text-xs sm:text-sm focus-ring resize-none"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-yellow text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-yellow/90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Submit Enquiry
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default CourseEnquiryModal;
