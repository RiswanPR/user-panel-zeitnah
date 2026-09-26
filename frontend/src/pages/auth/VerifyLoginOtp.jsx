import { useState, useEffect, useContext, useRef } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDeviceId } from "../../utils/device";
import storage from "../../services/storage";
import { isMobile } from "react-device-detect";
import { UAParser } from "ua-parser-js";
import AuthPremiumBackground from "../../components/ui/AuthPremiumBackground";

function VerifyOtp() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const inputsRef = useRef([]);
  const email = storage.getItem("login_email") || "";
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(b.length) + c);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Handle per-box OTP input
  const handleBoxChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    setError("");
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleBoxKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleBoxPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...otp];
    pasted.split("").forEach((char, i) => { if (i < 6) updated[i] = char; });
    setOtp(updated);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const otpString = otp.join("");

  const buildPayload = async (force = false) => {
    const deviceId = await getDeviceId();
    const parser = new UAParser();
    return {
      email,
      otp: otpString,
      deviceId,
      deviceType: isMobile ? "mobile" : "desktop",
      browser: parser.getBrowser().name || "Unknown",
      os: parser.getOS().name || "Unknown",
      ...(force ? { forceLogin: true } : {}),
    };
  };

  const finalizeLogin = (res) => {
    storage.setAccessToken(res.data.token);
    if (res.data.refreshToken) {
      storage.setRefreshToken(res.data.refreshToken);
    }
    if (res.data.sessionExpiresAt) {
      storage.setSessionExpiresAt(res.data.sessionExpiresAt);
    }
    setUser(res.data.user);
    storage.removeItem("login_email");
    setSuccess("Login successful! Redirecting…");
    setTimeout(() => navigate("/courses"), 1200);
  };

  const handleVerifyOtp = async () => {
    if (otpString.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const payload = await buildPayload();
      const res = await api.post("/auth/login/verify-otp", payload);

      if (res.data.replaceDevice) {
        setPendingPayload(payload);
        setShowConfirm(true);
        setLoading(false);
        return;
      }
      finalizeLogin(res);
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReplace = async (confirmed) => {
    setShowConfirm(false);
    if (!confirmed) return;
    try {
      setLoading(true);
      const res = await api.post("/auth/login/verify-otp", { ...pendingPayload, forceLogin: true });
      finalizeLogin(res);
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
      setError("");
      await api.post("/auth/login/send-otp", { email });
      setTimer(30);
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      setSuccess("OTP resent successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page selection:bg-[#f6ed4a] selection:text-[#07192a] text-white flex flex-col items-center justify-center px-4 py-12">

      {/* Premium Background */}
      <AuthPremiumBackground />

      {/* DEVICE REPLACE CONFIRM MODAL */}
      {showConfirm && (
        <div className="auth-modal-overlay">
          <div className="auth-modal-card flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-white font-heading font-black text-base mb-2">Replace existing device?</h3>
            <p className="text-white/40 text-xs font-medium mb-6 leading-relaxed">
              You've reached your device limit. Continuing will sign out your oldest active registered workstation session.
            </p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => handleConfirmReplace(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white/55 border border-white/[0.08] hover:border-white/20 hover:text-white transition-all duration-200 cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReplace(true)}
                className="auth-premium-btn"
                style={{ flex: 1, padding: "0.625rem" }}
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE FORM */}
      <div className="relative w-full max-w-md z-10 flex flex-col items-center">
        <div className="w-full auth-glass-card px-5 sm:px-8 py-10 auth-animate-in-scale overflow-hidden flex flex-col">

          {/* Logo */}
          <div className="auth-logo-container mx-auto mb-7 auth-animate-in auth-stagger-1">
            <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
          </div>

          {/* Email Icon + Heading */}
          <div className="text-center mb-8 w-full flex flex-col items-center auth-animate-in auth-stagger-2">
            <div className="w-12 h-12 rounded-2xl bg-[#9fd5b2]/8 border border-[#9fd5b2]/15 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#9fd5b2]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-2xl font-heading font-black text-white tracking-tight mb-2">
              Check your email
            </h1>
            <p className="text-sm text-white/40 font-medium">
              We sent a 6-digit verification code to
            </p>
            <p className="text-sm text-[#9fd5b2] font-semibold mt-1 tracking-wide break-all px-2">
              {maskedEmail}
            </p>
          </div>

          {/* OTP Input Grid */}
          <div
            className="flex gap-2 sm:gap-2.5 justify-center mb-7 w-full max-w-full auth-animate-in auth-stagger-3"
            onPaste={handleBoxPaste}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleBoxChange(i, e.target.value)}
                onKeyDown={(e) => handleBoxKeyDown(i, e)}
                className={`auth-otp-box ${error ? "has-error" : digit ? "has-value" : ""}`}
                style={{
                  animationName: "authOtpBoxIn",
                  animationDuration: "0.4s",
                  animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  animationFillMode: "both",
                  animationDelay: `${0.15 + i * 0.06}s`,
                }}
              />
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 auth-error-alert w-full">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="leading-tight">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-5 auth-success-alert w-full">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="leading-tight">{success}</p>
            </div>
          )}

          {/* Verify Button */}
          <div className="auth-animate-in auth-stagger-4">
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading || otpString.length < 6}
              className="auth-premium-btn"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                <>
                  Verify & Sign In
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Resend Code Section */}
          <div className="text-center mt-7 w-full flex justify-center auth-animate-in auth-stagger-5">
            {timer > 0 ? (
              <div className="flex items-center justify-center gap-2.5">
                <div className="relative w-5 h-5">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
                    <circle
                      cx="10" cy="10" r="8" fill="none"
                      stroke="#9fd5b2" strokeWidth="1.5"
                      strokeDasharray={`${(50.27 * (30 - timer)) / 30} 50.27`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 1s linear" }}
                    />
                  </svg>
                </div>
                <span className="text-xs text-white/35 font-semibold uppercase tracking-wider">
                  Resend code in <span className="text-white font-bold">{timer}s</span>
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="auth-link-btn"
                style={{ textDecoration: "underline", textUnderlineOffset: "4px", textDecorationColor: "rgba(159, 213, 178, 0.3)" }}
              >
                {resendLoading ? "Sending…" : "Resend OTP Code"}
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="auth-divider mt-6 mb-5 auth-animate-in auth-stagger-6" />

          {/* Back Link */}
          <div className="text-center w-full auth-animate-in auth-stagger-7">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="auth-link-btn mx-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyOtp;