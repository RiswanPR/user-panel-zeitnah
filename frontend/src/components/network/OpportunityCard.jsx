import { Briefcase, MapPin, Building2, CheckCircle2, ArrowRight } from "lucide-react";

export default function OpportunityCard({ opportunity, onSelect }) {
  const org = opportunity.organization;
  const isVerified = org?.verificationStatus === "VERIFIED";

  return (
    <div className="group relative rounded-2xl bg-surface border border-white/5 p-5 hover:border-mint/30 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Type & Work Mode Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-mint/10 text-mint border border-mint/20">
            {opportunity.type?.replace(/_/g, " ")}
          </span>
          <span className="text-[11px] font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
            {opportunity.workMode}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-white group-hover:text-mint transition-colors mb-1.5">
          {opportunity.title}
        </h3>

        {/* Organization Name & Location */}
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3.5">
          {org && (
            <span className="inline-flex items-center gap-1 font-medium text-text-secondary">
              <Building2 className="h-3.5 w-3.5 text-mint" />
              <span>{org.name}</span>
              {isVerified && <CheckCircle2 className="h-3 w-3 text-mint shrink-0" />}
            </span>
          )}
          {opportunity.location && (
            <>
              <span className="text-white/20">•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{opportunity.location}</span>
              </span>
            </>
          )}
        </div>

        {/* Description snippet */}
        {opportunity.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-4 leading-relaxed">
            {opportunity.description}
          </p>
        )}

        {/* Skills Chips */}
        {opportunity.skills && opportunity.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {opportunity.skills.slice(0, 4).map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-text-secondary border border-white/5"
              >
                {skill}
              </span>
            ))}
            {opportunity.skills.length > 4 && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-text-muted">
                +{opportunity.skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[11px] text-text-muted">
          Level: <span className="text-white font-medium capitalize">{opportunity.experienceLevel?.toLowerCase()}</span>
        </span>

        <button
          onClick={() => onSelect(opportunity)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint hover:text-white transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
