import { Briefcase, Calendar, MapPin, Building, Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import {
  sortExperienceDescending,
  formatExperienceDateRange,
  isExperienceOngoing,
} from "../../utils/experienceTimeline";
import ExperienceSummaryCard from "./ExperienceSummaryCard";

export default function ProfileExperienceSection({
  experience = [],
  isOwner = false,
  onAdd,
  onEdit,
  onDelete,
  className = "",
}) {
  const rawItems = Array.isArray(experience) ? experience : [];
  const sortedItems = sortExperienceDescending(rawItems);

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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            ) : (
              <Link
                to="/profile/edit?section=experience"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-mint/30 bg-brand-mint/10 hover:bg-brand-mint/20 text-brand-mint text-xs font-semibold transition-all cursor-pointer focus-ring min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {sortedItems.length === 0 ? (
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
            onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-[#070B14] hover:bg-brand-mint/90 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Role</span>
              </button>
            ) : (
              <Link
                to="/profile/edit?section=experience"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-mint text-[#070B14] hover:bg-brand-mint/90 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Role</span>
              </Link>
            )
          )}
        </div>
      ) : (
        <>
          <ExperienceSummaryCard experience={rawItems} className="mb-6" />
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-brand-mint/50 before:via-white/[0.08] before:to-transparent">
            {sortedItems.map((exp, index) => {
            const expId = exp.id || exp._id || index;
            const isOngoing = isExperienceOngoing(exp);
            const dateRange = formatExperienceDateRange(
              exp.startDate,
              exp.endDate,
              exp.currentlyActive
            );

            return (
              <div
                key={expId}
                className="relative group"
              >
                {/* Timeline node marker */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isOngoing
                      ? "bg-[#070B14] border-brand-mint text-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.35)]"
                      : "bg-[#070B14] border-white/20 text-text-muted group-hover:border-white/40"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOngoing ? "bg-brand-mint animate-pulse" : "bg-white/40 group-hover:bg-white/70"
                    }`}
                  />
                </div>

                {/* Content Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-mint/30 hover:bg-white/[0.035] transition-all shadow-sm flex flex-col justify-between gap-3.5">
                  {/* Top row: 1. Job Title & 7. Edit/Delete actions */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      {/* 1. Job Title — Strongest text emphasis */}
                      <h3 className="text-base sm:text-lg font-heading font-black text-white tracking-tight leading-snug">
                        {exp.role || "Untitled Position"}
                      </h3>
                      {/* 2. Company Name & Location */}
                      <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-text-secondary font-medium">
                        <span className="text-brand-mint font-bold">
                          {exp.organization || "Organization"}
                        </span>
                        {exp.location && (
                          <>
                            <span className="text-white/20">•</span>
                            <span className="inline-flex items-center gap-1 text-text-muted">
                              <MapPin className="w-3.5 h-3.5 text-text-faint" />
                              <span>{exp.location}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 7. Edit and delete actions with accessible labels */}
                    {isOwner && (onEdit || onDelete) && (
                      <div className="flex items-center gap-1 shrink-0 opacity-90 sm:opacity-75 sm:group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(exp)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title={`Edit ${exp.role || "experience"}`}
                            aria-label={`Edit ${exp.role || "experience"} at ${exp.organization || "organization"}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(expId)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title={`Delete ${exp.role || "experience"}`}
                            aria-label={`Delete ${exp.role || "experience"} at ${exp.organization || "organization"}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3 & 4. Dates, Ongoing Badge, Employment Type, and AEC Sector */}
                  <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                    {dateRange && (
                      <span className="inline-flex items-center gap-1.5 text-text-muted font-medium">
                        <Calendar className="w-3.5 h-3.5 text-text-faint" />
                        <span>{dateRange}</span>
                      </span>
                    )}
                    {isOngoing && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-mint/15 border border-brand-mint/30 text-[10px] font-bold text-brand-mint uppercase tracking-wider">
                        Active Role
                      </span>
                    )}
                    {exp.employmentType && (
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-text-muted font-bold text-[11px] border border-white/[0.06]">
                        {exp.employmentType}
                      </span>
                    )}
                    {exp.infrastructureSector && (
                      <span className="px-2.5 py-0.5 rounded-md bg-brand-mint/10 text-brand-mint border border-brand-mint/20 font-semibold text-[11px] flex items-center gap-1">
                        <Layers className="w-3 h-3 text-brand-mint" />
                        <span>{exp.infrastructureSector}</span>
                      </span>
                    )}
                  </div>

                  {/* 5. Description with readable line length and spacing */}
                  {exp.description && (
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line max-w-3xl pt-0.5">
                      {exp.description}
                    </p>
                  )}

                  {/* 6. Relevant skills & software as compact chips */}
                  {((exp.softwareUsed && exp.softwareUsed.length > 0) ||
                    (exp.skillsUsed && exp.skillsUsed.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.05]">
                      {exp.softwareUsed?.map((sw, swIdx) => (
                        <span
                          key={`sw-${swIdx}`}
                          className="px-2 py-0.5 rounded-md bg-brand-mint/10 border border-brand-mint/20 text-[11px] font-mono text-brand-mint font-medium"
                        >
                          {sw}
                        </span>
                      ))}
                      {exp.skillsUsed?.map((sk, skIdx) => (
                        <span
                          key={`sk-${skIdx}`}
                          className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-text-secondary font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}
    </section>
  );
}
