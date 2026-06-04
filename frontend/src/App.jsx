import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import VerifyOtp from "./pages/auth/VerifyLoginOtp";
import Register from "./pages/auth/Register";
import VerifyRegisterOtp from "./pages/auth/VerifyRegisterOtp";

import Home from "./pages/home/Home";

import ActiveSessions from "./pages/sessions/ActiveSessions";
import AuditLogs from "./pages/audit/AuditLogs";

import Profile from "./pages/profile/Profile";
import EditProfile from "./pages/profile/EditProfile";

import Courses
  from "./pages/courses/Courses";
import CourseChapters
  from "./pages/courses/CourseChapters";
import CourseClasses
  from "./pages/courses/CourseClasses";
import ClassView
  from "./pages/courses/ClassView";

import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";

import MainLayout from "./layouts/MainLayout";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* AUTH */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/verify-login-otp"
          element={<VerifyOtp />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/verify-register-otp"
          element={<VerifyRegisterOtp />}
        />

        {/* HOME */}
        <Route
          path="/"
          element={
            <ProtectedRoute>

              <MainLayout>

                <Home />

              </MainLayout>

            </ProtectedRoute>
          }
        />

        {/* PROFILE */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>

              <MainLayout>

                <Profile />

              </MainLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>

              <MainLayout>

                <EditProfile />

              </MainLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/courses"
          element={
            <ProtectedRoute>

              <MainLayout>

                <Courses />

              </MainLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/courses/:courseId/chapters"
          element={
            <ProtectedRoute>

              <MainLayout>

                <CourseChapters />

              </MainLayout>

            </ProtectedRoute>
          }
        />

        <Route
          path="/courses/:courseId/chapters/:chapterCode/classes"
          element={
            <ProtectedRoute>

              <MainLayout>

                <CourseClasses />

              </MainLayout>

            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/class/:classId"
          element={
            <ProtectedRoute>

              <MainLayout>

                <ClassView />

              </MainLayout>

            </ProtectedRoute>
          }
        />
        {/* SESSIONS */}
        <Route
          path="/active-sessions"
          element={
            <ProtectedRoute>

              <MainLayout>

                <ActiveSessions />

              </MainLayout>

            </ProtectedRoute>
          }
        />

        {/* AUDIT */}
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>

              <MainLayout>

                <AuditLogs />

              </MainLayout>

            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            <Navigate to="/profile" />
          }
        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;