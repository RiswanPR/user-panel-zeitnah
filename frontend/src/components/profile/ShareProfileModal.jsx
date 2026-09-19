import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Share2, X, ExternalLink, AtSign } from "lucide-react";
import { useToast } from "../ui/Toast";

export default function ShareProfileModal({ isOpen, onClose, username, name, profile }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // Background scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveUsername = username || profile?.username || "";
  const effectiveName = name || profile?.name || "Student";
  const publicUrl = `${window.location.origin}/u/${encodeURIComponent(effectiveUsername)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Profile link copied", "Public profile URL copied to clipboard.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Copy Failed", "Please manually copy the URL.");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${effectiveName} on Zeitnah Academy`,
          text: `Check out ${effectiveName}'s student profile on Zeitnah Academy (@${effectiveUsername}):`,
          url: publicUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md rounded-2xl bg-bg-card border border-border-default shadow-2xl p-6 z-10 space-y-6 max-h-[90dvh] overflow-y-auto overscroll-contain"
        >
          <div className="gradient-line-top" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="mx-auto w-12 h-12 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint mb-3">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-extrabold text-xl text-white">
              Share Profile
            </h3>
            <p className="text-xs text-text-muted">
              Share your verified student credentials and learning achievements.
            </p>
          </div>

          {/* Handle Preview */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated/70 border border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-mint/15 border border-brand-mint/20 flex items-center justify-center text-brand-mint font-bold text-xs">
                <AtSign className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">{name || "Student"}</p>
                <p className="text-[11px] font-mono text-brand-mint">@{username}</p>
              </div>
            </div>
            <a
              href={`/u/${effectiveUsername}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-text-muted hover:text-brand-mint min-w-[44px] min-h-[44px] flex items-center justify-center p-1 rounded-lg hover:bg-white/[0.04]"
              aria-label="Open public profile in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* URL Copy input */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Public Profile URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="glass-input flex-1 px-3 py-2 text-xs font-mono text-text-secondary bg-black/30 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn-secondary py-2.5 px-3.5 min-h-[40px] text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span className="text-success">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Share Action */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full btn-primary py-3 min-h-[44px] text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Share2 className="w-4 h-4" />
            Share With Others
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
