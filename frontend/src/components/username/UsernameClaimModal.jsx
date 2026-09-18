import { useState, useEffect, useContext, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AtSign,
} from "lucide-react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";

export default function UsernameClaimModal() {
  const { user, updateUser } = useContext(AuthContext);
  const toast = useToast();

  const [isDismissed, setIsDismissed] = useState(false);
  const [stage, setStage] = useState("reveal"); // "reveal" | "custom"
  const [customHandle, setCustomHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived isOpen state based on user claim status
  const isOpen = Boolean(
    user && user.username && user.usernameClaimed === false && !isDismissed
  );

  // Live availability check state
  const [isChecking, setIsChecking] = useState(false);
  const [serverResult, setServerResult] = useState(null);
  const debounceTimerRef = useRef(null);
  const activeQueryRef = useRef("");

  // Keyboard accessibility: Escape key returns to Stage 1
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && stage === "custom") {
        setStage("reveal");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, stage]);

  const trimmed = customHandle.trim().toLowerCase();

  // Immediate synchronous client-side validation
  const clientValidationError = useMemo(() => {
    if (!trimmed) return null;
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
  }, [trimmed]);

  // Live availability debouncing (350ms) with race condition cancellation
  useEffect(() => {
    if (stage !== "custom" || !trimmed || clientValidationError) {
      return;
    }

    activeQueryRef.current = trimmed;
    const currentTarget = trimmed;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [trimmed, clientValidationError, stage]);

  const checkResult = clientValidationError
    ? { available: false, reason: clientValidationError }
    : serverResult;

  const handleClaim = async (chosenUsername) => {
    if (!chosenUsername) return;
    try {
      setIsSubmitting(true);
      const res = await api.post("/profile/username/claim", {
        username: chosenUsername,
      });

      const claimedUsername = res.data.user?.username || chosenUsername;

      // Update AuthContext immediately
      updateUser({
        username: claimedUsername,
        usernameClaimed: true,
      });

      toast.success(
        "Identity Confirmed!",
        `Welcome, @${claimedUsername}. Your username has been registered successfully.`
      );
      setIsDismissed(true);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Could not claim username. Please try another handle.";
      toast.error("Claim Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop with dark blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-modal-title"
          aria-describedby="claim-modal-desc"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-lg rounded-3xl bg-bg-card border border-border-default shadow-2xl overflow-hidden text-center z-10"
        >
          {/* Top ambient brand line and radial glow */}
          <div className="gradient-line-top" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 bg-brand-mint/15 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative p-6 sm:p-8 space-y-6">
            {/* Header Emblem */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-mint/10 border border-brand-mint/25 flex items-center justify-center text-brand-mint shadow-lg shadow-brand-mint/5">
              <Sparkles className="w-7 h-7" />
            </div>

            {stage === "reveal" ? (
              /* ── STAGE 1: Reveal Generated Username ── */
              <motion.div
                key="stage-reveal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-mint px-3 py-1 rounded-full bg-brand-mint/8 border border-brand-mint/20">
                    Official Identity
                  </span>
                  <h2
                    id="claim-modal-title"
                    className="mt-3 font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight"
                  >
                    Claim Your Zeitnah Identity
                  </h2>
                  <p
                    id="claim-modal-desc"
                    className="mt-2 text-xs sm:text-sm text-text-muted leading-relaxed max-w-md mx-auto"
                  >
                    We’ve reserved an official username for your student account. This will represent you across course discussions, certificates, and your public profile.
                  </p>
                </div>

                {/* Username Display Badge */}
                <div className="py-5 px-6 rounded-2xl bg-bg-elevated/70 border border-brand-mint/25 shadow-inner flex flex-col items-center justify-center gap-1">
                  <span className="text-[11px] font-medium text-text-faint tracking-wider uppercase">
                    Your Assigned Handle
                  </span>
                  <div className="flex items-center gap-1 text-2xl sm:text-3xl font-heading font-black text-brand-mint tracking-tight">
                    <span>@{user.username}</span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {user.name || "Student"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-text-secondary flex items-start gap-2.5 text-left">
                  <ShieldCheck className="w-4 h-4 text-brand-mint shrink-0 mt-0.5" />
                  <p>
                    Your username will be used as your public Zeitnah identity. You can customize it now or change it later in your profile.
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleClaim(user.username)}
                    className="w-full btn-primary py-3.5 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-mint/15"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Confirming Identity...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Use @{user.username}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setStage("custom");
                      setCustomHandle(user.username);
                    }}
                    className="w-full py-2.5 text-xs font-semibold text-text-muted hover:text-brand-mint transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Choose a different username</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ── STAGE 2: Choose Custom Username ── */
              <motion.div
                key="stage-custom"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStage("reveal")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Custom Handle
                  </span>
                </div>

                <div>
                  <h2 className="font-heading font-extrabold text-2xl text-white tracking-tight">
                    Select Your Username
                  </h2>
                  <p className="mt-1.5 text-xs text-text-muted">
                    3 to 20 lowercase letters, numbers, and underscores.
                  </p>
                </div>

                {/* Custom Input Field with @ icon */}
                <div className="space-y-2 text-left">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-mint">
                    Desired Username
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-text-muted pointer-events-none">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      aria-label="Desired username handle"
                      value={customHandle}
                      onChange={(e) =>
                        setCustomHandle(
                          e.target.value.toLowerCase().replace(/\s+/g, "_")
                        )
                      }
                      maxLength={20}
                      placeholder="your_handle"
                      className="w-full glass-input pl-10 pr-10 py-3 text-sm font-medium tracking-wide text-white"
                    />
                    <div className="absolute right-3">
                      {isChecking && (
                        <Loader2 className="w-4 h-4 text-brand-mint animate-spin" />
                      )}
                      {!isChecking && checkResult?.available && (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      )}
                      {!isChecking && checkResult && !checkResult.available && (
                        <XCircle className="w-4 h-4 text-danger" />
                      )}
                    </div>
                  </div>

                  {/* Feedback Message */}
                  <div className="min-h-[20px] text-xs">
                    {isChecking ? (
                      <span className="text-text-muted flex items-center gap-1">
                        Checking availability...
                      </span>
                    ) : checkResult?.available ? (
                      <span className="text-success font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        @{customHandle.trim().toLowerCase()} is available!
                      </span>
                    ) : checkResult ? (
                      <span className="text-danger font-medium flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        {checkResult.reason || "Username is unavailable."}
                      </span>
                    ) : (
                      <span className="text-text-muted text-[11px]">
                        Example: {user.username || "john_doe"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      isChecking ||
                      !checkResult?.available ||
                      !customHandle.trim()
                    }
                    onClick={() => handleClaim(customHandle.trim().toLowerCase())}
                    className="w-full btn-primary py-3.5 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Username...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm @{customHandle.trim().toLowerCase() || "username"}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStage("reveal")}
                    className="w-full py-2 text-xs font-semibold text-text-muted hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel & Return
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
