import { Users, ArrowRight, ShieldCheck, Lock, Unlock, Boxes } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

/**
 * LearningSpaceCard Component
 * Extra-premium ecosystem cohort card for courses, batches, and academic departments.
 */
export default function LearningSpaceCard({ space }) {
  const shouldReduceMotion = useReducedMotion();
  const isRestricted = space.accessMode === "restricted" || space.accessMode === "invite_only";
  const teachers = space.teachers || [];

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative rounded-2xl bg-[#0A0F14]/95 border border-white/[0.08] hover:border-brand-mint/40 shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_12px_36px_-10px_rgba(159,213,178,0.12)]"
    >
      {/* ── Top Visual Banner ── */}
      <div className="h-32 relative bg-gradient-to-br from-[#12314C]/70 via-[#070B14] to-[#0A101D] overflow-hidden">
        {space.coverImage ? (
          <img
            src={space.coverImage}
            alt={space.name}
            className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-tech-grid opacity-40" />
        )}

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-mint/30 to-transparent" />

        {/* Category & Space Code Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md border border-white/10 text-brand-mint">
            {space.category || "BATCH"}
          </span>
          {space.code && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-black/70 backdrop-blur-md border border-white/10 text-white/90">
              {space.code}
            </span>
          )}
        </div>

        {/* Access Mode Pill */}
        <div className="absolute top-3 right-3">
          {isRestricted ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              <Lock className="w-3 h-3" />
              <span>Restricted</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              <Unlock className="w-3 h-3" />
              <span>Open Space</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-heading font-bold text-base sm:text-lg text-white group-hover:text-brand-mint transition-colors line-clamp-1">
            {space.name}
          </h3>

          <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed font-medium">
            {space.description ||
              "Infrastructure cohort collaboration space for technical coursework, faculty discussions, and academic peer support."}
          </p>

          {/* Hashtags / Domain Tags */}
          {space.tags && space.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3.5" aria-label="Space topics">
              {space.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.03] text-text-muted border border-white/[0.04]"
                >
                  #{tag}
                </span>
              ))}
              {space.tags.length > 3 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 text-text-faint self-center">
                  +{space.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
          {/* Teachers / Mentors Avatars */}
          <div className="flex items-center gap-2">
            {teachers.length > 0 ? (
              <div className="flex -space-x-2 overflow-hidden">
                {teachers.slice(0, 3).map((t, i) => (
                  <div
                    key={t._id || i}
                    className="w-7 h-7 rounded-full bg-[#070B14] border-2 border-[#0A0F14] flex items-center justify-center text-[10px] font-bold text-brand-mint overflow-hidden shadow-sm"
                    title={t.name || "Faculty Mentor"}
                  >
                    {t.avatar || t.profileImage ? (
                      <img
                        src={t.avatar || t.profileImage}
                        alt={t.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{(t.name || "F")[0]}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-text-muted font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-mint/70" />
                <span>Faculty Led</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-text-muted ml-2 font-mono">
              <Users className="w-3.5 h-3.5 text-text-faint" />
              <span>{space.memberCount || 0}</span>
            </div>
          </div>

          {/* Action Link */}
          <Link
            to={`/network/spaces/${space.code || space._id}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-mint/10 hover:bg-brand-mint text-brand-mint hover:text-black font-semibold text-xs transition-all duration-200 cursor-pointer focus-ring"
          >
            <span>{space.isMember ? "Enter Space" : "View Space"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
