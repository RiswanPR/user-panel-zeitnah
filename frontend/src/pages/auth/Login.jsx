import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import storage from "../../services/storage";
import AuthPremiumBackground from "../../components/ui/AuthPremiumBackground";

function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // SECURE DISPATCH OTP ROUTINE
  const handleSendOtp = async () => {
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      setLoading(true);
      // Slow network warning timer
      const slowTimer = setTimeout(() => {
        setError("Network seems slow, please wait...");
      }, 5000);

      await api.post("/auth/login/send-otp", { email });
      clearTimeout(slowTimer);
      storage.setItem("login_email", email);
      navigate("/verify-login-otp");
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page selection:bg-[#f6ed4a] selection:text-[#07192a]">

      {/* Premium Animated Background */}
      <AuthPremiumBackground />

      {/* ── MAIN CONTENT LAYER ── */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row w-full">

        {/* LEFT HERO PANEL (Desktop Only) */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-24 relative select-none">
          <div className="max-w-2xl space-y-7 auth-animate-in">

            {/* Brand Identity */}
            <div className="flex items-center gap-4 mb-2 auth-animate-in auth-stagger-1">
              <div className="auth-logo-container">
                <img
                  src="/zeitnah-logo.png"
                  alt="Zeitnah Group of Institutions Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-heading font-black text-2xl tracking-wider uppercase text-white block leading-none">
                  Zeitnah
                </span>
                <span className="text-[11px] font-bold tracking-widest text-[#9fd5b2] uppercase block mt-1">
                  Group of Institutions
                </span>
              </div>
            </div>

            {/* Platform Badge */}
            <div className="auth-animate-in auth-stagger-2">
              <span className="auth-security-badge">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Future Focused Learning Platform
              </span>
            </div>

            {/* Hero Headline */}
            <h1 className="font-heading font-black text-5xl xl:text-[3.5rem] text-white tracking-tight leading-[1.08] auth-animate-in auth-stagger-3">
              Build Your{" "}
              <span className="text-[#f6ed4a] inline-block" style={{
                textShadow: "0 0 40px rgba(246, 237, 74, 0.15)"
              }}>Future</span>
              <br />
              With Confidence.
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base font-medium text-white/45 max-w-xl leading-relaxed auth-animate-in auth-stagger-4">
              Industry-focused learning architectures engineered to transform ambitious tech students into premium, elite engineering professionals.
            </p>

            {/* Platform Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-2 max-w-lg auth-animate-in auth-stagger-5">
              <div className="auth-stat-card">
                <h3 className="text-xl sm:text-2xl font-heading font-black text-[#f6ed4a] leading-none">
                  5000+
                </h3>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                  Students
                </p>
              </div>

              <div className="auth-stat-card">
                <h3 className="text-xl sm:text-2xl font-heading font-black text-[#9fd5b2] leading-none">
                  100+
                </h3>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                  Courses
                </p>
              </div>

              <div className="auth-stat-card">
                <h3 className="text-xl sm:text-2xl font-heading font-black leading-none" style={{ color: "#38bdf8" }}>
                  95%
                </h3>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                  Success Rate
                </p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-3 pt-2 auth-animate-in auth-stagger-6">
              <div className="flex -space-x-2">
                {["#f6ed4a", "#9fd5b2", "#38bdf8", "#a78bfa"].map((color, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-[#0a1628] flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${color}30, ${color}60)` }}
                  >
                    <svg className="w-3 h-3" style={{ color }} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                    </svg>
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-semibold text-white/35">
                <span className="text-white/55">5,000+</span> students already learning
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: SIGN IN CARD */}
        <div className="flex flex-col flex-1 items-center justify-center w-full lg:max-w-[540px] px-5 sm:px-8 py-10 lg:border-l lg:border-white/[0.03]">
          <div className="w-full max-w-[420px] flex flex-col items-center">

            {/* Mobile Logo Header */}
            <div className="lg:hidden mb-8 flex items-center gap-3 select-none auth-animate-in">
              <div className="auth-logo-container" style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.875rem" }}>
                <img
                  src="/zeitnah-logo.png"
                  alt="Zeitnah Group of Institutions Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-heading font-black text-lg tracking-wider text-white uppercase block leading-none">Zeitnah</span>
                <span className="text-[9px] font-bold tracking-widest text-[#9fd5b2] uppercase block mt-0.5">Learning Platform</span>
              </div>
            </div>

            {/* Auth Card */}
            <div className="w-full auth-glass-card px-6 py-10 sm:p-10 auth-animate-in-scale auth-stagger-2">

              {/* Card Header */}
              <div className="mb-8">
                <h2 className="text-2xl sm:text-[1.75rem] font-heading font-black text-white tracking-tight leading-none mb-2.5">
                  Welcome Back
                </h2>
                <p className="text-xs sm:text-sm font-medium text-white/40 leading-relaxed">
                  Sign in to continue your learning journey.
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-5 w-full">
                <div className="auth-animate-in auth-stagger-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2]/80 mb-2.5">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
                      <svg className="w-4 h-4 text-white/20 group-focus-within:text-[#9fd5b2] transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                      className="auth-premium-input auth-premium-input-with-icon"
                      autoComplete="email"
                    />
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="mt-3 auth-error-alert">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span className="leading-tight">{error}</span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="auth-animate-in auth-stagger-4">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="auth-premium-btn"
                  >
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
                        Continue with OTP
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>

                {/* Security Badges */}
                <div className="flex items-center justify-center gap-2 pt-1 auth-animate-in auth-stagger-5">
                  {["End-to-End Encrypted", "Secure OTP", "Trusted Platform"].map((label, i) => (
                    <span key={i} className="auth-security-badge" style={{ padding: "0.25rem 0.5rem", fontSize: "0.55rem" }}>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      {label}
                    </span>
                  ))}
                </div>

                {/* Divider */}
                <div className="auth-divider auth-animate-in auth-stagger-6" />

                {/* Register Link */}
                <div className="text-center auth-animate-in auth-stagger-7">
                  <p className="text-xs text-white/30 mb-2 font-medium">Don&apos;t have an account yet?</p>
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="auth-link-btn mx-auto"
                  >
                    Create New Account
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;