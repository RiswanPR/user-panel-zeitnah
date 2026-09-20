import { Building2, MapPin, Globe, CheckCircle2, Users } from "lucide-react";

export default function OrganizationCard({ organization }) {
  const isVerified = organization.verificationStatus === "VERIFIED";

  return (
    <div className="group relative rounded-2xl bg-surface border border-white/5 p-5 hover:border-mint/30 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 text-mint font-bold text-lg">
            {organization.logo ? (
              <img
                src={organization.logo}
                alt={organization.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-6 w-6 text-mint" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-mint transition-colors">
                {organization.name}
              </h3>
              {isVerified && (
                <CheckCircle2
                  className="h-4 w-4 text-mint shrink-0"
                  title="Verified Organization"
                />
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium text-purple-300 uppercase tracking-wider">
                {organization.type?.replace(/_/g, " ")}
              </span>
              {organization.industry && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-[11px] text-text-muted truncate">
                    {organization.industry}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {organization.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-4 leading-relaxed">
            {organization.description}
          </p>
        )}
      </div>

      {/* Meta Footer */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-3">
          {organization.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-text-muted" />
              <span>{organization.location}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 text-text-muted" />
            <span>{organization.memberCount || 1} members</span>
          </span>
        </div>

        {organization.website && (
          <a
            href={organization.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-mint hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="h-3 w-3" />
            <span>Site</span>
          </a>
        )}
      </div>
    </div>
  );
}
