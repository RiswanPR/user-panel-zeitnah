import { Award, ExternalLink, Calendar, Plus, Pencil, Trash2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
  sortCertificationsDescending,
  getCertificationExpirationStatus,
  formatCertificationDateRange,
  isCertificationVerified,
} from "../../utils/certificationCredential";

export default function ProfileCertificationsSection({
  certifications = [],
  isOwner = false,
  onAdd,
  onEdit,
  onDelete,
  className = "",
}) {
  const items = sortCertificationsDescending(Array.isArray(certifications) ? certifications : []);

  return (
    <section
      id="certifications"
      aria-labelledby="profile-certifications-heading"
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center text-brand-mint shadow-inner shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="profile-certifications-heading"
                className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
              >
                Licenses & Certifications
              </h2>
              {items.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/80">
                  {items.length} {items.length === 1 ? "Credential" : "Credentials"}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Accredited engineering council licenses, software credentials, and professional certifications.
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2 shrink-0">
            {onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Credential</span>
              </button>
            ) : (
              <Link
                to="/profile/edit?section=certifications"
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow text-xs font-semibold transition-all cursor-pointer focus-ring"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Credential</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto">
            <Award className="w-6 h-6 text-brand-mint/70" />
          </div>
          <div>
            <h3 className="text-sm font-heading font-bold text-white mb-1">
              No certifications added
            </h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
              {isOwner
                ? "Add your Chartered Engineer, PMP, Autodesk Certified Professional, or Council licensure credentials to prove industry competence."
                : "This member has not published their professional certifications."}
            </p>
          </div>
          {isOwner && (
            <div className="pt-1">
              {onAdd ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand-yellow text-[#070B14] hover:bg-brand-yellow/90 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Credential</span>
                </button>
              ) : (
                <Link
                  to="/profile/edit?section=certifications"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-brand-yellow text-[#070B14] hover:bg-brand-yellow/90 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Credential</span>
                </Link>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((cert, index) => {
            const certId = cert._id || cert.id || index;
            const dates = formatCertificationDateRange(cert.issueDate, cert.expirationDate);
            const statusInfo = getCertificationExpirationStatus(cert.issueDate, cert.expirationDate);
            const isVerified = isCertificationVerified(cert);

            return (
              <div
                key={certId}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] hover:border-brand-mint/30 p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status indicator (Active / Expiring / Expired / Lifetime) */}
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold border inline-flex items-center gap-1.5 ${statusInfo.badgeClass}`}
                        >
                          {statusInfo.isActive && !statusInfo.isExpired && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse shrink-0" />
                          )}
                          <span>{statusInfo.label}</span>
                        </span>

                        {/* Verified badge if verified */}
                        {isVerified && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold bg-brand-mint/15 text-brand-mint border border-brand-mint/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-brand-mint" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-heading font-black text-white tracking-tight leading-snug pt-1 break-words">
                        {cert.name || "Certification"}
                      </h3>

                      <p className="text-xs sm:text-sm font-semibold text-brand-mint break-words">
                        {cert.issuer || "Issuing Body"}
                      </p>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1 opacity-90 sm:opacity-75 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(cert)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-brand-mint hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title={`Edit ${cert.name}`}
                            aria-label={`Edit ${cert.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(certId)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-danger hover:bg-white/[0.04] transition-colors cursor-pointer"
                            title={`Delete ${cert.name}`}
                            aria-label={`Delete ${cert.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {dates && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono font-medium">
                      <Calendar className="w-3.5 h-3.5 text-text-faint shrink-0" />
                      <span>{dates}</span>
                    </div>
                  )}

                  {/* Privacy protection: Credential ID only shown to owner */}
                  {isOwner && cert.credentialId && (
                    <p className="text-[11px] font-mono text-text-muted break-words">
                      Credential ID: <span className="text-white/80 font-medium">{cert.credentialId}</span>
                    </p>
                  )}
                </div>

                {cert.credentialUrl && (
                  <div className="pt-3 border-t border-white/[0.05]">
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-mint hover:underline min-h-[36px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>Verify Credential</span>
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
