import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from "./services/queryClient";

// Auth Components
import Login from "./pages/auth/Login";
import VerifyOtp from "./pages/auth/VerifyLoginOtp";
import Register from "./pages/auth/Register";
import VerifyRegisterOtp from "./pages/auth/VerifyRegisterOtp";

// Context
import { ToastProvider } from "./components/ui/Toast";
import { NotificationProvider } from "./context/NotificationContext";
import { MessagingProvider } from "./context/MessagingContext";

// Error Capture & Troubleshoot
import { initErrorCapture } from "./utils/errorCapture";
import TroubleshootReporter from "./components/common/TroubleshootReporter";
import { lazyWithRetry } from "./utils/lazyWithRetry";

// Initialize global error capture as early as possible
initErrorCapture();

// Lazy Loaded Application Views with automatic stale-chunk recovery
const ActiveSessions = lazyWithRetry(() => import("./pages/sessions/ActiveSessions"));
const AuditLogs = lazyWithRetry(() => import("./pages/audit/AuditLogs"));
const Profile = lazyWithRetry(() => import("./pages/profile/Profile"));
const EditProfile = lazyWithRetry(() => import("./pages/profile/EditProfile"));
const PublicProfilePage = lazyWithRetry(() => import("./pages/profile/PublicProfilePage"));
const Courses = lazyWithRetry(() => import("./pages/courses/Courses"));
const CourseChapters = lazyWithRetry(() => import("./pages/courses/CourseChapters"));
const CourseClasses = lazyWithRetry(() => import("./pages/courses/CourseClasses"));
const ClassView = lazyWithRetry(() => import("./pages/courses/ClassView"));
const MyLearning = lazyWithRetry(() => import("./pages/learning/MyLearning"));
const Dashboard = lazyWithRetry(() => import("./pages/learning/Dashboard"));
const MyPoints = lazyWithRetry(() => import("./pages/learning/MyPoints"));
const Leaderboard = lazyWithRetry(() => import("./pages/leaderboard/LeaderboardPage"));
const NetworkPage = lazyWithRetry(() => import("./pages/network/NetworkPage"));
const NetworkProfilePage = lazyWithRetry(() => import("./pages/network/NetworkProfilePage"));
const LearningSpaceDetailPage = lazyWithRetry(() => import("./pages/network/LearningSpaceDetailPage"));
const DiscussionDetailPage = lazyWithRetry(() => import("./pages/network/DiscussionDetailPage"));
const NotFoundPage = lazyWithRetry(() => import("./pages/NotFoundPage"));
const ErrorReportsDashboard = lazyWithRetry(() => import("./pages/admin/ErrorReportsDashboard"));
const SessionDiagnostics = lazyWithRetry(() => import("./pages/admin/SessionDiagnostics"));
const NotificationsPage = lazyWithRetry(() => import("./pages/notifications/NotificationsPage"));
const JobsPage = lazyWithRetry(() => import("./pages/jobs/JobsPage"));
const JobDetailPage = lazyWithRetry(() => import("./pages/jobs/JobDetailPage"));
const ManageBusiness = lazyWithRetry(() => import("./pages/business/ManageBusiness"));
const PublicBusinessProfilePage = lazyWithRetry(() => import("./pages/business/PublicBusinessProfilePage"));
const BusinessDiscoveryPage = lazyWithRetry(() => import("./pages/business/BusinessDiscoveryPage"));
const AdminBusinessReviewPage = lazyWithRetry(() => import("./pages/admin/AdminBusinessReviewPage"));
const CareerIntelligencePage = lazyWithRetry(() => import("./pages/career/CareerIntelligencePage"));
const MessagesPage = lazyWithRetry(() => import("./pages/messages/MessagesPage"));
const PortfolioPage = lazyWithRetry(() => import("./pages/profile/PortfolioPage"));
const VerificationCenterPage = lazyWithRetry(() => import("./pages/profile/VerificationCenterPage"));
const OpportunityInboxPage = lazyWithRetry(() => import("./pages/opportunities/OpportunityInboxPage"));

import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

/**
 * Premium page loader with branded skeleton.
 */
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="relative">
      <div className="w-10 h-10 rounded-full border-2 border-white/[0.06]" />
      <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-brand-mint animate-spin" />
    </div>
    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted animate-pulse">
      Loading...
    </p>
  </div>
);


import { nativeApp, initDeepLinks } from "./native";
import { useNavigate } from "react-router-dom";

function NativeBridgeHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    nativeApp.initialize();
    const cleanupDeepLinks = initDeepLinks((path) => {
      navigate(path);
    });
    return () => {
      cleanupDeepLinks();
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NotificationProvider>
          <MessagingProvider>
            <BrowserRouter>
              <NativeBridgeHandler />
              <Routes>

              {/* PUBLIC AUTHENTICATION ROUTES */}
              <Route path="/login" element={<Login />} />
              <Route path="/verify-login-otp" element={<VerifyOtp />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-register-otp" element={<VerifyRegisterOtp />} />
              <Route
                path="/u/:username"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PublicProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="/u/:username/portfolio"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PortfolioPage isPublic={true} />
                  </Suspense>
                }
              />
              <Route
                path="/profile/u/:username"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PublicProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="/profile/u/:username/portfolio"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PortfolioPage isPublic={true} />
                  </Suspense>
                }
              />

              {/* SECURE APPLICATION ROUTING (Main Layout) */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/courses" />} />
                <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
                <Route path="/profile/portfolio" element={<Suspense fallback={<PageLoader />}><PortfolioPage /></Suspense>} />
                <Route path="/profile/verification" element={<Suspense fallback={<PageLoader />}><VerificationCenterPage /></Suspense>} />
                <Route path="/profile/edit" element={<Suspense fallback={<PageLoader />}><EditProfile /></Suspense>} />
                <Route path="/public-profile" element={<Suspense fallback={<PageLoader />}><PublicProfilePage /></Suspense>} />
                <Route path="/courses" element={<Suspense fallback={<PageLoader />}><Courses /></Suspense>} />
                <Route path="/courses/:courseId" element={<Suspense fallback={<PageLoader />}><CourseChapters /></Suspense>} />
                <Route path="/courses/:courseId/chapters" element={<Suspense fallback={<PageLoader />}><CourseChapters /></Suspense>} />
                <Route path="/courses/:courseId/chapters/:chapterCode/classes" element={<Suspense fallback={<PageLoader />}><CourseClasses /></Suspense>} />
                <Route path="/courses/class/:classId" element={<Suspense fallback={<PageLoader />}><ClassView /></Suspense>} />
                <Route path="/my-learning" element={<Suspense fallback={<PageLoader />}><MyLearning /></Suspense>} />
                <Route path="/my-points" element={<Suspense fallback={<PageLoader />}><MyPoints /></Suspense>} />
                <Route path="/leaderboard" element={<Suspense fallback={<PageLoader />}><Leaderboard /></Suspense>} />
                <Route path="/leaderboard/:courseId" element={<Suspense fallback={<PageLoader />}><Leaderboard /></Suspense>} />
                <Route path="/network" element={<Suspense fallback={<PageLoader />}><NetworkPage /></Suspense>} />
                <Route path="/network/profile/:username" element={<Suspense fallback={<PageLoader />}><NetworkProfilePage /></Suspense>} />
                <Route path="/network/spaces/:slugOrId" element={<Suspense fallback={<PageLoader />}><LearningSpaceDetailPage /></Suspense>} />
                <Route path="/network/spaces/:slugOrId/discussions/:discussionId" element={<Suspense fallback={<PageLoader />}><DiscussionDetailPage /></Suspense>} />
                <Route path="/messages" element={<Suspense fallback={<PageLoader />}><MessagesPage /></Suspense>} />
                <Route path="/messages/:conversationId" element={<Suspense fallback={<PageLoader />}><MessagesPage /></Suspense>} />
                <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
                <Route path="/jobs" element={<Suspense fallback={<PageLoader />}><JobsPage /></Suspense>} />
                <Route path="/jobs/:id" element={<Suspense fallback={<PageLoader />}><JobDetailPage /></Suspense>} />
                <Route path="/opportunities" element={<Navigate to="/opportunities/inbox" replace />} />
                <Route path="/opportunities/inbox" element={<Suspense fallback={<PageLoader />}><OpportunityInboxPage /></Suspense>} />
                <Route path="/career/opportunities" element={<Navigate to="/opportunities/inbox" replace />} />
                <Route path="/career-intelligence" element={<Suspense fallback={<PageLoader />}><CareerIntelligencePage /></Suspense>} />
                <Route path="/manage-business" element={<Suspense fallback={<PageLoader />}><ManageBusiness /></Suspense>} />
                <Route path="/businesses" element={<Suspense fallback={<PageLoader />}><BusinessDiscoveryPage /></Suspense>} />
                <Route path="/businesses/:slug" element={<Suspense fallback={<PageLoader />}><PublicBusinessProfilePage /></Suspense>} />
                <Route path="/admin/businesses" element={<Suspense fallback={<PageLoader />}><AdminBusinessReviewPage /></Suspense>} />
                <Route path="/active-sessions" element={<Suspense fallback={<PageLoader />}><ActiveSessions /></Suspense>} />
                <Route path="/audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />
                <Route path="/admin/error-reports" element={<Suspense fallback={<PageLoader />}><ErrorReportsDashboard /></Suspense>} />
                <Route path="/session-diagnostics" element={<Suspense fallback={<PageLoader />}><SessionDiagnostics /></Suspense>} />
              </Route>

              {/* 404 — NOT FOUND */}
              {/* 404 NOT FOUND ROUTE */}
              <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />

            </Routes>
            {/* Global Troubleshoot Error Reporter */}
            <TroubleshootReporter />
          </BrowserRouter>
          </MessagingProvider>
        </NotificationProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
