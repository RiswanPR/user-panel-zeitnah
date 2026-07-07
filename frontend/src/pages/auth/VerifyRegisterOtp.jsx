import { useContext, useState, useRef } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDeviceId } from "../../utils/device";
import { isMobile } from "react-device-detect";
import { UAParser } from "ua-parser-js";

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
  const name = localStorage.getItem("register_name") || "";
  const email = localStorage.getItem("register_email") || "";
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
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    localStorage.removeItem("register_name");
    localStorage.removeItem("register_email");
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
      const res = await api.post("/auth/register/verify-otp", { ...pendingPayload, forceLogin: true });
      finalizeRegister(res);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07192a] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden text-white">

      {/* WORKSTATION ACCUMULATION LIMIT OVERFLOW MODAL */}
      {showConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="bg-[#0d2035] border border-[rgba(159,213,178,0.15)] rounded-2xl p-7 max-w-sm w-full shadow-2xl flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-white font-heading font-bold text-base mb-2">Replace existing device?</h3>
            <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium mb-6 leading-relaxed">
              You've reached your device limit. Continuing will sign out your oldest registered device profile layout.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => handleConfirmReplace(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white/60 border border-white/[0.08] hover:border-white/20 hover:text-white transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmReplace(true)}
                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#07192a] bg-[#f6ed4a] hover:shadow-[0_0_15px_rgba(246,237,74,0.2)] transition-all duration-200 cursor-pointer"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE FRAMEWORK CARD */}
      <div className="relative w-full max-w-md z-10 flex flex-col items-center">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />

        <div className="w-full glass-card px-8 py-10 shadow-2xl flex flex-col relative overflow-hidden">

          {/* Secure Technical Verification Keyhole Envelope Icon */}
          <div className="w-14 h-14 rounded-2xl bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.25)] flex items-center justify-center mx-auto mb-6 text-[#9fd5b2] shadow-sm select-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.25v2.25m0 0a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" />
            </svg>
          </div>

          {/* Descriptive Messaging */}
          <div className="text-center mb-8 w-full flex flex-col items-center">
            <h1 className="text-2xl font-heading font-bold text-white tracking-tight mb-2">
              Verify your email
            </h1>
            <p className="text-sm text-[rgba(255,255,255,0.45)] font-medium">
              Almost there,{name ? <> <span className="text-white/70 font-semibold">{name.split(" ")[0]}</span>!</> : "!"} We sent a code to
            </p>
            <p className="text-sm text-[#9fd5b2] font-semibold mt-0.5 tracking-wide">
              {maskedEmail}
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="w-full flex flex-col">

            {/* 6-Box Discrete Key Tokens */}
            <div className="flex gap-2 justify-center mb-6 w-full" onPaste={handleBoxPaste}>
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
                  className={`w-11 h-13 text-center text-xl font-bold text-white bg-[rgba(7,25,42,0.6)] border rounded-xl outline-none transition-all duration-150 focus:ring-2 block ${error
                    ? "border-red-500/50 focus:border-red-400 focus:ring-red-400/10"
                    : digit
                      ? "border-[#9fd5b2] focus:border-[#9fd5b2] focus:ring-[#9fd5b2]/10"
                      : "border-[rgba(159,213,178,0.15)] focus:border-[#9fd5b2] focus:ring-[#9fd5b2]/10"
                    }`}
                  style={{ height: "52px" }}
                />
              ))}
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="mb-5 flex items-center gap-1.5 text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg w-full">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="leading-tight">{error}</p>
              </div>
            )}

            {/* Success Banner Box */}
            {success && (
              <div className="mb-5 flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-lg w-full">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <p className="leading-tight">{success}</p>
              </div>
            )}

            {/* Complete Execution Button */}
            <button
              type="submit"
              disabled={loading || otpString.length < 6}
              className="w-full relative group overflow-hidden rounded-xl py-3.5 text-xs font-extrabold uppercase tracking-wider text-[#07192a] bg-[#f6ed4a] hover:shadow-[0_0_20px_rgba(246,237,74,0.2)] disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 active:scale-[0.98] cursor-pointer block"
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
                    Complete Registration
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Sequential Step Matrix Pill Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 w-full">
            <div className="w-6 h-1 rounded-full bg-[rgba(159,213,178,0.2)]" />
            <div className="w-6 h-1 rounded-full bg-[#9fd5b2]" />
          </div>
          <p className="text-center text-[10px] uppercase font-bold tracking-widest text-[rgba(255,255,255,0.35)] mt-2.5 w-full">
            Step 2 of 2 — Email verification
          </p>

          {/* Back Redirect Link */}
          <div className="text-center mt-5 w-full">
            <button
              onClick={() => navigate("/register")}
              className="text-xs font-semibold tracking-wider uppercase text-[rgba(255,255,255,0.35)] hover:text-[#9fd5b2] transition-colors duration-200 flex items-center gap-1.5 mx-auto cursor-pointer"
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