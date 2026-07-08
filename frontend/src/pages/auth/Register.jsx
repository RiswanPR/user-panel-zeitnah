import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

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
      localStorage.setItem("register_name", name);
      localStorage.setItem("register_email", email);
      navigate("/verify-register-otp");
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07192a] flex items-center justify-center px-4 py-12 relative overflow-hidden text-white">
      <div className="relative w-full max-w-md">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(159,213,178,0.25)] to-transparent z-20" />

        <div className="glass-card shadow-2xl relative overflow-hidden flex flex-col">
          {/* Header Section */}
          <div className="px-8 pt-8 pb-0 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[rgba(159,213,178,0.1)] border border-[rgba(159,213,178,0.25)] flex items-center justify-center mb-5 text-[#9fd5b2]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>

            <h1 className="text-2xl font-heading font-bold text-white tracking-tight mb-1.5">
              {activeTab === "register" ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm text-[rgba(255,255,255,0.45)] mb-6 font-medium">
              {activeTab === "register" ? "Join us — it only takes a minute" : "Sign in with your email via OTP"}
            </p>

            {/* Selection Navigation Tabs */}
            <div className="w-full flex bg-white/[0.03] border border-[rgba(159,213,178,0.1)] rounded-xl p-1 mb-0">
              {["register"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                    activeTab === tab ? "bg-white/[0.08] text-white shadow-sm border border-white/[0.05]" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {tab === "register" ? "Create account" : "Sign in"}
                </button>
              ))}
            </div>
          </div>

          {/* Form Content Layout */}
          <div className="px-8 pt-6 pb-8 flex flex-col w-full">
            {error && (
              <div className="mb-5 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-medium w-full">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="leading-tight">{error}</p>
              </div>
            )}

            {/* ── REGISTER FORM ── */}
            {activeTab === "register" && (
              <form onSubmit={handleRegister} className="space-y-4 w-full flex flex-col">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#9fd5b2] mb-2 text-left">Full Name</label>
                  <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-white/20 group-focus-within:text-[#9fd5b2] transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                      className="w-full glass-input pl-10 pr-4 py-3.5 text-sm placeholder-white/20 font-medium block"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#9fd5b2] mb-2 text-left">Email Address</label>
                  <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-white/20 group-focus-within:text-[#9fd5b2] transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                      className="w-full glass-input pl-10 pr-4 py-3.5 text-sm placeholder-white/20 font-medium block"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden rounded-xl py-3.5 mt-2 text-xs font-extrabold uppercase tracking-wider text-[#07192a] bg-[#f6ed4a] hover:shadow-[0_0_20px_rgba(246,237,74,0.2)] disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 active:scale-[0.98] cursor-pointer block"
                >
                  <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Sending OTP…
                      </>
                    ) : (
                      <>
                        Create account
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}

            

            <p className="text-center text-xs text-[rgba(255,255,255,0.45)] mt-6 font-medium leading-relaxed w-full">
              {activeTab === "register" ? "A 6-digit OTP will be sent to verify your email" : "We'll send a 6-digit code to your inbox"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;