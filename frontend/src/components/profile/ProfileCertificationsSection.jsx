import { Award, ExternalLink, Calendar, Plus, Pencil, Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

function formatCertDates(issueDate, expirationDate) {
  if (!issueDate) return null;
  const issued = new Date(issueDate).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  if (!expirationDate) {
    return `Issued ${issued} · No Expiration`;
  }

  const exp = new Date(expirationDate);
  const isExpired = exp < new Date();
  const expStr = exp.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return `Issued ${issued} · ${isExpired ? "Expired" : "Expires"} ${expStr}`;
}

export default function ProfileCertificationsSection({
  certifications = [],
  isOwner = false,
  onAdd,
  onEdit,
  onDelete,
  className = "",
}) {
  const items = Array.isArray(certifications) ? certifications : [];

  return (
    <section
      id="certifications"
      aria-labelledby="profile-certifications-heading"
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="profile-certifications-heading"
                className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
              >
                Licenses & Certifications
              </h2>
              {items.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-xs font-mono font-medium text-text-muted">
                  {items.length}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Accredited engineering council licenses and certified software credentials
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            {onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Credential</span>
              </button>
            ) : (
              <Link
                to="/profile/edit?section=certifications"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all cursor-pointer focus-ring"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Credential</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto mb-3">
            <Award className="w-6 h-6 text-text-faint" />
          </div>
          <h3 className="text-sm font-heading font-bold text-white mb-1">
            No certifications added
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            {isOwner
              ? "Add your Chartered Engineer, PMP, Autodesk Certified Professional, or Council licensure credentials to prove industry competence."
              : "This member has not published their professional certifications."}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={onAdd || (() => {})}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Credential</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((cert, index) => {
            const certId = cert._id || cert.id || index;
            const dates = formatCertDates(cert.issueDate, cert.expirationDate);

            return (
              <div
                key={certId}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] hover:border-white/[0.12] p-5 transition-all shadow-sm flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-heading font-bold text-white tracking-tight line-clamp-2">
                        {cert.name || "Certification"}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-400">
                        {cert.issuer || "Issuing Body"}
                      </p>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(cert)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                            title="Edit certification"
                            aria-label={`Edit ${cert.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(certId)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete certification"
                            aria-label={`Delete ${cert.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {dates && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono mb-2">
                      <Calendar className="w-3.5 h-3.5 text-text-faint" />
                      <span>{dates}</span>
                    </div>
                  )}

                  {cert.credentialId && (
                    <p className="text-[11px] font-mono text-text-muted">
                      Credential ID: <span className="text-white/80">{cert.credentialId}</span>
                    </p>
                  )}
                </div>

                {cert.credentialUrl && (
                  <div className="pt-3 mt-3 border-t border-white/[0.05]">
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Credential</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
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
