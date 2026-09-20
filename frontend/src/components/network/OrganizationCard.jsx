import { Building2, CheckCircle2, MapPin, Globe, Users } from 'lucide-react';

export default function OrganizationCard({ org, organization }) {
  const data = org || organization || {};
  const isVerified = data.verificationStatus === 'VERIFIED';

  return (
    <div className="p-5 rounded-2xl bg-[#111115]/90 border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-brand-mint font-bold text-lg overflow-hidden shrink-0">
            {data.logo ? (
              <img src={data.logo} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-6 h-6 text-brand-mint" />
            )}
          </div>

          {isVerified && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified</span>
            </span>
          )}
        </div>

        <h3 className="font-heading font-bold text-base text-white mt-3 line-clamp-1">{data.name}</h3>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-mint">
            {data.type?.replace(/_/g, ' ') || 'Company'}
          </span>
          {data.industry && (
            <>
              <span className="text-text-faint">•</span>
              <span className="text-xs text-text-muted">{data.industry}</span>
            </>
          )}
        </div>

        <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed">
          {data.description || 'Institutional partner offering student career opportunities and industry mentorship.'}
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-3">
          {data.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-text-faint" />
              <span>{data.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-text-faint" />
            <span>{data.memberCount || 1} members</span>
          </span>
        </div>

        {data.website && (
          <a
            href={data.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-brand-mint hover:underline font-semibold"
          >
            <Globe className="w-3 h-3" />
            <span>Website</span>
          </a>
        )}
      </div>
    </div>
  );
}
