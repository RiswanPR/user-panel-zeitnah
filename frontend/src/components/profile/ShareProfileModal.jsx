import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Share2, X, ExternalLink, AtSign } from "lucide-react";
import { useToast } from "../ui/Toast";

export default function ShareProfileModal({ isOpen, onClose, username, name }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const publicUrl = `${window.location.origin}/u/${username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link Copied", "Profile link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Copy Failed", "Please manually copy the URL.");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name || "Student"} on Zeitnah Academy`,
          text: `Check out ${name || "this student"}'s profile on Zeitnah Academy (@${username}):`,
          url: publicUrl,
        });
      } catch (err) {
        // Share cancelled or failed, fallback to copy
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
          className="relative w-full max-w-md rounded-2xl bg-bg-card border border-border-default shadow-2xl p-6 z-10 space-y-6"
        >
          <div className="gradient-line-top" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
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
              href={`/u/${username}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-text-muted hover:text-brand-mint flex items-center gap-1 p-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
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
                className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 shrink-0"
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
            className="w-full btn-primary py-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share With Others
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
