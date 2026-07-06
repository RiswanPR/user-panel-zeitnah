import { useContext } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Compass,
  TrendingUp,
  Users,
  Bookmark,
  FileText,
  Award,
  Calendar,
  Settings,
  Bell,
  Search,
  MessageCircle
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { getUploadUrl } from "../utils/courseUi";
import { CommunitySocketProvider } from "../context/CommunitySocketContext";

const navItems = [
  { path: "/community", label: "Home", icon: Home },
  { path: "/community/following", label: "Following", icon: Compass },
  { path: "/community/trending", label: "Trending", icon: TrendingUp },
  { path: "/community/groups", label: "My Communities", icon: Users },
  { path: "/community/saved", label: "Saved", icon: Bookmark },
  { path: "/community/my-posts", label: "My Posts", icon: FileText },
  { path: "/community/mentors", label: "Mentors", icon: Award },
  { path: "/community/events", label: "Events", icon: Calendar },
  { path: "/community/settings", label: "Settings", icon: Settings },
];

export default function CommunityLayout({ children }) {
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const isActive = (path) => location.pathname === path;
  
  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "Z";
  const avatarUrl = user?.avatar ? getUploadUrl(user.avatar) : null;

  return (
    <CommunitySocketProvider>
      <div className="min-h-screen bg-bg-base text-white font-body antialiased flex flex-col">
        {/* ── Premium Navbar (Sticky) ── */}
        <header className="sticky top-0 z-50 h-16 bg-bg-surface/80 backdrop-blur-xl border-b border-border-default flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-mint/10 border border-brand-mint/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-brand-mint" viewBox="0 0 160 160" fill="currentColor">
                  <path d="M40,50 C65,25 115,35 125,65 C135,95 70,125 80,155 C90,185 140,175 160,150 L140,180 C110,205 60,195 50,165 C40,135 105,105 95,75 C85,45 50,55 30,75 Z" transform="translate(-15, -25) scale(0.9)" />
                </svg>
              </div>
              <span className="font-heading font-extrabold tracking-wider uppercase text-white hidden sm:block text-sm">
                Zeitnah <span className="text-brand-mint font-medium capitalize tracking-normal ml-1">Community</span>
              </span>
            </Link>
          </div>

          {/* Global Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-text-faint" />
              </div>
              <input
                type="text"
                placeholder="Search posts, courses, mentors..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-full pl-10 pr-4 py-1.5 text-sm font-medium focus:bg-white/[0.06] focus:border-brand-mint/30 focus:outline-none transition-all placeholder-text-muted"
              />
            </div>
          </div>

          {/* Right Nav */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button className="relative p-2 text-text-muted hover:text-white transition-colors cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-yellow ring-2 ring-bg-surface" />
            </button>
            <button className="p-2 text-text-muted hover:text-white transition-colors cursor-pointer hidden sm:block">
              <MessageCircle className="w-5 h-5" />
            </button>
            
            <Link to="/profile" className="w-8 h-8 rounded-full bg-brand-mint/20 border border-brand-mint/30 flex items-center justify-center overflow-hidden cursor-pointer ml-1">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-heading font-bold text-brand-mint">{userInitials}</span>
              )}
            </Link>
          </div>
        </header>

        {/* ── Main Layout Grid ── */}
        <div className="flex-1 flex max-w-[1400px] w-full mx-auto relative">
          
          {/* Left Sidebar (Desktop) */}
          <aside className="hidden lg:block w-[240px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-6 pr-6 border-r border-border-default/50">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                      active ? "text-white bg-white/[0.04]" : "text-text-muted hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="community-nav-indicator"
                        className="absolute left-0 w-1 h-5 bg-brand-mint rounded-r-full"
                      />
                    )}
                    <Icon className={`w-5 h-5 ${active ? "text-brand-mint" : "text-text-faint group-hover:text-text-muted"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Center Feed */}
          <main className="flex-1 min-w-0 pb-24 md:pb-8">
            <div className="w-full max-w-[640px] mx-auto py-6">
              {children || <Outlet />}
            </div>
          </main>

          {/* Right Sidebar (Desktop) */}
          <aside className="hidden xl:block w-[320px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-6 pl-8">
            
            <div className="glass-surface p-5 mb-6">
              <h3 className="font-heading font-bold text-white mb-4">Trending Tags</h3>
              <div className="space-y-3">
                {['#ReactJS', '#NestJS', '#DesignSystem', '#SystemDesign'].map((tag, i) => (
                  <div key={tag} className="flex items-center justify-between group cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-brand-mint transition-colors">{tag}</p>
                      <p className="text-[10px] text-text-muted">{124 - i * 15} posts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-surface p-5">
              <h3 className="font-heading font-bold text-white mb-4">Top Mentors</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-mint/20 to-brand-navy border border-brand-mint/30" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white group-hover:text-brand-mint truncate">Mentor Name</p>
                      <p className="text-[10px] text-text-muted truncate">Senior Engineer @ Tech</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>

        </div>

        {/* ── Mobile Bottom Navigation ── */}
        <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-bg-surface/90 backdrop-blur-xl border-t border-border-default pb-[env(safe-area-inset-bottom)]">
          <nav className="flex items-center justify-around px-2 py-2">
            {navItems.slice(0, 5).map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
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

      </div>
    </CommunitySocketProvider>
  );
}
