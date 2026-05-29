import { useContext } from "react";
import { Link } from "react-router-dom";

import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

function Home() {
  const { user, setUser } = useContext(AuthContext);

  // LOGOUT
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
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden px-4 py-10">

      {/* Background glow blobs */}
      <div className="absolute top-[-120px] left-[-100px] w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[120px]" />

      <div className="absolute bottom-[-100px] right-[-80px] w-[360px] h-[360px] bg-violet-600/10 rounded-full blur-[100px]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-4xl font-bold text-white mb-3 tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Welcome back, {user?.name} 👋
          </h1>

          <p
            className="text-white/40 text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Manage your profile, sessions, activity logs, and account security.
          </p>
        </div>

        {/* Dashboard cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">

          {/* Profile */}
          <Link
            to="/profile"
            className="group bg-[#111111] border border-white/[0.07] rounded-2xl p-6 hover:border-blue-400/30 hover:bg-white/[0.02] transition-all duration-300 shadow-2xl shadow-black/60"
          >

            <div className="flex items-center justify-between mb-5">

              <h2 className="text-lg font-semibold text-white">
                Profile
              </h2>

              <div className="text-blue-400 group-hover:translate-x-1 transition-transform">
                →
              </div>

            </div>

            <p className="text-white/40 text-sm">
              View and manage your profile details.
            </p>

          </Link>

          {/* Security Status */}
          <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6 shadow-2xl shadow-black/60">

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                Security Status
              </h2>

              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            </div>

            <p className="text-green-400 text-sm">
              Your account is secure
            </p>

            <p className="text-white/30 text-sm mt-3">
              OTP authentication is active.
            </p>

          </div>

          {/* Active Sessions */}
          <Link
            to="/active-sessions"
            className="group bg-[#111111] border border-white/[0.07] rounded-2xl p-6 hover:border-cyan-400/30 hover:bg-white/[0.02] transition-all duration-300 shadow-2xl shadow-black/60"
          >

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                Active Sessions
              </h2>

              <div className="text-cyan-400 group-hover:translate-x-1 transition-transform">
                →
              </div>
            </div>

            <p className="text-white/40 text-sm">
              View logged in devices and active sessions.
            </p>

          </Link>

          {/* Audit Logs */}
          <Link
            to="/audit-logs"
            className="group bg-[#111111] border border-white/[0.07] rounded-2xl p-6 hover:border-violet-400/30 hover:bg-white/[0.02] transition-all duration-300 shadow-2xl shadow-black/60"
          >

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                Audit Logs
              </h2>

              <div className="text-violet-400 group-hover:translate-x-1 transition-transform">
                →
              </div>
            </div>

            <p className="text-white/40 text-sm">
              Track authentication and account activity.
            </p>

          </Link>

        </div>

        {/* Bottom section */}
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

          <div>
            <p
              className="text-white/20 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Protected session active
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="relative group overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-[#0a0a0a] bg-cyan-400 hover:bg-cyan-300 transition-all duration-200 active:scale-[0.98]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >

            <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <span className="relative">
              Logout
            </span>

          </button>

        </div>

      </div>

      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500&display=swap');
      `}</style>

    </div>
  );
}

export default Home;