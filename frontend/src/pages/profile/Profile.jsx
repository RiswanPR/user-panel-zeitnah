import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/profile/me");
      setUser(res.data.user);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.log(error);
    } finally {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07192a] flex items-center justify-center text-white font-['DM_Sans']">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[#9fd5b2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-widest text-white/60">Loading Profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-10 font-['DM_Sans'] text-white antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      <div className="relative z-10 max-w-6xl mx-auto">
        
        {/* PROFILE HERO HEADER */}
        <div className="glass-card p-8 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent" />
          
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <img
              src={user?.avatar || "https://placehold.co/120x120"}
              alt="Workstation Profile Avatar"
              className="w-28 h-28 rounded-full object-cover border-2 border-[rgba(159,213,178,0.35)] shadow-md"
            />

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
                {user?.name}
              </h1>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                <span className="px-3 py-1 rounded-full bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.25)] text-[#9fd5b2] text-xs font-semibold uppercase tracking-wide">
                  {user?.role}
                </span>

                {user?.isVerified && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Verified
                  </span>
                )}
              </div>

              <p className="text-white/60 mt-4 text-sm max-w-2xl leading-relaxed font-medium">
                {user?.bio || "No custom domain bio summary appended to this profile asset yet."}
              </p>

              <div className="mt-5">
                <Link
                  to="/profile/edit"
                  className="px-5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/[0.08] transition-colors inline-block"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* METRICS & AUDIT LINKED MODULES GRID */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* ACCOUNT INFO */}
          <div className="glass-card p-6 shadow-xl flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#9fd5b2] mb-5">
              Account Parameters
            </h2>

            <div className="space-y-4 flex-1">
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                  Email Identifier
                </p>
                <p className="text-sm font-medium text-white/90 truncate">
                  {user?.email}
                </p>
              </div>

              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                  System Registration Date
                </p>
                <p className="text-sm font-medium text-white/90">
                  {user?.Start_Date ? new Date(user.Start_Date).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* ACTIVE SESSIONS LINK CARD */}
          <Link
            to="/active-sessions"
            className="group glass-card p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#9fd5b2]">
                  Active Sessions
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-lg">
                  &rarr;
                </span>
              </div>
              <p className="text-white/50 text-xs font-medium leading-relaxed">
                Monitor cryptographic login nodes and terminate non-authorized running workstation allocations.
              </p>
            </div>
            <div className="mt-4 text-[10px] font-bold tracking-widest text-white/30 uppercase">
              Manage Security Parameters
            </div>
          </Link>

          {/* AUDIT LOGS LINK CARD */}
          <Link
            to="/audit-logs"
            className="group glass-card p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#9fd5b2]">
                  Audit Logs
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-lg">
                  &rarr;
                </span>
              </div>
              <p className="text-white/50 text-xs font-medium leading-relaxed">
                Examine structured historical system mutations, login actions, and overall account metric updates.
              </p>
            </div>
            <div className="mt-4 text-[10px] font-bold tracking-widest text-white/30 uppercase">
              View Activity Streams
            </div>
          </Link>

        </div>

        {/* SKILLS PANEL SECTION */}
        <div className="mt-8 glass-card p-6 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#9fd5b2] mb-5">
            Technical Knowledge Specialties
          </h2>

          <div className="flex flex-wrap gap-2.5">
            {user?.skills?.length ? (
              user.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/80 font-medium tracking-wide shadow-sm"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-white/30 text-xs font-medium uppercase tracking-wider">
                No expertise matrix fields added to this profile index.
              </p>
            )}
          </div>
        </div>

        {/* SYSTEM DISCONNECT ACTION (LOGOUT) */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={logout}
            className="px-6 py-3 rounded-xl bg-[#f6ed4a] text-[#07192a] font-extrabold text-xs tracking-wider uppercase shadow-[0_4px_20px_rgba(246,237,74,0.15)] hover:shadow-[0_4px_25px_rgba(246,237,74,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cursor-pointer"
          >
            Logout Securely
          </button>
        </div>

      </div>
    </div>
  );
}

export default Profile;