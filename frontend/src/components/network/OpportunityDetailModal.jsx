import { X, Building2, MapPin, CheckCircle2, Briefcase, Calendar, Globe } from "lucide-react";

export default function OpportunityDetailModal({ opportunity, onClose }) {
  if (!opportunity) return null;

  const org = opportunity.organization;
  const isVerified = org?.verificationStatus === "VERIFIED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-surface border border-white/10 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4 pr-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-mint/10 text-mint border border-mint/20">
              {opportunity.type?.replace(/_/g, " ")}
            </span>
            <span className="text-xs font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              {opportunity.workMode}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">{opportunity.title}</h2>

          {org && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Building2 className="h-4 w-4 text-mint" />
              <span className="font-medium text-white">{org.name}</span>
              {isVerified && <CheckCircle2 className="h-4 w-4 text-mint shrink-0" />}
              {opportunity.location && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{opportunity.location}</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-sm text-text-secondary leading-relaxed">
          {/* About Opportunity */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
              About this Opportunity
            </h4>
            <p className="whitespace-pre-line text-xs sm:text-sm">{opportunity.description || "No description provided."}</p>
          </div>

          {/* Required Skills */}
          {opportunity.skills && opportunity.skills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
                Demonstrated Skills Required
              </h4>
              <div className="flex flex-wrap gap-2">
                {opportunity.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 rounded-lg bg-surface border border-white/10 text-white font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Organization Details */}
          {org && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  About {org.name}
                </span>
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-mint hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    <span>Visit Website</span>
                  </a>
                )}
              </div>
              <p className="text-xs text-text-muted">{org.description || `${org.name} is registered on the Zeitnah ecosystem.`}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Published: {opportunity.publishedAt ? new Date(opportunity.publishedAt).toLocaleDateString() : "Recently"}
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-mint text-dark font-semibold text-xs hover:bg-mint/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
