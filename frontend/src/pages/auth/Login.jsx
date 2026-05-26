import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/login/send-otp", { email });
      localStorage.setItem("login_email", email);
      navigate("/verify-login-otp");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Something went wrong. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute top-[-120px] left-[-100px] w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-80px] w-[360px] h-[360px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md">

        {/* Top accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full mb-0" />

        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl px-8 py-10 shadow-2xl shadow-black/60 backdrop-blur-sm">

          {/* Logo / Brand mark */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold text-white tracking-tight mb-2"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Welcome back
            </h1>
            <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Enter your email to receive a one-time passcode
            </p>
          </div>

          {/* Email input */}
          <div className="mb-5">
            <label
              className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-widest"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/25 group-focus-within:text-cyan-400 transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-cyan-400/20 transition-all duration-200"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                autoComplete="email"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-2.5 flex items-start gap-2 text-red-400 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* Send OTP Button */}
          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full relative group overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-[#0a0a0a] bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {/* Shimmer effect on hover */}
            <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending OTP…
                </>
              ) : (
                <>
                  Send OTP
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-white/25" style={{ fontFamily: "'DM Sans', sans-serif" }}>or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Register redirect */}
          <button
            onClick={() => navigate("/register")}
            className="w-full py-3.5 rounded-xl text-sm font-medium text-white/60 border border-white/[0.08] hover:border-white/20 hover:text-white/90 hover:bg-white/[0.03] transition-all duration-200 active:scale-[0.98]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Create a new account
          </button>

          {/* Footer note */}
          <p className="text-center text-xs text-white/20 mt-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            We'll send a 6-digit code to your email
          </p>
        </div>

        {/* Bottom accent bar */}
        <div className="h-[1px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent mt-0" />
      </div>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500&display=swap');
      `}</style>
    </div>
  );
}

export default Login;