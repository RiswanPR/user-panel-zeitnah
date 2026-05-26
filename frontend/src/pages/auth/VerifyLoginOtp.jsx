import { useState, useEffect, useContext, useRef } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDeviceId } from "../../utils/device";
import { isMobile } from "react-device-detect";
import { UAParser } from "ua-parser-js";

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
  const email = localStorage.getItem("login_email") || "";
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
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    localStorage.removeItem("login_email");
    setSuccess("Login successful! Redirecting…");
    setTimeout(() => navigate("/"), 1200);
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
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
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
      setError(err.response?.data?.message || "Something went wrong.");
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
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Glow blobs */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-60px] w-[300px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Device replace confirm modal */}
      {showConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#161616] border border-white/10 rounded-2xl p-7 max-w-sm w-full shadow-2xl">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-base mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>Replace existing device?</h3>
            <p className="text-white/45 text-sm mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              You've reached your device limit. Continuing will sign out your oldest registered device.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmReplace(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/55 border border-white/[0.08] hover:border-white/20 hover:text-white/80 transition-all duration-200"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmReplace(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#0a0a0a] bg-amber-400 hover:bg-amber-300 transition-all duration-200"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Replace device
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full" />

        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl px-8 py-10 shadow-2xl shadow-black/60">

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
            </svg>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
              Check your email
            </h1>
            <p className="text-sm text-white/38" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              We sent a 6-digit code to
            </p>
            <p className="text-sm text-cyan-400 font-medium mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {maskedEmail}
            </p>
          </div>

          {/* 6-box OTP Input */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handleBoxPaste}>
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
                className={`w-11 h-13 text-center text-xl font-bold text-white bg-white/[0.04] border rounded-xl outline-none transition-all duration-200 focus:bg-white/[0.07] focus:ring-1 ${
                  error
                    ? "border-red-500/50 focus:border-red-400/70 focus:ring-red-400/20"
                    : digit
                    ? "border-cyan-400/50 focus:border-cyan-400/70 focus:ring-cyan-400/20"
                    : "border-white/[0.08] focus:border-cyan-400/60 focus:ring-cyan-400/20"
                }`}
                style={{ fontFamily: "'Sora', sans-serif", height: "52px" }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-emerald-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>{success}</p>
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={handleVerifyOtp}
            disabled={loading || otpString.length < 6}
            className="w-full relative group overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-[#0a0a0a] bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="relative flex items-center justify-center gap-2">
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
                  Verify & Sign in
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </span>
          </button>

          {/* Resend */}
          <div className="text-center mt-5">
            {timer > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <div className="relative w-5 h-5">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                    <circle
                      cx="10" cy="10" r="8" fill="none"
                      stroke="#22d3ee" strokeWidth="2"
                      strokeDasharray={`${(50.27 * (30 - timer)) / 30} 50.27`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span className="text-sm text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Resend code in <span className="text-white/60 font-medium">{timer}s</span>
                </span>
              </div>
            ) : (
              <button
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors duration-200 underline underline-offset-2 decoration-cyan-400/40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {resendLoading ? "Sending…" : "Resend OTP"}
              </button>
            )}
          </div>

          {/* Back link */}
          <div className="text-center mt-4">
            <button
              onClick={() => navigate("/login")}
              className="text-xs text-white/25 hover:text-white/50 transition-colors duration-200 flex items-center gap-1.5 mx-auto"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to login
            </button>
          </div>
        </div>

        <div className="h-[1px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500&display=swap');
      `}</style>
    </div>
  );
}

export default VerifyOtp;