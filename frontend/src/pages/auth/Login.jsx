import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import storage from "../../services/storage";
import AuthPremiumBackground from "../../components/ui/AuthPremiumBackground";

function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const stageRef = useRef(null);

  // SECURE DISPATCH OTP ROUTINE
  const handleSendOtp = async () => {
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

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

  // Subtle cursor-reactive lighting for a more dimensional "premium product" feel.
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
      stage.style.setProperty("--mouse-x", "68%");
      stage.style.setProperty("--mouse-y", "38%");
    };

    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerleave", resetPointer);

    return () => {
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="relative min-h-screen overflow-hidden bg-[#050811] text-white selection:bg-[#f6ed4a] selection:text-[#07192a]"
      style={{
        "--mouse-x": "68%",
        "--mouse-y": "38%",
      }}
    >
      {/* Existing cinematic background */}
      <AuthPremiumBackground />

      {/* Premium atmospheric layer */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {/* Cursor light */}
        <div
          className="absolute -inset-[20%] opacity-70 transition-[background] duration-300"
          style={{
            background:
              "radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(159,213,178,0.12), transparent 55%)",
          }}
        />

        {/* Aurora glows */}
        <div className="absolute left-[6%] top-[12%] h-[34rem] w-[34rem] rounded-full bg-[#9fd5b2]/[0.07] blur-[130px] animate-[pulse_9s_ease-in-out_infinite]" />
        <div className="absolute right-[-8%] bottom-[-10%] h-[38rem] w-[38rem] rounded-full bg-[#7c6cff]/[0.10] blur-[150px] animate-[pulse_11s_ease-in-out_infinite]" />
        <div className="absolute left-[43%] top-[-10%] h-[22rem] w-[22rem] rounded-full bg-[#38bdf8]/[0.05] blur-[120px]" />

        {/* Fine grid */}
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(circle at center, black 10%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 10%, transparent 78%)",
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,6,12,0.2)_55%,rgba(2,6,12,0.75)_100%)]" />

        {/* Film grain */}
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-screen"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.65'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Main layer */}
      <main className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        {/* LEFT — cinematic brand story */}
        <section className="relative hidden flex-1 overflow-hidden lg:flex">
          <div className="relative flex w-full flex-col justify-between px-10 py-10 xl:px-16 2xl:px-24">
            {/* Top brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative h-11 w-11 overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.06] shadow-[0_14px_45px_rgba(0,0,0,0.3)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_35%)]" />
                  <img
                    src="/zeitnah-logo.png"
                    alt="Zeitnah Group of Institutions Logo"
                    className="relative h-full w-full object-cover"
                  />
                </div>

                <div>
                  <div className="font-heading text-[15px] font-black uppercase tracking-[0.22em] text-white">
                    Zeitnah
                  </div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[#9fd5b2]/70">
                    Group of Institutions
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9fd5b2] shadow-[0_0_12px_rgba(159,213,178,0.8)]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                  Learning infrastructure
                </span>
              </div>
            </div>

            {/* Hero */}
            <div className="relative max-w-3xl -translate-y-2">
              <div
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 backdrop-blur-xl"
                style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9fd5b2]/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#9fd5b2]" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                  Future focused learning platform
                </span>
              </div>

              <h1 className="font-heading text-[4.2rem] font-black leading-[0.98] tracking-[-0.05em] text-white xl:text-[5.4rem] 2xl:text-[6.2rem]">
                Build a future
                <span className="block">
                  worth{" "}
                  <span
                    className="relative inline-block text-[#f6ed4a]"
                    style={{
                      textShadow:
                        "0 0 20px rgba(246,237,74,0.16), 0 0 70px rgba(246,237,74,0.08)",
                    }}
                  >
                    becoming.
                  </span>
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-[15px] font-medium leading-7 tracking-[-0.01em] text-white/42 xl:text-[16px]">
                Industry-focused learning architectures designed to turn
                ambitious students into confident, high-signal engineering
                professionals.
              </p>

              {/* Metrics */}
              <div className="mt-10 grid max-w-2xl grid-cols-3 divide-x divide-white/[0.08] overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl">
                {[
                  { value: "5K+", label: "Students", tone: "#f6ed4a" },
                  { value: "100+", label: "Courses", tone: "#9fd5b2" },
                  { value: "95%", label: "Success rate", tone: "#38bdf8" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="group relative px-5 py-5 transition-all duration-500 hover:bg-white/[0.035]"
                  >
                    <div
                      className="absolute inset-x-5 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${item.tone}70, transparent)`,
                      }}
                    />
                    <div
                      className="font-heading text-2xl font-black tracking-tight"
                      style={{ color: item.tone }}
                    >
                      {item.value}
                    </div>
                    <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom trust row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex -space-x-2.5">
                  {["#f6ed4a", "#9fd5b2", "#38bdf8", "#a78bfa"].map(
                    (color, i) => (
                      <div
                        key={i}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#06101a] bg-[#0c1720] shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          style={{ color }}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                        </svg>
                      </div>
                    )
                  )}
                </div>

                <p className="text-[11px] font-semibold text-white/30">
                  <span className="text-white/55">5,000+</span> students
                  already learning
                </p>
              </div>

              <div className="hidden xl:flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
                <span>Scroll to explore</span>
                <span className="h-8 w-5 rounded-full border border-white/10 p-1">
                  <span className="block h-1.5 w-0.5 animate-bounce rounded-full bg-white/40 mx-auto" />
                </span>
              </div>
            </div>
          </div>

          {/* Vertical split line */}
          <div className="pointer-events-none absolute right-0 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        </section>

        {/* RIGHT — auth experience */}
        <section className="flex w-full flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:max-w-[570px] lg:px-12 xl:max-w-[620px]">
          <div className="w-full max-w-[430px]">
            {/* Mobile brand */}
            <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
              <div className="relative h-11 w-11 overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.06] shadow-xl">
                <img
                  src="/zeitnah-logo.png"
                  alt="Zeitnah Group of Institutions Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="font-heading text-base font-black uppercase tracking-[0.18em] text-white">
                  Zeitnah
                </div>
                <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.22em] text-[#9fd5b2]/70">
                  Learning platform
                </div>
              </div>
            </div>

            {/* Card shell */}
            <div
              className="relative overflow-hidden rounded-[30px] border border-white/[0.10] bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.025))] p-[1px] shadow-[0_30px_100px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-all duration-700"
              style={{
                transform: isFocused
                  ? "translateY(-3px) scale(1.003)"
                  : "translateY(0) scale(1)",
              }}
            >
              {/* Edge light */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[30px] opacity-70"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.20), transparent 30%, transparent 72%, rgba(159,213,178,0.13))",
                }}
              />

              <div className="relative rounded-[29px] bg-[#071019]/85 px-6 py-7 sm:px-9 sm:py-9">
                {/* Top ornament */}
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9fd5b2] shadow-[0_0_10px_rgba(159,213,178,0.75)]" />
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/35">
                      Secure access
                    </span>
                  </div>

                  <div className="text-[9px] font-mono tracking-[0.14em] text-white/20">
                    ZH / 01
                  </div>
                </div>

                {/* Heading */}
                <div className="mb-8">
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em] text-[#9fd5b2]/75">
                    Welcome back
                  </p>

                  <h2 className="font-heading text-[2.15rem] font-black tracking-[-0.045em] leading-none text-white sm:text-[2.4rem]">
                    Your journey
                    <span className="block text-white/42">
                      starts here.
                    </span>
                  </h2>

                  <p className="mt-4 max-w-sm text-[12px] font-medium leading-5 text-white/35 sm:text-[13px]">
                    Enter your email to receive a secure one-time verification
                    code.
                  </p>
                </div>

                {/* Form */}
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-2.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/34"
                    >
                      Email address
                    </label>

                    <div
                      className={`group relative rounded-[18px] border transition-all duration-500 ${error
                          ? "border-red-400/35 bg-red-400/[0.045]"
                          : isFocused
                            ? "border-[#9fd5b2]/35 bg-[#9fd5b2]/[0.055] shadow-[0_0_0_4px_rgba(159,213,178,0.035),0_18px_50px_rgba(0,0,0,0.12)]"
                            : "border-white/[0.09] bg-white/[0.025] hover:border-white/[0.15]"
                        }`}
                    >
                      {/* Focus rail */}
                      <div
                        className={`pointer-events-none absolute inset-y-3 left-0 w-px rounded-full bg-[#9fd5b2] transition-opacity duration-500 ${isFocused ? "opacity-100" : "opacity-0"
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
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError("");
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSendOtp()
                        }
                        className="h-[58px] w-full bg-transparent pl-11 pr-4 text-[13px] font-medium text-white outline-none placeholder:text-white/18"
                        autoComplete="email"
                      />

                      {email && !error && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#9fd5b2]/10 text-[#9fd5b2]">
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
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-[14px] border border-red-400/15 bg-red-400/[0.045] px-3.5 py-3 text-[10px] font-medium leading-4 text-red-200/75">
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
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="group relative h-[58px] w-full overflow-hidden rounded-[18px] border border-[#f6ed4a]/25 bg-[#f6ed4a] text-[#07111a] shadow-[0_18px_45px_rgba(246,237,74,0.12)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(246,237,74,0.18)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {/* Hover sweep */}
                    <span className="absolute inset-y-0 left-[-30%] w-[35%] -skew-x-[18deg] bg-white/40 blur-md transition-all duration-700 group-hover:left-[105%]" />

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
                          Continue with OTP
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

                {/* Security */}
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[
                    { label: "Encrypted", icon: "shield" },
                    { label: "One-time code", icon: "key" },
                    { label: "Protected", icon: "lock" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] border border-white/[0.055] bg-white/[0.02] px-2 text-center"
                    >
                      <svg
                        className="h-3 w-3 shrink-0 text-[#9fd5b2]/60"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        viewBox="0 0 24 24"
                      >
                        {item.icon === "shield" && (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3l7 3v5c0 4.4-2.8 8-7 10-4.2-2-7-5.6-7-10V6l7-3z"
                          />
                        )}
                        {item.icon === "key" && (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.5 7.5a4 4 0 10-7.2 2.4L3 15.2V19h3v-2h2v-2h2l2.1-2.1a4 4 0 003.4-5.4z"
                          />
                        )}
                        {item.icon === "lock" && (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z"
                          />
                        )}
                      </svg>
                      <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-white/24">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/16">
                    New here?
                  </span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {/* Register */}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="group mx-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/42 transition-colors duration-300 hover:text-white"
                >
                  Create new account
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025] transition-all duration-300 group-hover:translate-x-0.5 group-hover:border-white/15 group-hover:bg-white/[0.05]">
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
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            {/* Tiny footer */}
            <div className="mt-5 text-center text-[8px] font-bold uppercase tracking-[0.2em] text-white/14">
              Secure authentication • Zeitnah
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Login;
