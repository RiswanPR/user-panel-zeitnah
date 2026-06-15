import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function Register() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("register");
  const [registerData, setRegisterData] = useState({ name: "", email: "" });
  const [loginData, setLoginData] = useState({ email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (error) =>
    error.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again.";

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData((d) => ({ ...d, [name]: value }));
    if (error) setError("");
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((d) => ({ ...d, [name]: value }));
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
      await api.post("/auth/register/send-otp", { name, email });
      localStorage.setItem("register_name", name);
      localStorage.setItem("register_email", email);
      navigate("/verify-register-otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = loginData.email.trim();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/login/send-otp", { email });
      localStorage.setItem("login_email", email);
      navigate("/verify-otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute top-[-100px] right-[-80px] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-60px] w-[340px] h-[340px] bg-cyan-500/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md">

        {/* Top accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-violet-400 to-transparent rounded-full" />

        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-0 text-center">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>

            <h1
              className="text-3xl font-bold text-white tracking-tight mb-1"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {activeTab === "register" ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm text-white/38 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {activeTab === "register"
                ? "Join us — it only takes a minute"
                : "Sign in with your email via OTP"}
            </p>

            {/* Tabs */}
            <div className="flex bg-white/[0.04] rounded-xl p-1 mb-0">
              {["register", "login"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-white/[0.08] text-white shadow-sm"
                      : "text-white/40 hover:text-white/65"
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {tab === "register" ? "Create account" : "Sign in"}
                </button>
              ))}
            </div>
          </div>

          {/* Form area */}
          <div className="px-8 pt-6 pb-8">

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
              </div>
            )}

            {/* ── REGISTER FORM ── */}
            {activeTab === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-white/22 group-focus-within:text-violet-400 transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
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
                      className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/18 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-violet-400/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-400/20 transition-all duration-200"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-white/22 group-focus-within:text-violet-400 transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
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
                      className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/18 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-violet-400/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-400/20 transition-all duration-200"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden rounded-xl py-3.5 mt-2 text-sm font-semibold text-[#0a0a0a] bg-violet-400 hover:bg-violet-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
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
                        Sending OTP…
                      </>
                    ) : (
                      <>
                        Create account
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}

            {/* ── LOGIN FORM ── */}
            {activeTab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-white/22 group-focus-within:text-cyan-400 transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/18 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-cyan-400/20 transition-all duration-200"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden rounded-xl py-3.5 mt-2 text-sm font-semibold text-[#0a0a0a] bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
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
              </form>
            )}

            {/* Footer note */}
            <p className="text-center text-xs text-white/18 mt-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {activeTab === "register"
                ? "A 6-digit OTP will be sent to verify your email"
                : "We'll send a 6-digit code to your inbox"}
            </p>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="h-[1px] w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500&display=swap');
      `}</style>
    </div>
  );
}

export default Register;