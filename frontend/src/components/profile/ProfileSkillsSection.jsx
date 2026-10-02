import { Code2, Cpu, Building, Award, Plus, Layers, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProfileSkillsSection({
  skills = [],
  structuredSkills = null,
  isOwner = false,
  className = "",
}) {
  const flat = Array.isArray(skills) ? skills : [];
  const structured = structuredSkills || {};

  const technical = structured.technical || [];
  const software = structured.software || [];
  const industry = structured.industry || [];
  const professional = structured.professional || [];

  const hasStructured =
    technical.length > 0 ||
    software.length > 0 ||
    industry.length > 0 ||
    professional.length > 0;

  const totalCount = hasStructured
    ? technical.length + software.length + industry.length + professional.length
    : flat.length;

  return (
    <section
      id="skills"
      aria-labelledby="profile-skills-heading"
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="profile-skills-heading"
                className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
              >
                Skills & Technical Competencies
              </h2>
              {totalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-xs font-mono font-medium text-text-muted">
                  {totalCount}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Engineering software, BIM workflows, calculations & domain competencies
            </p>
          </div>
        </div>

        {isOwner && (
          <Link
            to="/profile/edit?section=skills"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Skills</span>
          </Link>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto mb-3">
            <Code2 className="w-6 h-6 text-text-faint" />
          </div>
          <h3 className="text-sm font-heading font-bold text-white mb-1">
            No technical skills cataloged
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            {isOwner
              ? "Catalog your civil engineering proficiencies, BIM software, and project tools to boost your talent discovery score."
              : "This member has not listed their technical skills."}
          </p>
          {isOwner && (
            <Link
              to="/profile/edit?section=skills"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-400 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Competencies</span>
            </Link>
          )}
        </div>
      ) : hasStructured ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Engineering Software & BIM */}
          {software.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand-yellow">
                <Cpu className="w-4 h-4" />
                <span>BIM & Engineering Software</span>
                <span className="ml-auto text-[10px] text-text-muted font-normal">
                  {software.length} tools
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {software.map((sw, idx) => (
                  <span
                    key={`sw-${idx}`}
                    className="px-2.5 py-1 rounded-xl bg-brand-yellow/10 border border-brand-yellow/25 text-xs font-mono font-medium text-brand-yellow/90 hover:border-brand-yellow/50 transition-colors"
                  >
                    {sw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Technical Disciplines */}
          {technical.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand-mint">
                <Code2 className="w-4 h-4" />
                <span>Technical & Design Methods</span>
                <span className="ml-auto text-[10px] text-text-muted font-normal">
                  {technical.length} skills
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {technical.map((tk, idx) => (
                  <span
                    key={`tk-${idx}`}
                    className="px-2.5 py-1 rounded-xl bg-brand-mint/10 border border-brand-mint/25 text-xs font-mono font-medium text-brand-mint/90 hover:border-brand-mint/50 transition-colors"
                  >
                    {tk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Industry Sectors */}
          {industry.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                <Building className="w-4 h-4" />
                <span>Industry & Infrastructure Sectors</span>
                <span className="ml-auto text-[10px] text-text-muted font-normal">
                  {industry.length} sectors
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {industry.map((ind, idx) => (
                  <span
                    key={`ind-${idx}`}
                    className="px-2.5 py-1 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs font-mono font-medium text-sky-300 hover:border-sky-400 transition-colors"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Professional Management */}
          {professional.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                <Award className="w-4 h-4" />
                <span>Management & Leadership</span>
                <span className="ml-auto text-[10px] text-text-muted font-normal">
                  {professional.length} skills
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {professional.map((pm, idx) => (
                  <span
                    key={`pm-${idx}`}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono font-medium text-emerald-300 hover:border-emerald-400 transition-colors"
                  >
                    {pm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {flat.map((skill, idx) => (
            <span
              key={`fl-${idx}`}
              className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-brand-mint/30 text-xs sm:text-sm font-medium text-white/90 transition-colors"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
