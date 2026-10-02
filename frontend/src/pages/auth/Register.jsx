import { useEffect, useRef, useState } from "react";
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
  const [focusedField, setFocusedField] = useState("");
  const stageRef = useRef(null);

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

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handlePointerMove = (event) => {
      const rect = stage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      stage.style.setProperty("--mouse-x", `${x}%`);
      stage.style.setProperty("--mouse-y", `${y}%`);
    };

    const resetPointer = () => {
      stage.style.setProperty("--mouse-x", "28%");
      stage.style.setProperty("--mouse-y", "42%");
    };

    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerleave", resetPointer);

    return () => {
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  const name = registerData.name.trim();
  const email = registerData.email.trim();

  return (
    <div
      ref={stageRef}
      className="relative min-h-screen overflow-hidden bg-[#050811] text-white selection:bg-[#f6ed4a] selection:text-[#07192a]"
      style={{
        "--mouse-x": "28%",
        "--mouse-y": "42%",
      }}
    >
      <AuthPremiumBackground />

      {/* Cinematic atmosphere */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div
          className="absolute -inset-[20%] opacity-75 transition-[background] duration-300"
          style={{
            background:
              "radial-gradient(620px circle at var(--mouse-x) var(--mouse-y), rgba(246,237,74,0.08), transparent 56%)",
          }}
        />

        <div className="absolute right-[2%] top-[8%] h-[34rem] w-[34rem] rounded-full bg-[#9fd5b2]/[0.075] blur-[135px] animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute left-[-9%] bottom-[-12%] h-[39rem] w-[39rem] rounded-full bg-[#7c6cff]/[0.09] blur-[150px] animate-[pulse_12s_ease-in-out_infinite]" />
        <div className="absolute left-[34%] top-[-12%] h-[20rem] w-[20rem] rounded-full bg-[#38bdf8]/[0.05] blur-[110px]" />

        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(circle at center, black 8%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 8%, transparent 80%)",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,6,12,0.18)_52%,rgba(2,6,12,0.78)_100%)]" />
      </div>

      <main className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        {/* Left onboarding story */}
        <section className="relative hidden flex-1 overflow-hidden lg:flex">
          <div className="flex w-full flex-col justify-between px-10 py-10 xl:px-16 2xl:px-24">
            {/* Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative h-11 w-11 overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.06] shadow-[0_14px_45px_rgba(0,0,0,0.3)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_35%)]" />
                  <img
                    src="/zeitnah-logo.png"
                    alt="Zeitnah Logo"
                    className="relative h-full w-full object-cover"
                  />
                </div>

                <div>
                  <div className="font-heading text-[15px] font-black uppercase tracking-[0.22em] text-white">
                    Zeitnah
                  </div>
                  <div className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#9fd5b2]">
                    See the unseen
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f6ed4a] shadow-[0_0_12px_rgba(246,237,74,0.75)]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">
                  Global Civil Community
                </span>
              </div>
            </div>

            {/* Story */}
            <div className="max-w-3xl -translate-y-2">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#f6ed4a]/10 bg-[#f6ed4a]/[0.04] px-3.5 py-2 backdrop-blur-xl">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f6ed4a]/10">
                  <svg
                    className="h-3 w-3 text-[#f6ed4a]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v12m6-6H6"
                    />
                  </svg>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                  Build • Connect • Discover
                </span>
              </div>

              <h1 className="font-heading text-[4.2rem] font-black leading-[0.98] tracking-[-0.055em] text-white xl:text-[5.4rem] 2xl:text-[6.2rem]">
                See the
                <span className="block">
                  <span className="text-[#9fd5b2]">unseen.</span>
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-[15px] font-medium leading-7 tracking-[-0.01em] text-white/60 xl:text-[16px]">
                Create your Zeitnah identity to build, connect, and discover across a global civil community.
              </p>

              {/* Visual roadmap */}
              <div className="relative mt-10 max-w-2xl overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9fd5b2]/45 to-transparent" />

                <div className="grid grid-cols-3 gap-5">
                  {[
                    {
                      number: "01",
                      title: "Create",
                      text: "Your identity",
                      active: true,
                    },
                    {
                      number: "02",
                      title: "Verify",
                      text: "Your email",
                      active: false,
                    },
                    {
                      number: "03",
                      title: "Explore",
                      text: "Your future",
                      active: false,
                    },
                  ].map((item) => (
                    <div key={item.number} className="relative">
                      <div
                        className={`mb-3 flex h-8 w-8 items-center justify-center rounded-[10px] border text-[9px] font-black ${item.active
                          ? "border-[#f6ed4a]/25 bg-[#f6ed4a]/10 text-[#f6ed4a]"
                          : "border-white/[0.08] bg-white/[0.025] text-white/25"
                          }`}
                      >
                        {item.number}
                      </div>
                      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
                        {item.title}
                      </div>
                      <div className="mt-1 text-[9px] font-medium text-white/23">
                        {item.text}
                      </div>

                      {item.number !== "03" && (
                        <div className="absolute left-[2.05rem] right-[-0.8rem] top-[1rem] hidden h-px bg-white/[0.07] xl:block" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
                Built for ambitious learners
              </p>

              <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                <svg
                  className="h-3 w-3 text-[#9fd5b2]/65"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3l7 3v5c0 4.4-2.8 8-7 10-4.2-2-7-5.6-7-10V6l7-3z"
                  />
                </svg>
                <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/30">
                  Secure by design
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute right-0 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        </section>

        {/* Right registration experience */}
        <section className="flex w-full flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:max-w-[570px] lg:px-12 xl:max-w-[620px]">
          <div className="w-full max-w-[450px]">
            {/* Mobile brand */}
            <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
              <div className="relative h-11 w-11 overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.06] shadow-xl">
                <img
                  src="/zeitnah-logo.png"
                  alt="Zeitnah Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="font-heading text-base font-black uppercase tracking-[0.18em] text-white">
                  Zeitnah
                </div>
                <div className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#9fd5b2]">
                  See the unseen
                </div>
              </div>
            </div>

            {/* Glass shell */}
            <div className="relative overflow-hidden rounded-[30px] border border-white/[0.10] bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.025))] p-[1px] shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div
                className="pointer-events-none absolute inset-0 rounded-[30px]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.20), transparent 30%, transparent 72%, rgba(246,237,74,0.10))",
                }}
              />

              <div className="relative rounded-[29px] bg-[#071019]/88 px-6 py-7 sm:px-9 sm:py-9">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f6ed4a] shadow-[0_0_10px_rgba(246,237,74,0.7)]" />
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/35">
                      Create identity
                    </span>
                  </div>

                  <span className="text-[9px] font-mono tracking-[0.14em] text-white/20">
                    ZH / 02
                  </span>
                </div>

                <div className="mb-8">
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em] text-[#9fd5b2]/75">
                    Welcome to Zeitnah
                  </p>

                  <h2 className="font-heading text-[2.15rem] font-black leading-none tracking-[-0.05em] text-white sm:text-[2.4rem]">
                    Build your
                    <span className="block text-white/42">next identity.</span>
                  </h2>

                  <p className="mt-4 max-w-sm text-[12px] font-medium leading-5 text-white/35 sm:text-[13px]">
                    Two details. One secure verification. Then your Zeitnah
                    experience begins.
                  </p>
                </div>

                {/* Single intentional tab */}
                <div className="mb-7 grid grid-cols-2 gap-1 rounded-[15px] border border-white/[0.07] bg-white/[0.025] p-1">
                  <button
                    type="button"
                    onClick={() => switchTab("register")}
                    className={`rounded-[11px] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] transition-all duration-300 ${activeTab === "register"
                      ? "border border-white/[0.08] bg-white/[0.06] text-white shadow-[0_8px_25px_rgba(0,0,0,0.14)]"
                      : "border border-transparent text-white/25"
                      }`}
                  >
                    Create account
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="rounded-[11px] border border-transparent px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/25 transition-all duration-300 hover:bg-white/[0.035] hover:text-white/55"
                  >
                    Sign in
                  </button>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-[14px] border border-red-400/15 bg-red-400/[0.045] px-3.5 py-3 text-[10px] font-medium leading-4 text-red-200/75">
                    <svg
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                    <p>{error}</p>
                  </div>
                )}

                {activeTab === "register" && (
                  <form
                    onSubmit={handleRegister}
                    className="w-full space-y-5"
                  >
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="register-name"
                        className="mb-2.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/34"
                      >
                        Full name
                      </label>

                      <div
                        className={`group relative rounded-[18px] border transition-all duration-500 ${focusedField === "name"
                          ? "border-[#9fd5b2]/35 bg-[#9fd5b2]/[0.055] shadow-[0_0_0_4px_rgba(159,213,178,0.035)]"
                          : "border-white/[0.09] bg-white/[0.025] hover:border-white/[0.15]"
                          }`}
                      >
                        <div
                          className={`pointer-events-none absolute inset-y-3 left-0 w-px rounded-full bg-[#9fd5b2] transition-opacity duration-500 ${focusedField === "name" ? "opacity-100" : "opacity-0"
                            }`}
                          style={{
                            boxShadow: "0 0 14px rgba(159,213,178,0.85)",
                          }}
                        />

                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors duration-300 group-focus-within:text-[#9fd5b2]/80">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                            />
                          </svg>
                        </div>

                        <input
                          id="register-name"
                          type="text"
                          name="name"
                          value={registerData.name}
                          onChange={handleRegisterChange}
                          onFocus={() => setFocusedField("name")}
                          onBlur={() => setFocusedField("")}
                          placeholder="Your full name"
                          autoComplete="name"
                          className="h-[58px] w-full bg-transparent pl-11 pr-12 text-[13px] font-medium text-white outline-none placeholder:text-white/18"
                        />

                        {name && !error && (
                          <span className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#9fd5b2]/10 text-[#9fd5b2]">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 12.5l4 4L19 7.5"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="register-email"
                        className="mb-2.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/34"
                      >
                        Email address
                      </label>

                      <div
                        className={`group relative rounded-[18px] border transition-all duration-500 ${error
                          ? "border-red-400/35 bg-red-400/[0.045]"
                          : focusedField === "email"
                            ? "border-[#9fd5b2]/35 bg-[#9fd5b2]/[0.055] shadow-[0_0_0_4px_rgba(159,213,178,0.035)]"
                            : "border-white/[0.09] bg-white/[0.025] hover:border-white/[0.15]"
                          }`}
                      >
                        <div
                          className={`pointer-events-none absolute inset-y-3 left-0 w-px rounded-full bg-[#9fd5b2] transition-opacity duration-500 ${focusedField === "email" ? "opacity-100" : "opacity-0"
                            }`}
                          style={{
                            boxShadow: "0 0 14px rgba(159,213,178,0.85)",
                          }}
                        />

                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors duration-300 group-focus-within:text-[#9fd5b2]/80">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                            />
                          </svg>
                        </div>

                        <input
                          id="register-email"
                          type="email"
                          name="email"
                          value={registerData.email}
                          onChange={handleRegisterChange}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField("")}
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="h-[58px] w-full bg-transparent pl-11 pr-12 text-[13px] font-medium text-white outline-none placeholder:text-white/18"
                        />

                        {email && !error && (
                          <span className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#9fd5b2]/10 text-[#9fd5b2]">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 12.5l4 4L19 7.5"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={loading}
                        className="group relative h-[58px] w-full overflow-hidden rounded-[18px] border border-[#f6ed4a]/25 bg-[#f6ed4a] text-[#07111a] shadow-[0_18px_45px_rgba(246,237,74,0.12)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(246,237,74,0.2)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <span className="absolute inset-y-0 left-[-30%] w-[35%] -skew-x-[18deg] bg-white/45 blur-md transition-all duration-700 group-hover:left-[105%]" />

                        <span className="relative flex h-full items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
                          {loading ? (
                            <>
                              <svg
                                className="h-4 w-4 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                />
                                <path
                                  className="opacity-80"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Sending OTP…
                            </>
                          ) : (
                            <>
                              Continue to verification
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#07111a]/8 transition-transform duration-500 group-hover:translate-x-0.5">
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                  />
                                </svg>
                              </span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Progress */}
                <div className="mt-7 flex items-center justify-center gap-2">
                  <div className="h-1.5 w-7 rounded-full bg-[#f6ed4a] shadow-[0_0_10px_rgba(246,237,74,0.3)]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                  <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                </div>

                <p className="mt-3 text-center text-[8px] font-bold uppercase tracking-[0.2em] text-white/20">
                  Step 1 of 3 • Enter your details
                </p>

                {/* Security */}
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[
                    ["shield", "Secure"],
                    ["mail", "Email OTP"],
                    ["lock", "Protected"],
                  ].map(([icon, label]) => (
                    <div
                      key={label}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] border border-white/[0.055] bg-white/[0.02] px-2"
                    >
                      <svg
                        className="h-3 w-3 shrink-0 text-[#9fd5b2]/60"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                      >
                        {icon === "shield" && (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3l7 3v5c0 4.4-2.8 8-7 10-4.2-2-7-5.6-7-10V6l7-3z"
                          />
                        )}
                        {icon === "mail" && (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 6.75h16v10.5H4zM4.5 7.5l7.5 5 7.5-5"
                          />
                        )}
                        {icon === "lock" && (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z"
                          />
                        )}
                      </svg>
                      <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-white/24">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/16">
                    Already a member?
                  </span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="group mx-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/42 transition-colors duration-300 hover:text-white"
                >
                  Sign in to Zeitnah
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] transition-all duration-300 group-hover:-translate-x-0.5 group-hover:border-white/15 group-hover:bg-white/[0.05]">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-5 text-center text-[8.5px] font-bold uppercase tracking-[0.2em] text-white/25">
              Zeitnah • See the unseen
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Register;
