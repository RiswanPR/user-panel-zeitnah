import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Auth Components
import Login from "./pages/auth/Login";
import VerifyOtp from "./pages/auth/VerifyLoginOtp";
import Register from "./pages/auth/Register";
import VerifyRegisterOtp from "./pages/auth/VerifyRegisterOtp";

// Application Views
import Home from "./pages/home/Home";
import ActiveSessions from "./pages/sessions/ActiveSessions";
import AuditLogs from "./pages/audit/AuditLogs";
import Profile from "./pages/profile/Profile";
import EditProfile from "./pages/profile/EditProfile";

// Security & Layout Infrastructure
import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* PUBLIC AUTHENTICATION ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-login-otp" element={<VerifyOtp />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-register-otp" element={<VerifyRegisterOtp />} />

        {/* SECURE APPLICATION ROUTING (Nested Wrapper Structure) */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* All inner components automatically render within ProtectedRoute & MainLayout */}
          <Route path="/" element={<Home />} />
          
          {/* Profile Paths */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          
          {/* Administration & Tracking Paths */}
          <Route path="/active-sessions" element={<ActiveSessions />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
        </Route>

        {/* FALLBACK REDIRECTION */}
        <Route path="*" element={<Navigate to="/profile" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;