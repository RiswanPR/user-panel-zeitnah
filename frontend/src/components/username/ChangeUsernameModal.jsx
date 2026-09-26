import { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  X,
  Sparkles,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";

export default function ChangeUsernameModal({
  isOpen,
  onClose,
  currentUsername: propUsername,
  onSuccess,
}) {
  const { user, updateUser } = useContext(AuthContext);
  const toast = useToast();

  const currentUsername = propUsername || user?.username || "";
  const [desiredHandle, setDesiredHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Cooldown status state
  const [statusLoading, setStatusLoading] = useState(true);
  const [canChange, setCanChange] = useState(true);
  const [remainingDays, setRemainingDays] = useState(0);
  const [nextAllowedDate, setNextAllowedDate] = useState(null);

  // Live availability check state
  const [isChecking, setIsChecking] = useState(false);
  const [serverResult, setServerResult] = useState(null);
  const activeQueryRef = useRef("");

  // Reset helper
  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setDesiredHandle("");
    setServerResult(null);
    setErrorMessage("");
    onClose();
  }, [isSubmitting, onClose]);

  // Fetch server status when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    api
      .get("/profile/username/status")
      .then((res) => {
        if (!isMounted) return;
        setCanChange(res.data.canChange !== false);
        setRemainingDays(res.data.remainingDays || 0);
        setNextAllowedDate(res.data.nextAllowedDate || null);
      })
      .catch(() => {
        if (!isMounted) return;
        setCanChange(true);
      })
      .finally(() => {
        if (isMounted) setStatusLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, handleClose]);

  // Client-side synchronous validation
  const trimmed = desiredHandle.trim().toLowerCase();
  const isCurrentUsername = Boolean(
    trimmed && trimmed === currentUsername.toLowerCase()
  );

  const clientValidationError = useMemo(() => {
    if (!trimmed) return null;
    if (isCurrentUsername) return "This is already your current username.";
    if (trimmed.length < 3) return "Must be at least 3 characters.";
    if (trimmed.length > 20) return "Must be 20 characters or fewer.";
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      return "Only lowercase letters, numbers, and underscores allowed.";
    }
    if (trimmed.startsWith("_") || trimmed.endsWith("_")) {
      return "Cannot start or end with an underscore.";
    }
    if (trimmed.includes("__")) {
      return "Cannot contain consecutive underscores.";
    }
    return null;
  }, [trimmed, isCurrentUsername]);

  // Debounced server availability check
  useEffect(() => {
    if (!isOpen || !canChange || !trimmed || clientValidationError) {
      return;
    }

    activeQueryRef.current = trimmed;
    const currentTarget = trimmed;

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const res = await api.get(
          `/profile/username/check?username=${encodeURIComponent(currentTarget)}`
        );
        if (activeQueryRef.current === currentTarget) {
          setServerResult(res.data);
        }
      } catch {
        if (activeQueryRef.current === currentTarget) {
          setServerResult({
            available: false,
            reason: "Unable to verify username right now.",
          });
        }
      } finally {
        if (activeQueryRef.current === currentTarget) {
          setIsChecking(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [trimmed, clientValidationError, isOpen, canChange]);

  const activeResult = clientValidationError
    ? { available: false, reason: clientValidationError }
    : serverResult;

  const isSaveDisabled =
    isSubmitting ||
    isChecking ||
    !trimmed ||
    Boolean(clientValidationError) ||
    !activeResult?.available;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSaveDisabled || !canChange) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const res = await api.patch("/profile/username", {
        username: trimmed,
      });

      const updatedUsername = res.data.user?.username || trimmed;
      const updatedChangedAt =
        res.data.user?.usernameChangedAt || new Date().toISOString();

      // Update AuthContext immediately across all components
      updateUser({
        username: updatedUsername,
        usernameChangedAt: updatedChangedAt,
        usernameClaimed: true,
      });

      toast.success(
        "Username Updated",
        `Your handle has been successfully changed to @${updatedUsername}.`
      );

      if (typeof onSuccess === "function") {
        onSuccess(updatedUsername);
      }

      handleClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Could not change username. Please check requirements and try again.";
      setErrorMessage(msg);
      toast.error("Change Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-username-title"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-3xl bg-bg-card border border-border-default shadow-2xl overflow-hidden text-left z-10"
        >
          <div className="gradient-line-top" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-44 bg-brand-mint/15 rounded-full blur-[80px] pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            aria-label="Close dialog"
            className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-mint px-2.5 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 mb-2">
                <Sparkles className="w-3 h-3" />
                Public Identity
              </div>
              <h2
                id="change-username-title"
                className="font-heading font-extrabold text-xl sm:text-2xl text-white tracking-tight"
              >
                Change Username
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Your username identifies you across Zeitnah discussions, public
                profile, and certificates.
              </p>
            </div>

            {/* Current Username badge */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">
                Current username:
              </span>
              <span className="font-mono font-semibold text-brand-mint">
                @{currentUsername}
              </span>
            </div>

            {/* Status Loading */}
            {statusLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-text-muted text-xs">
                <Loader2 className="w-4 h-4 text-brand-mint animate-spin" />
                Loading identity status...
              </div>
            ) : !canChange ? (
              /* Cooldown active warning */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-200">
                    <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                    Username Change Cooldown Active
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-300/90">
                    To maintain trusted identity across the academy, usernames
                    can only be changed once every 14 days.
                  </p>
                  <div className="pt-1 text-[11px] font-semibold text-white">
                    You can change your username again in{" "}
                    <span className="text-brand-mint font-bold">
                      {remainingDays} {remainingDays === 1 ? "day" : "days"}
                    </span>
                    {nextAllowedDate && (
                      <span className="text-text-muted font-normal">
                        {" "}
                        (after {new Date(nextAllowedDate).toLocaleDateString()})
                      </span>
                    )}
                    .
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full btn-secondary py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Got It
                </button>
              </div>
            ) : (
              /* Form to edit username */
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-2 text-left">
                  <label
                    htmlFor="new-username-input"
                    className="block text-[11px] font-bold uppercase tracking-wider text-brand-mint"
                  >
                    New Desired Username
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-text-muted pointer-events-none">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      id="new-username-input"
                      type="text"
                      autoFocus
                      maxLength={20}
                      aria-label="New desired username"
                      value={desiredHandle}
                      onChange={(e) =>
                        setDesiredHandle(
                          e.target.value.toLowerCase().replace(/\s+/g, "_")
                        )
                      }
                      placeholder="new_handle"
                      className="w-full glass-input pl-10 pr-10 py-3 text-sm font-mono tracking-wide text-white"
                    />
                    <div className="absolute right-3">
                      {isChecking && (
                        <Loader2 className="w-4 h-4 text-brand-mint animate-spin" />
                      )}
                      {!isChecking && activeResult?.available && (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      )}
                      {!isChecking && activeResult && !activeResult.available && (
                        <XCircle className="w-4 h-4 text-danger" />
                      )}
                    </div>
                  </div>

                  {/* Feedback line */}
                  <div className="min-h-[20px] text-xs">
                    {isChecking ? (
                      <span className="text-text-muted flex items-center gap-1 text-[11px]">
                        Checking availability...
                      </span>
                    ) : activeResult?.available ? (
                      <span className="text-success font-medium flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        @{trimmed} is available!
                      </span>
                    ) : activeResult ? (
                      <span className="text-danger font-medium flex items-center gap-1 text-[11px]">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        {activeResult.reason || "Username is unavailable."}
                      </span>
                    ) : (
                      <span className="text-text-muted text-[11px]">
                        3–20 lowercase letters, numbers, and underscores.
                      </span>
                    )}
                  </div>
                </div>

                {/* Cooldown notice */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5 text-[11px] text-text-muted">
                  <Clock className="w-3.5 h-3.5 text-brand-mint shrink-0 mt-0.5" />
                  <span>
                    Username changes are limited to{" "}
                    <strong className="text-white">once every 14 days</strong>.
                  </span>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleClose}
                    className="btn-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaveDisabled}
                    className="btn-primary py-2.5 px-5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Save Username
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
