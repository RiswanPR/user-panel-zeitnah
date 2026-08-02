import { useContext } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  BookOpen,
  GraduationCap,
  Users,
  MessageSquare,
  Award,
  User
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { getUploadUrl } from "../utils/courseUi";
import PageTransition from "../components/ui/PageTransition";
import CookieConsentBanner from "../components/common/CookieConsentBanner";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/courses", label: "Courses", icon: BookOpen },
  { path: "/my-learning", label: "My Learning", icon: GraduationCap },
  { path: "/community", label: "Community", icon: Users },
  { path: "/community/messages", label: "Messages", icon: MessageSquare },
  { path: "/my-points", label: "My Points", icon: Award },
  { path: "/profile", label: "Profile", icon: User },
];

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
};

export default function MainLayout({ children }) {
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const userInitials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "Z";

  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;

  return (
    <div className="min-h-screen bg-bg-base text-white font-body antialiased flex flex-col md:flex-row">

      {/* Ambient background */}
      <div className="ambient-glow inset-0" />

      {/* Mobile Top Header with Logo */}
      <div className="md:hidden flex items-center justify-between p-4 bg-bg-surface/80 backdrop-blur-xl border-b border-border-default sticky top-0 z-40">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl border border-brand-mint/30 overflow-hidden shadow-md bg-bg-surface flex items-center justify-center">
            <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-heading font-extrabold tracking-wider uppercase text-white text-xs">
            ZEITNAH
          </span>
        </Link>

        <Link to="/profile" className="w-8 h-8 rounded-full bg-brand-mint/20 border border-brand-mint/30 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-heading font-bold text-brand-mint">{userInitials}</span>
          )}
        </Link>
      </div>

      {/* Desktop Sidebar Navbar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-bg-surface/90 backdrop-blur-2xl border-r border-border-default flex-col justify-between p-5 sticky top-0 h-screen z-30">
        <div className="space-y-8">
          {/* Logo Section */}
          <Link to="/dashboard" className="flex items-center gap-3 group px-2 pt-2">
            <div className="w-10 h-10 rounded-xl border border-brand-mint/30 overflow-hidden shadow-lg bg-bg-surface flex-shrink-0">
              <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-lg tracking-wider text-white group-hover:text-brand-mint transition-colors">
                ZEITNAH
              </h1>
              <p className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
                Academy
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item, i) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <motion.div
                  key={item.path}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={navItemVariants}
                >
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 relative group ${
                      active
                        ? "text-white bg-gradient-to-r from-brand-mint/15 to-transparent border border-brand-mint/30 shadow-md shadow-brand-mint/5"
                        : "text-text-muted hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute left-0 w-1 h-6 bg-brand-mint rounded-r-full"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={`w-5 h-5 transition-all duration-300 ${
                        active
                          ? "text-brand-mint drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                          : "text-text-faint group-hover:text-white"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* User Footer Card */}
        <div className="pt-4 border-t border-border-default">
          <Link
            to="/profile"
            className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/[0.06]"
          >
            <div className="w-9 h-9 rounded-full bg-brand-mint/20 border border-brand-mint/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-heading font-bold text-brand-mint">{userInitials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white group-hover:text-brand-mint transition-colors truncate">
                {user?.name || "Student User"}
              </p>
              <p className="text-[10px] text-text-muted truncate">
                {user?.email || "student@zeitnah.com"}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0 min-h-screen">
        <PageTransition>
          {children || <Outlet />}
        </PageTransition>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-bg-surface/90 backdrop-blur-2xl border-t border-border-default pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  active ? "text-brand-mint" : "text-text-faint"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <CookieConsentBanner />
    </div>
  );
}
