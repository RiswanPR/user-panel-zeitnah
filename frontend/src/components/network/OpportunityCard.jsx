import { useState } from 'react';
import { MapPin, CheckCircle2, X, Building2 } from 'lucide-react';

export default function OpportunityCard({ opp, opportunity, onSelect }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const data = opp || opportunity || {};
  const org = data.organizationId || data.organization || {};
  const isVerified = org.verificationStatus === 'VERIFIED';

  const handleOpen = () => {
    if (onSelect) {
      onSelect(data);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="p-5 rounded-2xl bg-[#111115]/90 border border-white/[0.08] hover:border-brand-mint/30 transition-all flex flex-col justify-between">
        <div>
          {/* Header pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
              {data.type?.replace(/_/g, ' ') || 'Opportunity'}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/[0.04] text-text-muted border border-white/[0.06]">
                {data.workMode || 'Remote'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/[0.04] text-text-muted border border-white/[0.06]">
                {data.experienceLevel || 'Entry'}
              </span>
            </div>
          </div>

          {/* Title & Organization */}
          <h3 className="font-heading font-bold text-base text-white mt-3 line-clamp-1">
            {data.title}
          </h3>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium text-text-muted flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-brand-mint" />
              <span>{org.name || 'Partner Organization'}</span>
            </span>
            {isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
          </div>

          <p className="text-xs text-text-muted mt-2.5 line-clamp-2 leading-relaxed">
            {data.description || 'Exciting career opportunity for Zeitnah students and graduates.'}
          </p>

          {/* Skills */}
          {data.skills && data.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {data.skills.slice(0, 3).map((skill) => (
                <span key={skill} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-text-muted border border-white/[0.04]">
                  {skill}
                </span>
              ))}
              {data.skills.length > 3 && (
                <span className="text-[10px] px-1 text-text-faint">
                  +{data.skills.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-text-muted">
            <MapPin className="w-3 h-3 text-text-faint" />
            <span>{data.location || 'Remote'}</span>
          </div>

          <button
            onClick={handleOpen}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-brand-mint text-text-secondary hover:text-black font-semibold text-xs transition-all cursor-pointer"
          >
            View Details
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#111115] border border-white/[0.08] shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.06]">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
                  {data.type}
                </span>
                <h2 className="font-heading font-bold text-xl text-white mt-2">{data.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">{org.name}</span>
                  {isVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="text-text-faint">•</span>
                  <span className="text-xs text-text-muted">{data.location || 'Remote'}</span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 overflow-y-auto space-y-4 pr-1 text-sm text-text-secondary">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-1.5">Overview</h4>
                <p className="leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                  {data.description}
                </p>
              </div>

              {data.skills && data.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-1.5">Required Competencies</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((skill) => (
                      <span key={skill} className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] text-white/90 border border-white/[0.06]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block">Work Mode</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">{data.workMode || 'Remote'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block">Experience Level</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">{data.experienceLevel || 'Entry'}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-text-muted">
                Posted {new Date(data.publishedAt || data.createdAt || Date.now()).toLocaleDateString()}
              </span>

              <button
                onClick={() => {
                  alert('Application submitted! Organization recruiters have received your profile credentials.');
                  setIsModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-mint/20 transition-all cursor-pointer"
              >
                Apply with Zeitnah Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
