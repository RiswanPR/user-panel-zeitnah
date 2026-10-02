import { useContext, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Compass,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "../context/AuthContext";
import { useMessaging } from "../context/MessagingContext";
import { NotificationContext } from "../context/NotificationContext";
import leaderboardService from "../services/leaderboardService";
import opportunityService from "../services/opportunityService";
import PageTransition from "../components/ui/PageTransition";
import CookieConsentBanner from "../components/common/CookieConsentBanner";
import UsernameClaimModal from "../components/username/UsernameClaimModal";
import FeatureErrorBoundary from "../components/common/FeatureErrorBoundary";
import NotificationDrawer from "../components/notifications/NotificationDrawer";
import PlatformAnnouncementBanner from "../components/announcements/PlatformAnnouncementBanner";
import MobileMoreDrawer from "../components/navigation/MobileMoreDrawer";
import MainNavbar from "../components/navigation/MainNavbar";
import Footer from "../components/navigation/Footer";
import { getPrimaryCareerNavigation } from "../utils/roleNavigation";

export default function MainLayout({ children }) {
  const location = useLocation();
  const { user, logout, requestLogout } = useContext(AuthContext);
  const notifContext = useContext(NotificationContext);
  const currentUserId = user?._id || user?.userId;
  const shouldReduceMotion = useReducedMotion();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const { unreadCounts } = useMessaging();
  const unreadMessagesCount = unreadCounts?.total || 0;

  // Unread opportunities count for candidate
  const { data: oppUnreadData } = useQuery({
    queryKey: ["opportunities", "unread-count"],
    queryFn: () => opportunityService.getInboxUnreadCount(),
    staleTime: 1000 * 60,
    enabled: Boolean(currentUserId),
    retry: 1,
  });
  const unreadOpportunitiesCount = oppUnreadData?.unreadCount || 0;

  // Unread notifications count
  const unreadNotifCount = notifContext?.unreadCount || 0;

  // Fetch student's leaderboard rank
  const { data: position } = useQuery({
    queryKey: ["leaderboard", "position"],
    queryFn: () => leaderboardService.getMyLeaderboardPosition(),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(currentUserId),
    retry: 1,
  });

  // Route active state check for mobile bottom navigation
  const isRouteActive = (key) => {
    const path = location.pathname;
    if (key === "courses") return path === "/courses" || path.startsWith("/courses/") || path === "/";
    if (key === "network") return path === "/network" || path.startsWith("/network/");
    if (key === "messages") return path.startsWith("/messages");
    if (key === "jobs") return path.startsWith("/jobs");
    if (key === "manage-business") return path.startsWith("/manage-business");
    return false;
  };

  // Authoritative mobile active conversation check: suppress bottom nav inside active chat
  const isMessagesActiveConversation =
    location.pathname.startsWith("/messages") &&
    (Boolean(new URLSearchParams(location.search).get("c")) ||
      location.pathname.replace(/\/+$/, "").length > "/messages".length);

  // Authoritative career item based on role (Manage Business for Recruiter/Founder, Jobs for others)
  const careerItem = getPrimaryCareerNavigation(user);
  const CareerIcon = careerItem.icon;

  return (
    <div className="min-h-screen bg-bg-base text-white font-body antialiased flex flex-col selection:bg-brand-mint/30 selection:text-white">
      {/* ── Platform Announcement Banner ── */}
      <PlatformAnnouncementBanner />

      {/* ── Sleek Top Navigation Bar (Courses First, Search, Notifications, Profile) ── */}
      <MainNavbar
        user={user}
        onRequestLogout={requestLogout || logout}
        unreadMessagesCount={unreadMessagesCount}
        unreadOpportunitiesCount={unreadOpportunitiesCount}
        position={position}
      />

      <div className="flex-1 flex flex-col relative">
        {/* Ambient subtle background glow */}
        <div className="ambient-glow inset-0 pointer-events-none" />

        {/* ═══════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION (5 Primary Touchpoints)
          1. Courses  2. Network  3. Messages  4. Jobs  5. More
          Suppressed inside active mobile conversation
          ═══════════════════════════════════════════════ */}
        {!isMessagesActiveConversation && (
          <div className="fixed bottom-0 inset-x-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)] pointer-events-none">
            <div className="mx-3 mb-2.5 px-2 py-1.5 rounded-2xl bg-[#0B111E]/95 border border-white/[0.1] backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
            <nav className="flex items-center justify-around" aria-label="Mobile Bottom Navigation">
              {/* 1. Courses (First) */}
              <Link
                to="/courses"
                aria-current={isRouteActive("courses") ? "page" : undefined}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation"
              >
                {isRouteActive("courses") && (
                  <motion.div
                    layoutId={shouldReduceMotion ? undefined : "mobile-nav-active"}
                    className="absolute inset-0 rounded-xl bg-brand-mint/12 border border-brand-mint/25"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <BookOpen
                  className={`w-5 h-5 relative z-10 transition-colors ${
                    isRouteActive("courses") ? "text-brand-mint" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight ${
                    isRouteActive("courses") ? "text-brand-mint" : "text-text-faint"
                  }`}
                >
                  Courses
                </span>
              </Link>

              {/* 2. Network */}
              <Link
                to="/network"
                aria-current={isRouteActive("network") ? "page" : undefined}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation"
              >
                {isRouteActive("network") && (
                  <motion.div
                    layoutId={shouldReduceMotion ? undefined : "mobile-nav-active"}
                    className="absolute inset-0 rounded-xl bg-brand-mint/12 border border-brand-mint/25"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <Compass
                  className={`w-5 h-5 relative z-10 transition-colors ${
                    isRouteActive("network") ? "text-brand-mint" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight ${
                    isRouteActive("network") ? "text-brand-mint" : "text-text-faint"
                  }`}
                >
                  Network
                </span>
              </Link>

              {/* 3. Messages */}
              <Link
                to="/messages"
                aria-current={isRouteActive("messages") ? "page" : undefined}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation"
              >
                {isRouteActive("messages") && (
                  <motion.div
                    layoutId={shouldReduceMotion ? undefined : "mobile-nav-active"}
                    className="absolute inset-0 rounded-xl bg-brand-mint/12 border border-brand-mint/25"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <div className="relative z-10">
                  <MessageSquare
                    className={`w-5 h-5 transition-colors ${
                      isRouteActive("messages") ? "text-brand-mint" : "text-text-muted"
                    }`}
                  />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-brand-mint text-black font-bold font-mono text-[9px] flex items-center justify-center shadow-sm">
                      {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight ${
                    isRouteActive("messages") ? "text-brand-mint" : "text-text-faint"
                  }`}
                >
                  Messages
                </span>
              </Link>

              {/* 4. Role-Aware Career Item (Manage Business for Recruiter/Founder, Jobs for others) */}
              <Link
                to={careerItem.path}
                aria-current={isRouteActive(careerItem.key) ? "page" : undefined}
                className="relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation"
              >
                {isRouteActive(careerItem.key) && (
                  <motion.div
                    layoutId={shouldReduceMotion ? undefined : "mobile-nav-active"}
                    className="absolute inset-0 rounded-xl bg-brand-mint/12 border border-brand-mint/25"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <CareerIcon
                  className={`w-5 h-5 relative z-10 transition-colors ${
                    isRouteActive(careerItem.key) ? "text-brand-mint" : "text-text-muted"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight ${
                    isRouteActive(careerItem.key) ? "text-brand-mint" : "text-text-faint"
                  }`}
                >
                  {careerItem.mobileLabel || careerItem.label}
                </span>
              </Link>

              {/* 5. More (Opens Mobile Drawer) */}
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(true)}
                aria-expanded={isMobileMoreOpen}
                aria-haspopup="dialog"
                aria-label="More navigation options"
                className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[46px] min-w-[54px] rounded-xl transition-all focus-ring touch-manipulation cursor-pointer ${
                  isMobileMoreOpen ? "text-brand-mint" : "text-text-muted"
                }`}
              >
                <div className="relative z-10">
                  <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                  {(unreadOpportunitiesCount > 0 || unreadNotifCount > 0) && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-brand-mint shadow-sm" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 relative z-10 font-semibold tracking-tight text-text-faint">
                  More
                </span>
              </button>
            </nav>
          </div>
        </div>
        )}

        {/* ═══════════════════════════════════════════════
          MAIN CONTENT AREA (Spacious, Expansive Full Width)
          Adaptive full-height for active messaging conversations
          ═══════════════════════════════════════════════ */}
        <main
          className={`flex-1 min-w-0 relative z-10 ${
            isMessagesActiveConversation
              ? 'pb-0'
              : location.pathname.startsWith('/messages')
              ? 'pb-20 md:pb-0'
              : 'pb-28 md:pb-12'
          }`}
        >
          <div
            className={
              location.pathname.startsWith('/messages')
                ? 'w-full h-full'
                : 'max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7'
            }
          >
            <FeatureErrorBoundary featureName="Page Content">
              <PageTransition key={location.pathname}>
                {children || <Outlet />}
              </PageTransition>
            </FeatureErrorBoundary>
          </div>
        </main>
      </div>

      {/* ── Global Platform Footer (hidden on mobile, suppressed in full-height messaging) ── */}
      {!isMessagesActiveConversation && !location.pathname.startsWith('/messages') && (
        <Footer />
      )}

      {/* Mobile More Navigation Drawer */}
      <MobileMoreDrawer
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        user={user}
        onRequestLogout={requestLogout || logout}
        unreadOpportunitiesCount={unreadOpportunitiesCount}
        unreadNotificationsCount={unreadNotifCount}
      />

      <NotificationDrawer />
      <CookieConsentBanner />
      <UsernameClaimModal />
    </div>
  );
}
