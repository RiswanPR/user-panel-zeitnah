import { Briefcase, Calendar, MapPin, Building, Plus, Pencil, Trash2, Tag, Layers } from "lucide-react";
import { Link } from "react-router-dom";

function formatExperienceDates(startDate, endDate, currentlyActive) {
  if (!startDate) return null;
  const start = new Date(startDate).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  let end = "Present";
  if (!currentlyActive && endDate) {
    end = new Date(endDate).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }

  // Calculate approximate duration
  const startDt = new Date(startDate);
  const endDt = currentlyActive || !endDate ? new Date() : new Date(endDate);
  const diffMonths =
    (endDt.getFullYear() - startDt.getFullYear()) * 12 +
    (endDt.getMonth() - startDt.getMonth());

  let durationStr = "";
  if (!isNaN(diffMonths) && diffMonths >= 0) {
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    if (years > 0 && months > 0) {
      durationStr = ` · ${years} yr ${months} mo`;
    } else if (years > 0) {
      durationStr = ` · ${years} yr${years > 1 ? "s" : ""}`;
    } else if (months > 0) {
      durationStr = ` · ${months} mo${months > 1 ? "s" : ""}`;
    } else {
      durationStr = " · < 1 mo";
    }
  }

  return `${start} — ${end}${durationStr}`;
}

export default function ProfileExperienceSection({
  experience = [],
  isOwner = false,
  onAdd,
  onEdit,
  onDelete,
  className = "",
}) {
  const items = Array.isArray(experience) ? experience : [];

  return (
    <section
      id="experience"
      aria-labelledby="profile-experience-heading"
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shadow-inner">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2
              id="profile-experience-heading"
              className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
            >
              Career Experience
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Infrastructure & engineering professional track record
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            {onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            ) : (
              <Link
                to="/profile/edit?section=experience"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold transition-all cursor-pointer focus-ring"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto mb-3">
            <Building className="w-6 h-6 text-text-faint" />
          </div>
          <h3 className="text-sm font-heading font-bold text-white mb-1">
            No career experience listed
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            {isOwner
              ? "Detail your current and past roles to showcase your engineering leadership, EPC deliverables, and sector expertise."
              : "This member has not published their career experience."}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={onAdd || (() => {})}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-[#070B14] hover:bg-brand-mint/90 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Role</span>
            </button>
          )}
        </div>
      ) : (
        <div className="relative pl-3 sm:pl-4 space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[17px] sm:before:left-[21px] before:w-[2px] before:bg-white/[0.08]">
          {items.map((exp, index) => {
            const expId = exp._id || exp.id || index;
            const dateRange = formatExperienceDates(
              exp.startDate,
              exp.endDate,
              exp.currentlyActive
            );

            return (
              <div
                key={expId}
                className="relative flex items-start gap-4 sm:gap-6 group"
              >
                {/* Timeline node icon */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-colors ${
                    exp.currentlyActive
                      ? "bg-[#070B14] border-brand-mint text-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.4)]"
                      : "bg-[#070B14] border-white/20 text-text-muted group-hover:border-white/40"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      exp.currentlyActive ? "bg-brand-mint animate-pulse" : "bg-white/40"
                    }`}
                  />
                </div>

                {/* Content Card */}
                <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] hover:border-white/[0.12] p-5 sm:p-6 transition-all shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-heading font-bold text-white tracking-tight">
                        {exp.role || "Role"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-text-secondary font-medium mt-0.5">
                        <span className="text-brand-mint font-semibold">
                          {exp.organization || "Organization"}
                        </span>
                        {exp.employmentType && (
                          <>
                            <span className="text-white/20">•</span>
                            <span className="text-text-muted">{exp.employmentType}</span>
                          </>
                        )}
                        {exp.currentlyActive && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-mint/10 border border-brand-mint/25 text-[10px] font-bold text-brand-mint uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(exp)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                            title="Edit experience"
                            aria-label={`Edit ${exp.role}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(expId)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete experience"
                            aria-label={`Delete ${exp.role}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Meta items: Dates, Location, Sector */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted mb-3 font-mono">
                    {dateRange && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-text-faint" />
                        <span>{dateRange}</span>
                      </span>
                    )}
                    {exp.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-text-faint" />
                        <span>{exp.location}</span>
                      </span>
                    )}
                    {exp.infrastructureSector && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-text-secondary">
                        <Layers className="w-3 h-3 text-brand-mint" />
                        <span>{exp.infrastructureSector}</span>
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {exp.description && (
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line mb-3">
                      {exp.description}
                    </p>
                  )}

                  {/* Skills & Software Tags */}
                  {((exp.skillsUsed && exp.skillsUsed.length > 0) ||
                    (exp.softwareUsed && exp.softwareUsed.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.05]">
                      {exp.skillsUsed?.map((sk, sIdx) => (
                        <span
                          key={`sk-${sIdx}`}
                          className="px-2 py-0.5 rounded-lg bg-brand-mint/5 border border-brand-mint/20 text-[11px] font-mono text-brand-mint font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                      {exp.softwareUsed?.map((sw, wIdx) => (
                        <span
                          key={`sw-${wIdx}`}
                          className="px-2 py-0.5 rounded-lg bg-brand-yellow/5 border border-brand-yellow/20 text-[11px] font-mono text-brand-yellow font-medium"
                        >
                          {sw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
