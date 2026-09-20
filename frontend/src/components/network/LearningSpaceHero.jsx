import { Users, Lock, ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LearningSpaceHero({ space, isMember, userRole, onJoin, onLeave, isJoining }) {
  const teachers = space.teachers || [];
  const isRestricted = space.accessMode === 'restricted' || space.accessMode === 'invite_only';

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-[#121217] via-[#0e0e12] to-[#121217] border border-white/[0.08] p-6 sm:p-8 overflow-hidden shadow-2xl mb-8">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-brand-mint/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[200px] bg-violet-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Breadcrumb / Back */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/network"
          className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Spaces</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
            {space.category || 'Learning Space'}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-white/[0.06] text-white/90 border border-white/[0.08]">
            {space.code}
          </span>
        </div>
      </div>

      {/* Main details */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
            {space.name}
          </h1>

          <p className="text-sm text-text-muted mt-3 leading-relaxed">
            {space.description || 'Cohort learning space for coursework, faculty updates, and student discussions.'}
          </p>

          {/* Linked Course */}
          {space.courseId && (
            <div className="mt-4 flex items-center gap-2">
              <Link
                to={`/courses/${space.courseId?._id || space.courseId}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-cyan-300 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Linked Course: {space.courseId?.name || space.courseId?.title || 'View Course'}</span>
              </Link>
            </div>
          )}

          {/* Faculty / Teachers */}
          {teachers.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-text-faint uppercase tracking-wider">Faculty:</span>
              <div className="flex flex-wrap gap-2">
                {teachers.map((t, idx) => (
                  <div
                    key={t._id || idx}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="w-5 h-5 rounded-full bg-brand-mint/20 flex items-center justify-center text-[9px] font-bold text-brand-mint overflow-hidden">
                      {t.avatar || t.profileImage ? (
                        <img src={t.avatar || t.profileImage} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(t.name || 'T')[0]}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-white/90">{t.name || t.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Users className="w-4 h-4 text-brand-mint" />
            <span className="font-bold text-white text-sm">{space.memberCount || 0}</span>
            <span>enrolled members</span>
          </div>

          <div className="flex items-center gap-2">
            {isMember ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold capitalize">
                  {userRole || 'Member'}
                </span>
                {userRole === 'member' && (
                  <button
                    onClick={onLeave}
                    disabled={isJoining}
                    className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-text-muted hover:text-red-300 border border-white/[0.08] hover:border-red-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Leave Space
                  </button>
                )}
              </div>
            ) : isRestricted ? (
              <button
                disabled
                className="px-5 py-2.5 rounded-xl bg-white/[0.04] text-text-muted border border-white/[0.08] text-xs font-semibold cursor-not-allowed flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Restricted (Invite Only)</span>
              </button>
            ) : (
              <button
                onClick={onJoin}
                disabled={isJoining}
                className="px-6 py-2.5 rounded-xl bg-brand-mint hover:bg-brand-mint/90 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-mint/20 transition-all cursor-pointer"
              >
                {isJoining ? 'Joining...' : 'Join Learning Space'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
