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
import Courses from "./pages/courses/Courses";
import CourseChapters from "./pages/courses/CourseChapters";
import CourseClasses from "./pages/courses/CourseClasses";
import ClassView from "./pages/courses/ClassView";
import MyLearning from "./pages/learning/MyLearning";
import MyPoints from "./pages/learning/MyPoints";

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
          <Route path="/" element={<Navigate to="/profile" />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId/chapters" element={<CourseChapters />} />
          <Route path="/courses/:courseId/chapters/:chapterCode/classes" element={<CourseClasses />} />
          <Route path="/courses/class/:classId" element={<ClassView />} />
          <Route path="/my-learning" element={<MyLearning />} />
          <Route path="/my-points" element={<MyPoints />} />
          <Route path="/active-sessions" element={<ActiveSessions />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
        </Route>

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
