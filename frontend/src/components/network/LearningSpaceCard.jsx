import { Users, ArrowRight, ShieldCheck, Lock, Unlock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LearningSpaceCard({ space }) {
  const isRestricted = space.accessMode === 'restricted' || space.accessMode === 'invite_only';
  const teachers = space.teachers || [];

  return (
    <div className="group relative rounded-2xl bg-[#111114]/90 border border-white/[0.08] hover:border-brand-mint/40 shadow-xl hover:shadow-2xl hover:shadow-brand-mint/5 transition-all duration-300 flex flex-col overflow-hidden">
      {/* Top Banner / Accent */}
      <div className="h-28 relative bg-gradient-to-br from-cyan-950/60 via-brand-surface/80 to-violet-950/60 overflow-hidden">
        {space.coverImage ? (
          <img src={space.coverImage} alt={space.name} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-brand-mint/10 via-transparent to-violet-500/10" />
        )}

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md border border-white/10 text-brand-mint">
            {space.category || 'Batch'}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-black/60 backdrop-blur-md border border-white/10 text-white/80">
            {space.code}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          {isRestricted ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              <Lock className="w-3 h-3" />
              <span>Restricted</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              <Unlock className="w-3 h-3" />
              <span>Open</span>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-heading font-bold text-lg text-white group-hover:text-brand-mint transition-colors line-clamp-1">
            {space.name}
          </h3>

          <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed">
            {space.description || 'Cohort collaboration space for coursework, faculty discussions, and academic peer support.'}
          </p>

          {/* Tags */}
          {space.tags && space.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {space.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-text-muted border border-white/[0.04]">
                  #{tag}
                </span>
              ))}
              {space.tags.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 text-text-faint">
                  +{space.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
          {/* Teachers / Faculty */}
          <div className="flex items-center gap-2">
            {teachers.length > 0 ? (
              <div className="flex -space-x-2 overflow-hidden">
                {teachers.slice(0, 3).map((t, i) => (
                  <div
                    key={t._id || i}
                    className="w-7 h-7 rounded-full bg-bg-surface border-2 border-[#111114] flex items-center justify-center text-[10px] font-bold text-brand-mint overflow-hidden"
                    title={t.name || 'Faculty'}
                  >
                    {t.avatar || t.profileImage ? (
                      <img src={t.avatar || t.profileImage} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(t.name || 'T')[0]}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-text-faint" />
                <span>Admin Managed</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-text-muted ml-2">
              <Users className="w-3.5 h-3.5 text-text-faint" />
              <span>{space.memberCount || 0}</span>
            </div>
          </div>

          {/* Action */}
          <Link
            to={`/network/spaces/${space.code || space._id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-mint/10 hover:bg-brand-mint text-brand-mint hover:text-black font-semibold text-xs transition-all duration-200 cursor-pointer"
          >
            <span>{space.isMember ? 'Enter Space' : 'View Space'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
