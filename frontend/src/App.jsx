import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Auth Components
import Login from "./pages/auth/Login";
import VerifyOtp from "./pages/auth/VerifyLoginOtp";
import Register from "./pages/auth/Register";
import VerifyRegisterOtp from "./pages/auth/VerifyRegisterOtp";

// Context
import { SocketProvider } from "./context/SocketContext";
import { ToastProvider } from "./components/ui/Toast";

// Error Capture & Troubleshoot
import { initErrorCapture } from "./utils/errorCapture";
import TroubleshootReporter from "./components/common/TroubleshootReporter";

// Initialize global error capture as early as possible
initErrorCapture();

// Lazy Loaded Application Views
const ActiveSessions = React.lazy(() => import("./pages/sessions/ActiveSessions"));
const AuditLogs = React.lazy(() => import("./pages/audit/AuditLogs"));
const Profile = React.lazy(() => import("./pages/profile/Profile"));
const EditProfile = React.lazy(() => import("./pages/profile/EditProfile"));
const Courses = React.lazy(() => import("./pages/courses/Courses"));
const CourseChapters = React.lazy(() => import("./pages/courses/CourseChapters"));
const CourseClasses = React.lazy(() => import("./pages/courses/CourseClasses"));
const ClassView = React.lazy(() => import("./pages/courses/ClassView"));
const MyLearning = React.lazy(() => import("./pages/learning/MyLearning"));
const Dashboard = React.lazy(() => import("./pages/learning/Dashboard"));
const MyPoints = React.lazy(() => import("./pages/learning/MyPoints"));
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));

// Community Views
const CommunityLayout = React.lazy(() => import("./layouts/CommunityLayout"));
const CommunityHome = React.lazy(() => import("./pages/community/CommunityHome"));
const ModeratorDashboard = React.lazy(() => import("./pages/community/ModeratorDashboard"));

import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (cache unused data for 30m)
      retry: 2, // Retry failed requests twice
    },
    mutations: {
      retry: 1,
    }
  },
});

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

/**
 * Error Boundary for graceful error handling.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-danger/8 border border-danger/15 flex items-center justify-center text-danger mx-auto mb-5">
              <span className="text-2xl font-bold">!</span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-white mb-3">
              Something went wrong
            </h1>
            <p className="text-sm font-medium text-text-muted mb-6 leading-relaxed">
              An unexpected error occurred. Please refresh the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary py-3 px-6"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              
              {/* PUBLIC AUTHENTICATION ROUTES */}
              <Route path="/login" element={<Login />} />
              <Route path="/verify-login-otp" element={<VerifyOtp />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-register-otp" element={<VerifyRegisterOtp />} />

              {/* SECURE APPLICATION ROUTING (Main Layout) */}
              <Route
                element={
                  <ProtectedRoute>
                    <SocketProvider>
                      <MainLayout />
                    </SocketProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
                <Route path="/profile/edit" element={<Suspense fallback={<PageLoader />}><EditProfile /></Suspense>} />
                <Route path="/courses" element={<Suspense fallback={<PageLoader />}><Courses /></Suspense>} />
                <Route path="/courses/:courseId" element={<Suspense fallback={<PageLoader />}><CourseChapters /></Suspense>} />
                <Route path="/courses/:courseId/chapters" element={<Suspense fallback={<PageLoader />}><CourseChapters /></Suspense>} />
                <Route path="/courses/:courseId/chapters/:chapterCode/classes" element={<Suspense fallback={<PageLoader />}><CourseClasses /></Suspense>} />
                <Route path="/courses/class/:classId" element={<Suspense fallback={<PageLoader />}><ClassView /></Suspense>} />
                <Route path="/my-learning" element={<Suspense fallback={<PageLoader />}><MyLearning /></Suspense>} />
                <Route path="/my-points" element={<Suspense fallback={<PageLoader />}><MyPoints /></Suspense>} />
                <Route path="/active-sessions" element={<Suspense fallback={<PageLoader />}><ActiveSessions /></Suspense>} />
                <Route path="/audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />
              </Route>

              {/* SECURE COMMUNITY ROUTING */}
              <Route
                element={
                  <ProtectedRoute>
                    <SocketProvider>
                      <Suspense fallback={<PageLoader />}>
                        <CommunityLayout />
                      </Suspense>
                    </SocketProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/community" element={<Suspense fallback={<PageLoader />}><CommunityHome /></Suspense>} />
                <Route path="/community/moderator" element={<Suspense fallback={<PageLoader />}><ModeratorDashboard /></Suspense>} />
              </Route>

              {/* 404 — NOT FOUND */}
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NotFoundPage />
                  </Suspense>
                }
              />

            </Routes>

            {/* Global Troubleshoot Error Reporter */}
            <TroubleshootReporter />
          </BrowserRouter>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
