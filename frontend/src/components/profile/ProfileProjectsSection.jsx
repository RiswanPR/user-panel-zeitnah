import { Hammer, ExternalLink, Calendar, Plus, Layers, Image as ImageIcon, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { getUploadUrl } from "../../utils/courseUi";

export default function ProfileProjectsSection({
  projects = [],
  isOwner = false,
  onAdd,
  className = "",
}) {
  const items = Array.isArray(projects) ? projects : [];

  return (
    <section
      id="projects"
      aria-labelledby="profile-projects-heading"
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow shadow-inner">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="profile-projects-heading"
                className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
              >
                Featured Projects & Deliverables
              </h2>
              {items.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-xs font-mono font-medium text-text-muted">
                  {items.length}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Verified infrastructure blueprints, site execution & engineering deliverables
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
                <span>Add Project</span>
              </button>
            ) : (
              <Link
                to="/profile/edit?section=projects"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow text-xs font-semibold transition-all cursor-pointer focus-ring"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Project</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto mb-3">
            <Hammer className="w-6 h-6 text-text-faint" />
          </div>
          <h3 className="text-sm font-heading font-bold text-white mb-1">
            No projects featured yet
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            {isOwner
              ? "Publish your bridge designs, BIM models, EPC milestones, or academic capstones to showcase proof of work."
              : "This member has not published any project case studies."}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={onAdd || (() => {})}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-yellow text-[#070B14] hover:bg-brand-yellow/90 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Feature Your First Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {items.map((proj, idx) => {
            const projId = proj._id || proj.id || idx;
            const coverImage = proj.thumbnailUrl || (proj.media && proj.media[0]?.url);
            const resolvedCover = coverImage ? getUploadUrl(coverImage) : null;

            return (
              <div
                key={projId}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-brand-yellow/30 transition-all p-5 flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Optional Media Preview Thumbnail */}
                  {resolvedCover && (
                    <div className="h-40 w-full rounded-xl overflow-hidden mb-4 bg-black/40 border border-white/[0.06] relative">
                      <img
                        src={resolvedCover}
                        alt={proj.title || "Project"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {proj.sector && (
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white font-semibold">
                          {proj.sector}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-heading font-bold text-white group-hover:text-brand-yellow transition-colors tracking-tight line-clamp-1">
                      {proj.title || "Untitled Deliverable"}
                    </h3>
                    {proj.projectUrl && (
                      <a
                        href={proj.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-muted hover:text-white p-1 rounded-md transition-colors"
                        title="Open external project link"
                        aria-label={`Open link for ${proj.title}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Subtitle / Role */}
                  {proj.role && (
                    <p className="text-xs font-semibold text-brand-mint mb-2">
                      {proj.role}
                    </p>
                  )}

                  {/* Description */}
                  {proj.description && (
                    <p className="text-xs sm:text-[13px] text-text-secondary leading-relaxed line-clamp-3 mb-4">
                      {proj.description}
                    </p>
                  )}
                </div>

                {/* Footer details: technologies & tags */}
                {((proj.technologies && proj.technologies.length > 0) ||
                  (proj.skills && proj.skills.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/[0.05]">
                    {proj.technologies?.slice(0, 4).map((tech, tIdx) => (
                      <span
                        key={`t-${tIdx}`}
                        className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-text-secondary"
                      >
                        {tech}
                      </span>
                    ))}
                    {proj.skills?.slice(0, 3).map((sk, sIdx) => (
                      <span
                        key={`s-${sIdx}`}
                        className="px-2 py-0.5 rounded-md bg-brand-yellow/10 border border-brand-yellow/20 text-[10px] font-mono text-brand-yellow/90"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
