import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import storage from "../../services/storage";
import AuthPremiumBackground from "../../components/ui/AuthPremiumBackground";

function Register() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("register");
  const [registerData, setRegisterData] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData((d) => ({ ...d, [name]: value }));
    if (error) setError("");
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const name = registerData.name.trim();
    const email = registerData.email.trim();
    if (!name || !email) {
      setError("Please enter your full name and email address.");
      return;
    }
    try {
      setLoading(true);
      const slowTimer = setTimeout(() => {
        setError("Network seems slow, please wait...");
      }, 5000);

      await api.post("/auth/register/send-otp", { name, email });
      clearTimeout(slowTimer);
      storage.setItem("register_name", name);
      storage.setItem("register_email", email);
      navigate("/verify-register-otp");
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page selection:bg-[#f6ed4a] selection:text-[#07192a] text-white flex items-center justify-center px-4 py-12">

      {/* Premium Animated Background */}
      <AuthPremiumBackground />

      {/* ── MAIN CARD ── */}
      <div className="relative w-full max-w-md z-10">
        <div className="auth-glass-card auth-animate-in-scale overflow-hidden">

          {/* Header Section */}
          <div className="px-7 sm:px-9 pt-9 pb-0 text-center flex flex-col items-center">

            {/* Logo */}
            <div className="auth-logo-container mb-6 auth-animate-in auth-stagger-1">
              <img src="/zeitnah-logo.png" alt="Zeitnah Logo" className="w-full h-full object-cover" />
            </div>

            {/* Heading */}
            <div className="auth-animate-in auth-stagger-2">
              <h1 className="text-2xl sm:text-[1.75rem] font-heading font-black text-white tracking-tight mb-2 leading-tight">
                {activeTab === "register" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-white/40 mb-7 font-medium leading-relaxed">
                {activeTab === "register"
                  ? "Join Zeitnah — it only takes a minute to get started"
                  : "Sign in with your email via OTP"}
              </p>
            </div>

            {/* Tab Selector */}
            <div className="w-full flex rounded-xl p-1 mb-0 auth-animate-in auth-stagger-3"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(159, 213, 178, 0.08)"
              }}
            >
              {["register"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={`flex-1 py-2.5 rounded-lg text-[11px] font-semibold tracking-wider uppercase transition-all duration-300 border ${
                    activeTab === tab
                      ? "bg-white/[0.06] text-white shadow-sm border-white/[0.06]"
                      : "text-white/35 hover:text-white/60 border-transparent"
                  }`}
                >
                  {tab === "register" ? "Create account" : "Sign in"}
                </button>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="px-7 sm:px-9 pt-7 pb-9 flex flex-col w-full">

            {/* Error Alert */}
            {error && (
              <div className="mb-5 auth-error-alert w-full">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="leading-tight">{error}</p>
              </div>
            )}

            {/* ── REGISTER FORM ── */}
            {activeTab === "register" && (
              <form onSubmit={handleRegister} className="space-y-5 w-full flex flex-col">

                {/* Full Name */}
                <div className="auth-animate-in auth-stagger-4">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2]/80 mb-2.5">
                    Full Name
                  </label>
                  <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
                      <svg className="w-4 h-4 text-white/20 group-focus-within:text-[#9fd5b2] transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <input
                      id="register-name"
                      type="text"
                      name="name"
                      value={registerData.name}
                      onChange={handleRegisterChange}
                      placeholder="John Doe"
                      autoComplete="name"
                      className="auth-premium-input auth-premium-input-with-icon"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="auth-animate-in auth-stagger-5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2]/80 mb-2.5">
                    Email Address
                  </label>
                  <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
                      <svg className="w-4 h-4 text-white/20 group-focus-within:text-[#9fd5b2] transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <input
                      id="register-email"
                      type="email"
                      name="email"
                      value={registerData.email}
                      onChange={handleRegisterChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="auth-premium-input auth-premium-input-with-icon"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="auth-animate-in auth-stagger-6 pt-1">
                  <button
                    type="submit"
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
                        Create Account
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mt-7 auth-animate-in auth-stagger-7">
              <div className="auth-step-dot auth-step-dot-active" />
              <div className="auth-step-dot auth-step-dot-inactive" />
            </div>
            <p className="text-center text-[10px] uppercase font-bold tracking-widest text-white/25 mt-2.5 auth-animate-in auth-stagger-7">
              Step 1 of 2 — Enter details
            </p>

            {/* Divider */}
            <div className="auth-divider mt-6 mb-5 auth-animate-in auth-stagger-7" />

            {/* Info + Login Link */}
            <div className="text-center auth-animate-in auth-stagger-8">
              <p className="text-xs text-white/35 font-medium leading-relaxed mb-3">
                A 6-digit OTP will be sent to verify your email
              </p>
              <p className="text-xs text-white/25 font-medium">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-[#9fd5b2]/70 hover:text-[#9fd5b2] font-semibold transition-colors duration-200 cursor-pointer bg-transparent border-0 outline-none uppercase tracking-wider text-[11px]"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;