import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth Components
import Login from "./pages/auth/Login";
import VerifyOtp from "./pages/auth/VerifyLoginOtp";
import Register from "./pages/auth/Register";
import VerifyRegisterOtp from "./pages/auth/VerifyRegisterOtp";

// Context
import { SocketProvider } from "./context/SocketContext";

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

import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-mint"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      {/* We wrap ProtectedRoute contents in SocketProvider if we only want it for logged-in users, but it's easier to put it inside ProtectedRoute or wrap everything and handle null user inside provider. Let's keep it simple. */}
      <Routes>
        
        {/* PUBLIC AUTHENTICATION ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-login-otp" element={<VerifyOtp />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-register-otp" element={<VerifyRegisterOtp />} />

        {/* SECURE APPLICATION ROUTING */}
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

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            <Navigate to="/dashboard" />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
