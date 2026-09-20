import { useState } from 'react';
import { Search } from 'lucide-react';

export default function SpaceMembers({ members = [], teachers = [], isLoading }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = m.userId?.name || '';
    const email = m.userId?.email || '';
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">Owner</span>;
      case 'moderator':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-mint/15 text-brand-mint border border-brand-mint/30">Moderator</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] text-text-muted border border-white/[0.06]">Student</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-lg text-white">Space Roster</h2>
          <p className="text-xs text-text-muted mt-0.5">Assigned faculty and enrolled cohort members.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roster..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-mint/40 transition-colors"
          />
        </div>
      </div>

      {/* Faculty Section */}
      {teachers && teachers.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
            Assigned Faculty ({teachers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {teachers.map((t, idx) => (
              <div
                key={t._id || idx}
                className="p-4 rounded-2xl bg-[#111115]/90 border border-white/[0.06] flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-brand-mint font-bold text-sm shrink-0 overflow-hidden">
                  {t.avatar || t.profileImage ? (
                    <img src={t.avatar || t.profileImage} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(t.name || 'T')[0]}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">{t.name || t.email}</h4>
                  <p className="text-[10px] text-text-muted truncate">{t.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
                    Faculty
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrolled Members Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
          Enrolled Cohort ({filteredMembers.length})
        </h3>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#111115]/60 border border-white/[0.06] text-center">
            <p className="text-xs text-text-muted">No members match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMembers.map((m) => {
              const u = m.userId || {};
              return (
                <div
                  key={m._id}
                  className="p-3.5 rounded-2xl bg-[#111115]/80 border border-white/[0.06] flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-brand-mint font-bold text-xs shrink-0 overflow-hidden">
                    {u.avatar || u.profileImage ? (
                      <img src={u.avatar || u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(u.name || 'S')[0]}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{u.name || u.email?.split('@')[0] || 'Student'}</h4>
                    <p className="text-[10px] text-text-muted truncate">{u.email}</p>
                  </div>

                  <div className="shrink-0">
                    {getRoleBadge(m.role)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
