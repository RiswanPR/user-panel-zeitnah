import { Building2, CheckCircle2, MapPin, Globe, Users, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * OrganizationCard Component
 * Extra-premium directory card for infrastructure organizations, consultancies, and universities.
 */
export default function OrganizationCard({ org, organization }) {
  const shouldReduceMotion = useReducedMotion();
  const data = org || organization || {};
  const isVerified = data.verificationStatus === "VERIFIED";

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F14]/95 p-5 shadow-xl transition-all duration-300 hover:border-brand-mint/35 hover:shadow-[0_12px_36px_-10px_rgba(159,213,178,0.12)]"
    >
      {/* Top subtle highlight */}
      <div className="absolute top-0 inset-x-5 h-[1px] bg-gradient-to-r from-transparent via-brand-mint/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        <div className="flex items-start justify-between gap-3">
          {/* Logo container */}
          <div className="w-13 h-13 rounded-2xl bg-[#070B14] border border-white/[0.08] flex items-center justify-center text-brand-mint font-bold text-lg overflow-hidden shrink-0 group-hover:border-brand-mint/40 transition-colors">
            {data.logo ? (
              <img src={data.logo} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-6 h-6 text-brand-mint" aria-hidden="true" />
            )}
          </div>

          {/* Verification Badge */}
          {isVerified && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />
              <span>Verified Partner</span>
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-heading font-bold text-base text-white mt-3.5 line-clamp-1 group-hover:text-brand-mint transition-colors">
          {data.name}
        </h3>

        {/* Category & Industry */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-mint">
            {data.type?.replace(/_/g, " ") || "COMPANY"}
          </span>
          {data.industry && (
            <>
              <span className="text-text-faint">•</span>
              <span className="text-xs text-text-muted truncate">{data.industry}</span>
            </>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-text-muted mt-2.5 line-clamp-2 leading-relaxed font-medium">
          {data.description || "Partner enterprise offering student cohorts, industrial mentorship, and career paths."}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-3 truncate">
          {data.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-text-faint shrink-0" aria-hidden="true" />
              <span className="truncate">{data.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
            <Users className="w-3.5 h-3.5 text-text-faint shrink-0" aria-hidden="true" />
            <span>{data.memberCount || 1} members</span>
          </span>
        </div>

        {data.website && (
          <a
            href={data.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-brand-mint hover:underline font-semibold text-xs shrink-0 cursor-pointer focus-ring rounded"
          >
            <span>Website</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </motion.article>
  );
}
