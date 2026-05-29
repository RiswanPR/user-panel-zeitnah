import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";

import VerifyOtp from "./pages/auth/VerifyLoginOtp";

import Register from "./pages/auth/Register";

import VerifyRegisterOtp from "./pages/auth/VerifyRegisterOtp";

import Home from "./pages/home/Home";

import ActiveSessions from "./pages/sessions/ActiveSessions";

import AuditLogs from "./pages/audit/AuditLogs";

import Profile from "./pages/profile/Profile";

import EditProfile from "./pages/profile/EditProfile";

import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* AUTH */}

        <Route path="/login" element={<Login />} />

        <Route path="/verify-login-otp" element={<VerifyOtp />} />

        <Route path="/register" element={<Register />} />

        <Route path="/verify-register-otp" element={<VerifyRegisterOtp />} />

        {/* HOME */}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* PROFILE */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />
        {/* SESSIONS */}

        <Route
          path="/active-sessions"
          element={
            <ProtectedRoute>
              <ActiveSessions />
            </ProtectedRoute>
          }
        />

        {/* AUDIT */}

        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
