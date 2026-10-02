import { User, MapPin, Briefcase, Building, Globe, Layers, Pencil, Compass, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProfileAboutSection({
  profile = {},
  isOwner = false,
  className = "",
}) {
  const bio = profile.bio;
  const primaryDiscipline = profile.primaryDiscipline;
  const specializations = Array.isArray(profile.specializations) ? profile.specializations : [];
  const sectors = Array.isArray(profile.infrastructureSectors) ? profile.infrastructureSectors : [];
  const location = profile.location;
  const yearsExp = profile.yearsOfExperience;
  const currentRole = profile.currentRole;
  const industry = profile.industry;

  const hasAnyMetadata =
    Boolean(bio) ||
    Boolean(primaryDiscipline) ||
    specializations.length > 0 ||
    sectors.length > 0 ||
    Boolean(location) ||
    Boolean(currentRole);

  return (
    <section
      id="about"
      aria-labelledby="profile-about-heading"
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shadow-inner">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2
              id="profile-about-heading"
              className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
            >
              Professional Story
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Biography, infrastructure discipline, specializations & engineering vision
            </p>
          </div>
        </div>

        {isOwner && (
          <Link
            to="/profile/edit?section=basic-info"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5 text-brand-mint" />
            <span>Edit Bio</span>
          </Link>
        )}
      </div>

      {!hasAnyMetadata ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto mb-3">
            <Compass className="w-6 h-6 text-text-faint" />
          </div>
          <h3 className="text-sm font-heading font-bold text-white mb-1">
            No bio or story provided yet
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            {isOwner
              ? "Tell the Zeitnah community about your engineering background, project focus, and infrastructure achievements."
              : "This member has not written their professional biography yet."}
          </p>
          {isOwner && (
            <Link
              to="/profile/edit?section=basic-info"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-[#070B14] hover:bg-brand-mint/90 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Write Your Bio</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Biography Narrative */}
          {bio ? (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-line font-normal">
                {bio}
              </p>
            </div>
          ) : (
            <p className="text-xs italic text-text-muted">
              {isOwner ? "No detailed biography written yet. Click 'Edit Bio' to add your story." : ""}
            </p>
          )}

          {/* Key Facts & Metadata Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4 border-t border-white/[0.06]">
            {primaryDiscipline && (
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Primary Discipline
                </p>
                <p className="text-sm font-bold text-white mt-1">
                  {primaryDiscipline}
                </p>
              </div>
            )}

            {yearsExp > 0 && (
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Professional Experience
                </p>
                <p className="text-sm font-bold text-brand-mint mt-1">
                  {yearsExp}+ Years in Industry
                </p>
              </div>
            )}

            {location && (
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Base Location
                </p>
                <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-mint shrink-0" />
                  <span className="truncate">{location}</span>
                </p>
              </div>
            )}
          </div>

          {/* Sectors and Specializations Tags */}
          {(sectors.length > 0 || specializations.length > 0) && (
            <div className="space-y-3 pt-2">
              {sectors.length > 0 && (
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-2">
                    Infrastructure Sector Focus
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {sectors.map((sec, idx) => (
                      <span
                        key={`sec-${idx}`}
                        className="px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono font-medium text-white/90"
                      >
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {specializations.length > 0 && (
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-2">
                    Key Engineering Specializations
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {specializations.map((spec, idx) => (
                      <span
                        key={`sp-${idx}`}
                        className="px-2.5 py-1 rounded-xl bg-brand-mint/10 border border-brand-mint/25 text-xs font-mono font-medium text-brand-mint"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
