import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import storage from "../../services/storage";
import ZeitnahDoodleBackground from "../../components/ui/ZeitnahDoodleBackground";

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
    <div className="min-h-screen relative overflow-hidden font-body antialiased selection:bg-[#f6ed4a] selection:text-[#07192a]">

      {/* Integrated High-Fidelity Custom Circuit Doodle Backdrop */}
      <ZeitnahDoodleBackground />

      {/* ── INTERACTIVE WORKSPACE NODE CONTENT ── */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row w-full">

        {/* LEFT PRIMARY PANEL: BRAND INSIGHT HERO (DESKTOP ONLY) */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-24 relative select-none">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl border border-[rgba(159,213,178,0.3)] overflow-hidden shadow-2xl bg-[#07192a] flex items-center justify-center shrink-0">
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

            <span className="inline-flex items-center rounded-lg border border-[rgba(159,213,178,0.25)] bg-[rgba(159,213,178,0.06)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2]">
              Future Focused Learning Platform
            </span>

            <h1 className="font-heading font-black text-5xl xl:text-6xl text-white tracking-tight leading-[1.1] pt-2">
              Build Your <span className="text-[#f6ed4a] block sm:inline">Future</span> <span className="block">With Confidence.</span>
            </h1>

            <p className="text-sm sm:text-base font-medium text-white/50 max-w-xl leading-relaxed">
              Industry-focused learning architectures engineered to transform ambitious tech students into premium, elite engineering professionals.
            </p>

            {/* Platform Metrics Micro Grid */}
            <div className="grid grid-cols-3 gap-4 pt-6 max-w-lg">
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
                <h3 className="text-xl sm:text-2xl font-heading font-black text-[#f6ed4a] leading-none">
                  5000+
                </h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Students
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
                <h3 className="text-xl sm:text-2xl font-heading font-black text-[#9fd5b2] leading-none">
                  100+
                </h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Courses
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-center">
                <h3 className="text-xl sm:text-2xl font-heading font-black text-white leading-none" style={{ color: '#38bdf8' }}>
                  95%
                </h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Success Rate
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECONDARY PANEL: SIGN IN CONTROL CARD CONTEXT */}
        <div className="flex flex-col flex-1 items-center justify-center w-full lg:w-[520px] px-4 sm:px-6 py-10 lg:bg-[#07192a]/10 lg:backdrop-blur-xs lg:border-l lg:border-white/[0.03]">
          <div className="w-full max-w-md flex flex-col items-center">

            {/* Mobile Title Viewport Badge Indicator Header */}
            <div className="lg:hidden mb-8 flex items-center gap-3 select-none">
              <div className="w-12 h-12 rounded-xl border border-[rgba(159,213,178,0.3)] overflow-hidden shadow-lg bg-[#07192a] flex items-center justify-center shrink-0">
                <img
                  src="/zeitnah-logo.png"
                  alt="Zeitnah Group of Institutions Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-heading font-black text-xl tracking-wider text-white uppercase block leading-none">Zeitnah</span>
                <span className="text-[10px] font-bold tracking-widest text-[#9fd5b2] uppercase block mt-1">Learning Platform</span>
              </div>
            </div>

            {/* HIGH FIDELITY AUTH COMPONENT OVERFLOW STRUCTURE */}
            <div className="w-full glass-card px-6 py-10 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />

              <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight leading-none mb-2 text-left">
                Welcome Back
              </h2>

              <p className="text-xs sm:text-sm font-medium text-white/45 mb-8 text-left">
                Sign in to authorize parameters and continue your library journey.
              </p>

              {/* INPUT ELEMENT FIELD MAP ENGINE */}
              <div className="space-y-5 w-full flex flex-col">
                <div className="w-full">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9fd5b2] mb-2 text-left">
                    Academic Email Address
                  </label>

                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="w-full glass-input h-13 px-4 text-xs sm:text-sm placeholder-white/20 font-medium block"
                    autoComplete="email"
                  />

                  {/* Operational Validation Feedback Alert Interceptor */}
                  {error && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg w-full">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="leading-tight">{error}</span>
                    </div>
                  )}
                </div>

                {/* DISPATCH ACTION CTA DISPATCHER — SHIFT TO GRADIENT BRAND ACCENT */}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full h-13 relative group overflow-hidden rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#07192a] bg-[#f6ed4a] hover:shadow-[0_0_25px_rgba(246,237,74,0.25)] transition-all duration-150 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer block"
                >
                  <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="relative">
                    {loading ? "Sending OTP Token…" : "Continue with OTP"}
                  </span>
                </button>

                {/* Secure Parameter Identifiers Status Micro Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center select-none w-full">
                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] py-2 px-1 text-[9px] font-bold uppercase tracking-wider text-white/40 truncate">
                    Secure OTP
                  </div>
                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] py-2 px-1 text-[9px] font-bold uppercase tracking-wider text-white/40 truncate">
                    Node Protected
                  </div>
                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] py-2 px-1 text-[9px] font-bold uppercase tracking-wider text-white/40 truncate">
                    Trusted LMS
                  </div>
                </div>

                {/* REGISTRATION REDIRECT CONVERSIONS FLIP */}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="w-full pt-2 text-xs font-semibold tracking-wider uppercase text-white/40 hover:text-[#9fd5b2] transition-colors duration-150 cursor-pointer bg-transparent border-0 outline-none inline-block text-center"
                >
                  Create New Account
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;