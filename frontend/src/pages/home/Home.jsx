import { useContext } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

function Home() {
  const { user, setUser } = useContext(AuthContext);

  // SECURE DISCONNECT PIPELINE
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.log(error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#07192a] relative overflow-hidden px-4 py-6 sm:py-10 text-white font-body antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">
      
      {/* Decorative ambient internal branded accent glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-[#9fd5b2] opacity-5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8 sm:space-y-10">

        {/* WELCOME IDENTIFICATION HUB */}
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-white tracking-tight leading-none">
            Welcome back, {user?.name || "Academic Member"} 👋
          </h1>
          <p className="text-[rgba(255,255,255,0.45)] text-sm font-medium max-w-xl leading-relaxed">
            Manage your academic parameters, active profile sessions, performance activities, and system security.
          </p>
        </div>

        {/* WORKSPACE OPERATIONS GRID SYSTEM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

          {/* PROFILE CONTROL HUB */}
          <Link
            to="/profile"
            className="group glass-card p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all duration-200 flex flex-col justify-between h-44"
          >
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-heading font-black text-white tracking-tight">
                  Profile Asset
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-lg leading-none">
                  &rarr;
                </span>
              </div>
              <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium leading-relaxed">
                View, audit, and modify your corporate technical specialty indexes and biography metadata.
              </p>
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase select-none">
              Identity Matrix
            </div>
          </Link>

          {/* ACTIVE ACCOUNT SECURITY WORKSPACE STATUS */}
          <div className="glass-card p-6 shadow-xl flex flex-col justify-between h-44 relative overflow-hidden">
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-heading font-black text-white tracking-tight">
                  Security Status
                </h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                Workstation Shield Active
              </p>
              <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium leading-relaxed">
                Cryptographic 6-digit OTP verification parameters are active across your node.
              </p>
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase select-none">
              Operational Safety
            </div>
          </div>

          {/* ACTIVE ALLOCATIONS METRIC HUB */}
          <Link
            to="/active-sessions"
            className="group glass-card p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all duration-200 flex flex-col justify-between h-44"
          >
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-heading font-black text-white tracking-tight">
                  Active Sessions
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-lg leading-none">
                  &rarr;
                </span>
              </div>
              <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium leading-relaxed">
                Examine running hardware device addresses and cross-verify active authorized workspace connections.
              </p>
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase select-none">
              Session Tracking
            </div>
          </Link>

          {/* SYSTEM CHANGE OPERATION METRIC STREAM */}
          <Link
            to="/audit-logs"
            className="group glass-card p-6 shadow-xl hover:border-[#9fd5b2]/40 hover:bg-white/[0.06] transition-all duration-200 flex flex-col justify-between h-44"
          >
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-heading font-black text-white tracking-tight">
                  Audit Logs
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-lg leading-none">
                  &rarr;
                </span>
              </div>
              <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium leading-relaxed">
                Trace account metadata modifications, chronological authentication records, and core system actions.
              </p>
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase select-none">
              Activity Stream
            </div>
          </Link>

        </div>

        {/* BOTTOM METADATA CONTROLS FOOTER */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[rgba(255,255,255,0.25)] uppercase select-none text-center sm:text-left">
            <svg className="w-4 h-4 text-emerald-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Protected Academic Session Active
          </div>

          {/* TERMINATION TRIGGER — VOLT YELLOW EXCLUSIVE CTA */}
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto relative group overflow-hidden rounded-xl px-6 py-3 text-xs font-extrabold tracking-wider uppercase text-[#07192a] bg-[#f6ed4a] shadow-[0_4px_15px_rgba(246,237,74,0.15)] hover:shadow-[0_4px_20px_rgba(246,237,74,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 cursor-pointer block"
          >
            <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="relative">
              Logout Securely
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default Home;