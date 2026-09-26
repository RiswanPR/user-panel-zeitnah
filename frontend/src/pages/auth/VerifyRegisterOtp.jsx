import { useContext, useState, useRef } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDeviceId } from "../../utils/device";
import storage from "../../services/storage";
import { isMobile } from "react-device-detect";
import { UAParser } from "ua-parser-js";
import AuthPremiumBackground from "../../components/ui/AuthPremiumBackground";

function VerifyRegisterOtp() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const inputsRef = useRef([]);
  const name = storage.getItem("register_name") || "";
  const email = storage.getItem("register_email") || "";
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(b.length) + c);

  // Per-box OTP input focus matrix
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
      name,
      email,
      otp: otpString,
      deviceId,
      deviceType: isMobile ? "mobile" : "desktop",
      browser: parser.getBrowser().name || "Unknown",
      os: parser.getOS().name || "Unknown",
      ...(force ? { forceLogin: true } : {}),
    };
  };

  const finalizeRegister = (res) => {
    storage.setAccessToken(res.data.token);
    if (res.data.refreshToken) {
      storage.setRefreshToken(res.data.refreshToken);
    }
    if (res.data.sessionExpiresAt) {
      storage.setSessionExpiresAt(res.data.sessionExpiresAt);
    }
    setUser(res.data.user);
    storage.removeItem("register_name");
    storage.removeItem("register_email");
    setSuccess("Account created! Redirecting…");
    setTimeout(() => navigate("/courses"), 1200);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpString.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const payload = await buildPayload();
      const res = await api.post("/auth/register/verify-otp", payload);

      if (res.data.replaceDevice) {
        setPendingPayload(payload);
        setShowConfirm(true);
        setLoading(false);
        return;
      }
      finalizeRegister(res);
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
      const res = await api.post("/auth/register/verify-otp", { ...pendingPayload, forceLogin: true });
      finalizeRegister(res);
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Something went wrong.");
    } finally {
      setLoading(false);
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
              You've reached your device limit. Continuing will sign out your oldest registered device profile.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => handleConfirmReplace(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white/55 border border-white/[0.08] hover:border-white/20 hover:text-white transition-all duration-200 cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
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

      {/* CORE FORM CARD */}
      <div className="relative w-full max-w-md z-10 flex flex-col items-center">
        <div className="w-full auth-glass-card px-6 sm:px-8 py-10 auth-animate-in-scale overflow-hidden flex flex-col">

          {/* Logo */}
          <div className="auth-logo-container mx-auto mb-7 auth-animate-in auth-stagger-1">
            <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
          </div>

          {/* Verification Icon + Heading */}
          <div className="text-center mb-8 w-full flex flex-col items-center auth-animate-in auth-stagger-2">
            <div className="w-12 h-12 rounded-2xl bg-[#9fd5b2]/8 border border-[#9fd5b2]/15 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#9fd5b2]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 className="text-2xl font-heading font-black text-white tracking-tight mb-2">
              Verify your email
            </h1>
            <p className="text-sm text-white/40 font-medium">
              Almost there{name ? <>, <span className="text-white/60 font-semibold">{name.split(" ")[0]}</span>!</> : "!"}  We sent a code to
            </p>
            <p className="text-sm text-[#9fd5b2] font-semibold mt-1 tracking-wide break-all px-2">
              {maskedEmail}
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="w-full flex flex-col">

            {/* OTP Input Grid */}
            <div
              className="flex gap-2 sm:gap-2.5 justify-center mb-7 w-full auth-animate-in auth-stagger-3"
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
                type="submit"
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
                    Complete Registration
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mt-7 auth-animate-in auth-stagger-5">
            <div className="auth-step-dot auth-step-dot-inactive" />
            <div className="auth-step-dot auth-step-dot-active" />
          </div>
          <p className="text-center text-[10px] uppercase font-bold tracking-widest text-white/25 mt-2.5 auth-animate-in auth-stagger-5">
            Step 2 of 2 — Email verification
          </p>

          {/* Divider */}
          <div className="auth-divider mt-6 mb-5 auth-animate-in auth-stagger-6" />

          {/* Back Link */}
          <div className="text-center w-full auth-animate-in auth-stagger-7">
            <button
              onClick={() => navigate("/register")}
              className="auth-link-btn mx-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyRegisterOtp;