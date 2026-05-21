import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";

import VerifyOtp from "./pages/auth/VerifyOtp";

import Register from "./pages/auth/Register";

import VerifyRegisterOtp from "./pages/auth/VerifyRegisterOtp";

import Home from "./pages/home/Home";

import ProtectedRoute from "./components/common/ProtectedRoute/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}

        <Route path="/login" element={<Login />} />

        {/* Verify OTP */}

        <Route path="/verify-login-otp" element={<VerifyOtp />} />

        {/* Protected Home */}
        <Route path="/register" element={<Register />} />

        <Route path="/verify-register-otp" element={<VerifyRegisterOtp />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* Redirect Unknown Routes */}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
