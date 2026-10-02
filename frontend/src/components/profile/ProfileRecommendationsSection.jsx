import { HeartHandshake, Quote, Plus, Send, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProfileRecommendationsSection({
  recommendations = [],
  isOwner = false,
  onRequestRecommendation,
  onWriteRecommendation,
  className = "",
}) {
  const items = Array.isArray(recommendations) ? recommendations : [];
  // For visitors, only show approved recommendations
  const displayItems = isOwner
    ? items
    : items.filter((r) => String(r.status || "").toLowerCase() === "approved" || !r.status);

  return (
    <section
      id="recommendations"
      aria-labelledby="profile-recommendations-heading"
      className={`rounded-3xl border border-white/[0.08] bg-[#0A0F18]/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="profile-recommendations-heading"
                className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight"
              >
                Peer & Mentor Recommendations
              </h2>
              {displayItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-xs font-mono font-medium text-text-muted">
                  {displayItems.length}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Verified endorsements from project leads, senior engineers, and mentors
            </p>
          </div>
        </div>

        <div>
          {isOwner ? (
            <Link
              to="/profile/edit?section=recommendations"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Manage Endorsements</span>
            </Link>
          ) : (
            onWriteRecommendation && (
              <button
                type="button"
                onClick={onWriteRecommendation}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/30 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition-all cursor-pointer focus-ring shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Endorse</span>
              </button>
            )
          )}
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted mx-auto mb-3">
            <Quote className="w-6 h-6 text-text-faint" />
          </div>
          <h3 className="text-sm font-heading font-bold text-white mb-1">
            No recommendations recorded
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
            {isOwner
              ? "Request endorsements from project colleagues, professors, or clients to establish third-party social proof."
              : "Be the first to endorse this member's work and professional reputation."}
          </p>
          {!isOwner && onWriteRecommendation && (
            <button
              type="button"
              onClick={onWriteRecommendation}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-400 text-xs font-bold transition-all cursor-pointer focus-ring shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write Recommendation</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {displayItems.map((rec, index) => {
            const recId = rec._id || rec.id || index;
            const author = rec.author || {};
            const authorName = author.name || rec.authorName || "Peer Member";
            const authorRole = author.headline || author.currentRole || rec.relationship || "Colleague";

            return (
              <div
                key={recId}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between relative overflow-hidden"
              >
                <Quote className="w-8 h-8 text-white/[0.05] absolute top-4 right-4 pointer-events-none" />

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-300 font-semibold">
                      {rec.relationship || "Professional Endorsement"}
                    </span>
                    {rec.createdAt && (
                      <span className="text-[11px] text-text-muted font-mono">
                        {new Date(rec.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed italic whitespace-pre-line">
                    "{rec.content || rec.message}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-white/[0.05]">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-mint/20 to-brand-navy/60 border border-white/10 flex items-center justify-center text-brand-mint font-bold text-xs uppercase">
                    {authorName[0] || "P"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {authorName}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">
                      {authorRole}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
