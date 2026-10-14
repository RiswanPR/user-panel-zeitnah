import { GraduationCap, Calendar, Plus, Pencil, Trash2, Award, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  sortEducationDescending,
  formatEducationDateRange,
  inferAcademicDegreeLevel,
  extractAcademicHonors,
} from "../../utils/educationAcademic";

export default function ProfileEducationSection({
  education = [],
  isOwner = false,
  onAdd,
  onEdit,
  onDelete,
  className = "",
}) {
  const items = sortEducationDescending(Array.isArray(education) ? education : []);

  return (
    <section
      id="education"
      aria-labelledby="profile-education-heading"
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shadow-inner">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="profile-education-heading"
                className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
              >
                Education & Academics
              </h2>
              {items.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80">
                  {items.length} {items.length === 1 ? "Qualification" : "Qualifications"}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Academic qualifications, technical diplomas, and professional learning.
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            {onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Education</span>
              </button>
            ) : (
              <Link
                to="/profile/edit?section=education"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow text-xs font-semibold transition-all cursor-pointer focus-ring"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Education</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto mb-3">
            <GraduationCap className="w-6 h-6 text-brand-mint/70" />
          </div>
          <h3 className="text-sm font-heading font-bold text-white mb-1">
            Build your academic profile
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            {isOwner
              ? "Add your degrees, diplomas, and qualifications to showcase your educational journey."
              : "This member has not published their education background."}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={onAdd || (() => {})}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-yellow text-[#070B14] hover:bg-brand-yellow/90 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Education</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((edu, index) => {
            const eduId = edu._id || edu.id || index;
            const levelInfo = inferAcademicDegreeLevel(edu.qualification, edu.fieldOfStudy);
            const honorsInfo = extractAcademicHonors(edu.description);
            const dateRange = formatEducationDateRange(
              edu.startDate,
              edu.endDate,
              edu.currentlyStudying
            );

            return (
              <div
                key={eduId}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] hover:border-brand-mint/30 p-5 sm:p-6 transition-all shadow-sm group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${levelInfo.badgeClass}`}>
                        {levelInfo.level}
                      </span>
                      {edu.currentlyStudying && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-yellow/10 border border-brand-yellow/25 text-[10px] font-bold text-brand-yellow uppercase tracking-wider">
                          In Progress
                        </span>
                      )}
                      {dateRange && (
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted font-mono">
                          <Calendar className="w-3.5 h-3.5 text-text-faint" />
                          <span>{dateRange}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-heading font-bold text-white tracking-tight">
                      {edu.qualification || edu.degree || "Degree / Qualification"}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-text-secondary font-medium">
                      <span className="text-white/90 font-semibold inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-brand-mint/80" />
                        {edu.institution || "Institution / University"}
                      </span>
                      {edu.fieldOfStudy && (
                        <>
                          <span className="text-white/20">•</span>
                          <span className="text-brand-mint/90">{edu.fieldOfStudy}</span>
                        </>
                      )}
                    </div>

                    {honorsInfo.grade && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 mt-1">
                        <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{honorsInfo.grade}</span>
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(edu)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Edit education"
                          aria-label={`Edit ${edu.qualification}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(eduId)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete education"
                          aria-label={`Delete ${edu.qualification}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {edu.description && (
                  <p className="mt-3 text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line border-t border-white/[0.05] pt-3">
                    {edu.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
