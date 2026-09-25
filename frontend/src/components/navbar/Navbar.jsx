import { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { LogOut, Sparkles, X } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { getNavItems } from "./navItems";

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const [placeholderModal, setPlaceholderModal] = useState(null);

  const activeNavItems = getNavItems(user?.primaryRole || user?.role);

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-[#0b0b0b]/90 backdrop-blur-2xl border-r border-white/[0.06] z-50 flex-col px-5 py-6">
        {/* Glow */}
        <div className="absolute top-[-80px] left-[-80px] w-[220px] h-[220px] bg-cyan-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[220px] h-[220px] bg-violet-500/10 blur-[100px] rounded-full" />

        {/* Logo */}
        <div className="relative z-10 mb-10 flex items-center gap-3 select-none">
          <div className="w-10 h-10 rounded-xl border border-cyan-400/30 overflow-hidden shadow-lg bg-black/40 flex-shrink-0">
            <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent leading-none">
              ZEITNAH
            </h1>
            <p className="text-white/40 text-[10px] tracking-wide mt-1">
              Infrastructure Network
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="relative z-10 flex flex-col gap-2">
          {activeNavItems.map((item) => {
            const Icon = item.icon;

            if (item.placeholder) {
              return (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => setPlaceholderModal(item)}
                  className="group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/[0.03] transition-all duration-300 text-left w-full cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <Icon size={22} className="text-violet-300 group-hover:text-cyan-300 transition-colors" />
                    <span className="font-medium text-sm text-white/60 group-hover:text-white transition-colors">
                      {item.name}
                    </span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-400/20 shadow-lg shadow-cyan-500/5"
                      : "hover:bg-white/[0.03]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={22}
                      className={`transition-all duration-300 ${
                        isActive
                          ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                          : "text-violet-300 group-hover:text-cyan-300"
                      }`}
                    />
                    <span
                      className={`font-medium text-sm transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-200 to-violet-300 bg-clip-text text-transparent"
                          : "text-white/60 group-hover:text-white"
                      }`}
                    >
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Logout */}
        <div className="relative z-10 mt-auto pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => logout?.()}
            className="w-full group flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-red-500/10 hover:border hover:border-red-500/20 text-white/60 hover:text-red-400 transition-all duration-300 cursor-pointer"
          >
            <LogOut size={20} className="text-white/40 group-hover:text-red-400 transition-colors" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* MOBILE / TABLET */}
      <div className="lg:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[94%] bg-[#0b0b0b]/90 backdrop-blur-2xl border border-white/[0.08] rounded-3xl z-50 px-3 py-2.5 shadow-2xl shadow-black/70">
        <div className="flex justify-around items-center">
          {activeNavItems.map((item) => {
            const Icon = item.icon;

            if (item.placeholder) {
              return (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => setPlaceholderModal(item)}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/[0.03] transition-all cursor-pointer relative"
                >
                  <Icon size={20} className="text-violet-300" />
                  <span className="text-[9px] text-white/50 mt-1 font-medium">{item.name}</span>
                </button>
              );
            }

            return (
              <NavLink key={item.path} to={item.path}>
                {({ isActive }) => (
                  <div
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-400/20 shadow-lg shadow-cyan-500/10"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={`transition-all duration-300 ${
                        isActive
                          ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]"
                          : "text-violet-300"
                      }`}
                    />
                    <span
                      className={`text-[9px] mt-1 font-medium transition-all ${
                        isActive
                          ? "text-cyan-200"
                          : "text-white/50"
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* PHASE 2 PREVIEW MODAL */}
      {placeholderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#121214] border border-cyan-500/20 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Phase 2 Architecture</span>
              </div>
              <button
                type="button"
                onClick={() => setPlaceholderModal(null)}
                className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{placeholderModal.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              {placeholderModal.description}
            </p>

            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 mb-6">
              Current Active System: <strong>Phase 1 — Infrastructure Profile & Role System</strong>. Your professional identity is live and ready to build.
            </div>

            <button
              type="button"
              onClick={() => setPlaceholderModal(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-opacity cursor-pointer"
            >
              Continue to Profile
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;