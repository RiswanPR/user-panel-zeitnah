import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from "./services/queryClient";

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
              <Route path="/network/communities/:slug" element={<Suspense fallback={<PageLoader />}><CommunityDetailPage /></Suspense>} />
              <Route path="/network/communities/:slug/discussions/:discussionId" element={<Suspense fallback={<PageLoader />}><DiscussionDetailPage /></Suspense>} />
              <Route path="/network/spaces/:slugOrId" element={<Suspense fallback={<PageLoader />}><LearningSpaceDetailPage /></Suspense>} />
              <Route path="/network/spaces/:slugOrId/discussions/:discussionId" element={<Suspense fallback={<PageLoader />}><DiscussionDetailPage /></Suspense>} />
              <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
              <Route path="/active-sessions" element={<Suspense fallback={<PageLoader />}><ActiveSessions /></Suspense>} />
              <Route path="/audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />
              <Route path="/admin/error-reports" element={<Suspense fallback={<PageLoader />}><ErrorReportsDashboard /></Suspense>} />
              <Route path="/session-diagnostics" element={<Suspense fallback={<PageLoader />}><SessionDiagnostics /></Suspense>} />
            </Route>

            {/* SECURE COMMUNITY ROUTING */}
            <Route
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <CommunityLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route path="/community" element={<Suspense fallback={<PageLoader />}><CommunityHome /></Suspense>} />
              <Route path="/community/profile" element={<Suspense fallback={<PageLoader />}><CommunityProfilePage /></Suspense>} />
              <Route path="/community/profile/:username" element={<Suspense fallback={<PageLoader />}><CommunityProfilePage /></Suspense>} />
              <Route path="/community/messages" element={<Suspense fallback={<PageLoader />}><CommunityMessagesPage /></Suspense>} />
              <Route path="/community/messages/:conversationId" element={<Suspense fallback={<PageLoader />}><CommunityMessagesPage /></Suspense>} />
              <Route path="/community/moderator" element={<Suspense fallback={<PageLoader />}><ModeratorDashboard /></Suspense>} />
            </Route>

            {/* 404 — NOT FOUND */}
            {/* 404 NOT FOUND ROUTE */}
            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />

          </Routes>
          {/* Global Troubleshoot Error Reporter */}
          <TroubleshootReporter />
        </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
