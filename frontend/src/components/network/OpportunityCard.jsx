import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  MapPin,
  CheckCircle2,
  X,
  Building2,
  Briefcase,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "../ui/Toast";

/**
 * OpportunityCard Component
 * Extra-premium career discovery card for civil/infrastructure opportunities.
 * Replaces native alert() with branded toast notifications.
 */
export default function OpportunityCard({ opp, opportunity, onSelect }) {
  const shouldReduceMotion = useReducedMotion();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const toast = useToast();

  const data = opp || opportunity || {};
  const org = data.organizationId || data.organization || {};
  const isVerified = org.verificationStatus === "VERIFIED";

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const handleOpen = () => {
    if (onSelect) {
      onSelect(data);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setIsModalOpen(false);
      toast.success(
        "Application Submitted",
        `Your verified profile and portfolio credentials have been shared with ${org.name || "the recruiter"}.`
      );
    }, 600);
  };

  return (
    <>
      <motion.article
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={shouldReduceMotion ? undefined : { y: -3 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/95 p-5 shadow-xl transition-all duration-300 hover:border-brand-mint/35 hover:shadow-[0_12px_36px_-10px_rgba(159,213,178,0.12)]"
      >
        {/* Top subtle highlight */}
        <div className="absolute top-0 inset-x-5 h-[1px] bg-gradient-to-r from-transparent via-[#F6ED4A]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div>
          {/* Header Pills: Opportunity Type & Work Mode */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
              {data.type?.replace(/_/g, " ") || "OPPORTUNITY"}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white/[0.04] text-text-muted border border-white/[0.06]">
                {data.workMode || "Remote"}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white/[0.04] text-text-muted border border-white/[0.06]">
                {data.experienceLevel || "Entry"}
              </span>
            </div>
          </div>

          {/* Role Title */}
          <h3 className="font-heading font-bold text-base text-white mt-3 line-clamp-1 group-hover:text-brand-mint transition-colors">
            {data.title}
          </h3>

          {/* Organization Name + Verified Badge */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <Building2 className="w-3.5 h-3.5 text-brand-mint/80 shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold text-text-secondary truncate">
              {org.name || "Partner Organization"}
            </span>
            {isVerified && (
              <span title="Verified Enterprise" aria-label="Verified Enterprise">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </span>
            )}
          </div>

          {/* Description Snippet */}
          <p className="text-xs text-text-muted mt-2.5 line-clamp-2 leading-relaxed font-medium">
            {data.description || "Career opportunity within the Zeitnah civil & infrastructure partner ecosystem."}
          </p>

          {/* Skills Required Chips */}
          {data.skills && data.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3.5" aria-label="Required skills">
              {data.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-white/[0.03] text-text-muted border border-white/[0.06] group-hover:border-white/[0.12] transition-colors"
                >
                  {skill}
                </span>
              ))}
              {data.skills.length > 3 && (
                <span className="text-[10px] px-1 text-text-faint font-mono self-center">
                  +{data.skills.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Area: Location & View Details CTA */}
        <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-text-muted truncate mr-2">
            <MapPin className="w-3.5 h-3.5 text-text-faint shrink-0" aria-hidden="true" />
            <span className="truncate">{data.location || "Remote / Pan-Regional"}</span>
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-brand-mint text-white hover:text-black font-semibold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0 focus-ring"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </motion.article>

      {/* Accessible Details Modal (No Native Alerts) */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="opportunity-detail-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl rounded-3xl bg-[#0A0F14] border border-white/[0.1] shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
                    {data.type?.replace(/_/g, " ") || "OPPORTUNITY"}
                  </span>
                  <h2 id="opportunity-detail-title" className="font-heading font-extrabold text-xl text-white mt-1">
                    {data.title}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                    <span className="font-semibold text-white/90">{org.name}</span>
                    {isVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-label="Verified" />
                    )}
                    <span>•</span>
                    <span>{data.location || "Remote"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close modal"
                  className="p-1.5 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="my-5 overflow-y-auto space-y-4 pr-1 text-sm text-text-secondary no-scrollbar">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                    Position Overview
                  </h3>
                  <p className="leading-relaxed whitespace-pre-line text-xs sm:text-sm text-white/80 font-medium">
                    {data.description || "Exciting opportunity within infrastructure engineering and design."}
                  </p>
                </div>

                {data.skills && data.skills.length > 0 && (
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                      Required Competencies & Tools
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-xs px-2.5 py-1 rounded-xl bg-white/[0.04] text-white/90 border border-white/[0.08]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                      Work Mode
                    </span>
                    <span className="text-xs font-semibold text-white mt-1 block">
                      {data.workMode || "Remote"}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                      Experience Requirement
                    </span>
                    <span className="text-xs font-semibold text-white mt-1 block">
                      {data.experienceLevel || "Entry"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">
                  Posted {data.publishedAt || data.createdAt ? new Date(data.publishedAt || data.createdAt).toLocaleDateString() : "Recently"}
                </span>

                <button
                  type="button"
                  disabled={isApplying}
                  onClick={handleApply}
                  className="px-5 py-2.5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 text-black font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-brand-mint/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isApplying ? "Submitting..." : "Apply with Zeitnah Profile"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
