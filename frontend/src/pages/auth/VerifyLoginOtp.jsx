import { useState, useEffect, useContext, useRef } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDeviceId } from "../../utils/device";
import storage from "../../services/storage";
import { isMobile } from "react-device-detect";
import { UAParser } from "ua-parser-js";
import AuthPremiumBackground from "../../components/ui/AuthPremiumBackground";

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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [pageReady, setPageReady] = useState(false);

  const inputsRef = useRef([]);
  const stageRef = useRef(null);

  const email = storage.getItem("login_email") || "";
  const maskedEmail = email.replace(
    /(.{2})(.*)(@.*)/,
    (_, a, b, c) => a + "*".repeat(b.length) + c
  );

  useEffect(() => {
    setPageReady(true);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Subtle cursor-reactive atmosphere
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
      stage.style.setProperty("--mouse-x", "50%");
      stage.style.setProperty("--mouse-y", "38%");
    };

    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerleave", resetPointer);

    return () => {
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  // Handle per-box OTP input
  const handleBoxChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    setError("");

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleBoxKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleBoxPaste = (e) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    const updated = [...otp];

    pasted.split("").forEach((char, i) => {
      if (i < 6) updated[i] = char;
    });

    setOtp(updated);
    setError("");
    inputsRef.current[Math.min(pasted.length - 1, 5)]?.focus();
  };

  const otpString = otp.join("");
  const isComplete = otpString.length === 6;
  const completedCount = otp.filter(Boolean).length;
  const progress = (completedCount / 6) * 100;
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (circumference * progress) / 100;

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
    storage.setAccessToken(res.data.token);

    if (res.data.refreshToken) {
      storage.setRefreshToken(res.data.refreshToken);
    }

    if (res.data.sessionExpiresAt) {
      storage.setSessionExpiresAt(res.data.sessionExpiresAt);
    }

    setUser(res.data.user);
    storage.removeItem("login_email");
    setSuccess("Identity verified. Opening your learning space…");

    setTimeout(() => navigate("/courses"), 1200);
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
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReplace = async (confirmed) => {
    setShowConfirm(false);

    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await api.post("/auth/login/verify-otp", {
        ...pendingPayload,
        forceLogin: true,
      });

      finalizeLogin(res);
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Something went wrong.");
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
      setSuccess("A fresh verification code is on its way.");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      if (err.isCancelled) return;
      setError(err.friendlyMessage || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      ref={stageRef}
      className="relative min-h-screen overflow-hidden bg-[#050811] text-white selection:bg-[#f6ed4a] selection:text-[#07192a]"
      style={{
        "--mouse-x": "50%",
        "--mouse-y": "38%",
      }}
    >
      <AuthPremiumBackground />

      {/* Cinematic atmosphere */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div
          className="absolute -inset-[18%] opacity-75 transition-[background] duration-300"
          style={{
            background:
              "radial-gradient(620px circle at var(--mouse-x) var(--mouse-y), rgba(159,213,178,0.12), transparent 58%)",
          }}
        />

        <div className="absolute left-[4%] top-[-8%] h-[34rem] w-[34rem] rounded-full bg-[#9fd5b2]/[0.06] blur-[140px] animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute right-[-7%] bottom-[-12%] h-[38rem] w-[38rem] rounded-full bg-[#7c6cff]/[0.10] blur-[150px] animate-[pulse_12s_ease-in-out_infinite]" />
        <div className="absolute left-[38%] top-[12%] h-[18rem] w-[18rem] rounded-full bg-[#38bdf8]/[0.035] blur-[110px]" />

        <div
          className="absolute inset-0 opacity-[0.055]"
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

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(2,6,12,0.18)_55%,rgba(2,6,12,0.78)_100%)]" />

        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-screen"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.65'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Confirm device modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#02050a]/75 px-5 backdrop-blur-xl">
          <div
            className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-amber-300/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025))] p-[1px] shadow-[0_35px_120px_rgba(0,0,0,0.65)]"
            style={{ animation: "authModalIn 0.45s cubic-bezier(0.16,1,0.3,1)" }}
          >
            <div className="relative overflow-hidden rounded-[27px] bg-[#080f17]/95 px-6 py-7 sm:px-8">
              <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-amber-400/[0.06] blur-[70px]" />

              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[15px] border border-amber-400/20 bg-amber-400/[0.07] text-amber-300">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>

                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.26em] text-amber-300/65">
                  Device security
                </p>

                <h3 className="font-heading text-[1.55rem] font-black leading-tight tracking-[-0.03em] text-white">
                  Replace existing device?
                </h3>

                <p className="mt-3 text-[12px] font-medium leading-5 text-white/38">
                  You've reached your device limit. Continuing will sign out
                  your oldest active registered workstation session.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleConfirmReplace(false)}
                    className="h-11 rounded-[14px] border border-white/[0.08] bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.18em] text-white/45 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04] hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmReplace(true)}
                    disabled={loading}
                    className="h-11 rounded-[14px] border border-[#f6ed4a]/25 bg-[#f6ed4a] text-[9px] font-black uppercase tracking-[0.18em] text-[#07111a] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(246,237,74,0.14)] disabled:opacity-70"
                  >
                    Replace device
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 flex min-h-screen w-full items-center justify-center px-5 py-8 sm:px-8">
        <div
          className={`w-full max-w-[980px] transition-all duration-1000 ${pageReady
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
            }`}
        >
          {/* Desktop top bar */}
          <div className="mb-4 hidden items-center justify-between px-1 lg:flex">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="group flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/24 transition-colors duration-300 hover:text-white/60"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.02] transition-transform duration-300 group-hover:-translate-x-0.5">
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
              Back to login
            </button>

            <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9fd5b2] shadow-[0_0_10px_rgba(159,213,178,0.8)]" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">
                Secure identity verification
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-white/[0.10] bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.025))] p-[1px] shadow-[0_35px_120px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <div
              className="pointer-events-none absolute inset-0 rounded-[32px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.20), transparent 30%, transparent 68%, rgba(159,213,178,0.12))",
              }}
            />

            <div className="relative overflow-hidden rounded-[31px] bg-[#071019]/88">
              <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
                {/* Left security rail */}
                <aside className="relative hidden overflow-hidden border-r border-white/[0.07] bg-white/[0.018] px-8 py-9 lg:flex lg:flex-col lg:justify-between xl:px-10">
                  <div>
                    <div className="mb-8 flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-[13px] border border-white/10 bg-white/[0.06]">
                        <img
                          src="/zeitnah-logo.png"
                          alt="Zeitnah Logo"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div>
                        <div className="font-heading text-[13px] font-black uppercase tracking-[0.2em]">
                          Zeitnah
                        </div>
                        <div className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#9fd5b2]">
                          See the unseen
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[#9fd5b2]/10 bg-[#9fd5b2]/[0.025] p-5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#9fd5b2]/10 text-[#9fd5b2]">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z"
                            />
                          </svg>
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#9fd5b2]/75">
                          Protected session
                        </span>
                      </div>

                      <div className="mt-5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/24">
                          Signing in as
                        </div>
                        <div className="mt-2 break-all text-sm font-semibold text-white/70">
                          {maskedEmail || "your email"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-7">
                      {[
                        {
                          title: "OTP generated",
                          text: "Code sent to your email",
                          done: true,
                        },
                        {
                          title: "Identity check",
                          text: "Enter the 6-digit code",
                          active: true,
                        },
                        {
                          title: "Session opened",
                          text: "Continue to your courses",
                        },
                      ].map((item, index) => (
                        <div key={item.title} className="relative flex gap-3">
                          <div className="relative flex flex-col items-center">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-black ${item.done
                                  ? "border-[#9fd5b2]/20 bg-[#9fd5b2]/10 text-[#9fd5b2]"
                                  : item.active
                                    ? "border-[#f6ed4a]/30 bg-[#f6ed4a]/10 text-[#f6ed4a]"
                                    : "border-white/[0.08] bg-white/[0.025] text-white/22"
                                }`}
                            >
                              {item.done ? (
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
                              ) : (
                                index + 1
                              )}
                            </div>

                            {index !== 2 && (
                              <div className="my-1 h-8 w-px bg-white/[0.07]" />
                            )}
                          </div>

                          <div className="pb-4 pt-0.5">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">
                              {item.title}
                            </div>
                            <div className="mt-1 text-[9px] font-medium text-white/22">
                              {item.text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.018] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-3.5 w-3.5 text-[#38bdf8]/55"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l2.5 2.5"
                        />
                      </svg>
                      <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/25">
                        Code expires shortly
                      </span>
                    </div>
                  </div>
                </aside>

                {/* Main OTP panel */}
                <section className="flex flex-col items-center px-5 py-8 sm:px-10 sm:py-10 xl:px-14 xl:py-12">
                  {/* Mobile brand */}
                  <div className="mb-6 flex items-center gap-3 lg:hidden">
                    <div className="relative h-10 w-10 overflow-hidden rounded-[13px] border border-white/10 bg-white/[0.06]">
                      <img
                        src="/zeitnah-logo.png"
                        alt="Zeitnah Logo"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <div className="font-heading text-[13px] font-black uppercase tracking-[0.2em]">
                        Zeitnah
                      </div>
                      <div className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#9fd5b2]">
                        See the unseen
                      </div>
                    </div>
                  </div>

                  {/* Top status */}
                  <div className="mb-7 flex w-full max-w-[470px] items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-[#9fd5b2]/10 bg-[#9fd5b2]/[0.035] px-3 py-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9fd5b2]/60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#9fd5b2]" />
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#9fd5b2]/65">
                        Verification required
                      </span>
                    </div>

                    <span className="text-[8px] font-mono tracking-[0.14em] text-white/18">
                      ZH / AUTH / 03
                    </span>
                  </div>

                  {/* Heading */}
                  <div className="w-full max-w-[470px] text-center">
                    <div className="relative mx-auto mb-6 flex h-[74px] w-[74px] items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-[#9fd5b2]/15 bg-[#9fd5b2]/[0.035]" />
                      <div className="absolute inset-2 rounded-full border border-[#9fd5b2]/10" />
                      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#9fd5b2]/15 bg-[#9fd5b2]/[0.07] text-[#9fd5b2] shadow-[0_0_35px_rgba(159,213,178,0.08)]">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                          />
                        </svg>
                      </div>
                    </div>

                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em] text-[#9fd5b2]/70">
                      Verify your identity
                    </p>

                    <h1 className="font-heading text-[2.25rem] font-black leading-none tracking-[-0.05em] text-white sm:text-[2.75rem]">
                      One code.
                      <span className="block text-white/40">
                        Then you're in.
                      </span>
                    </h1>

                    <p className="mx-auto mt-5 max-w-[390px] text-[12px] font-medium leading-5 text-white/34 sm:text-[13px]">
                      We sent a one-time verification code to
                    </p>

                    <div className="mx-auto mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3.5 py-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#9fd5b2]/80" />
                      <span className="max-w-[270px] truncate text-[11px] font-semibold tracking-wide text-[#9fd5b2]/85">
                        {maskedEmail || "your email"}
                      </span>
                    </div>
                  </div>

                  {/* OTP area */}
                  <div className="mt-8 w-full max-w-[470px]">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/22">
                        6-digit security code
                      </span>
                      <span className="text-[8px] font-bold tracking-[0.16em] text-white/22">
                        {completedCount}/6
                      </span>
                    </div>

                    <div
                      className={`relative rounded-[24px] border p-3 sm:p-4 ${error
                          ? "border-red-400/20 bg-red-400/[0.025]"
                          : isComplete
                            ? "border-[#9fd5b2]/18 bg-[#9fd5b2]/[0.025]"
                            : "border-white/[0.07] bg-white/[0.018]"
                        }`}
                    >
                      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.11] to-transparent" />

                      <div
                        className="flex w-full justify-between gap-2 sm:gap-3"
                        onPaste={handleBoxPaste}
                      >
                        {otp.map((digit, i) => (
                          <div
                            key={i}
                            className="relative flex-1"
                            style={{
                              animation:
                                "authOtpBoxIn 0.55s cubic-bezier(0.16,1,0.3,1) both",
                              animationDelay: `${0.12 + i * 0.055}s`,
                            }}
                          >
                            <input
                              ref={(el) => (inputsRef.current[i] = el)}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              aria-label={`OTP digit ${i + 1}`}
                              onChange={(e) =>
                                handleBoxChange(i, e.target.value)
                              }
                              onKeyDown={(e) => handleBoxKeyDown(i, e)}
                              onFocus={() => setFocusedIndex(i)}
                              onBlur={() => setFocusedIndex(-1)}
                              className={`h-[64px] w-full rounded-[16px] border bg-white/[0.025] text-center font-mono text-xl font-black outline-none transition-all duration-300 sm:h-[72px] sm:rounded-[18px] sm:text-2xl ${error
                                  ? "border-red-400/25 text-red-100"
                                  : focusedIndex === i
                                    ? "border-[#9fd5b2]/45 bg-[#9fd5b2]/[0.055] text-white shadow-[0_0_0_4px_rgba(159,213,178,0.035),0_12px_35px_rgba(0,0,0,0.13)]"
                                    : digit
                                      ? "border-[#9fd5b2]/20 bg-[#9fd5b2]/[0.04] text-white"
                                      : "border-white/[0.07] text-white"
                                }`}
                            />

                            {focusedIndex === i && (
                              <span className="pointer-events-none absolute inset-x-3 bottom-1.5 h-px rounded-full bg-[#9fd5b2] shadow-[0_0_10px_rgba(159,213,178,0.75)]" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Progress line */}
                      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-[#9fd5b2] transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            boxShadow:
                              "0 0 14px rgba(159,213,178,0.45)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Error */}
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
                        <p>{error}</p>
                      </div>
                    )}

                    {/* Success */}
                    {success && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-[14px] border border-[#9fd5b2]/15 bg-[#9fd5b2]/[0.045] px-3.5 py-3 text-[10px] font-medium leading-4 text-[#c9efda]/80">
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
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p>{success}</p>
                      </div>
                    )}
                  </div>

                  {/* Verify CTA */}
                  <div className="mt-6 w-full max-w-[470px]">
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || otpString.length < 6}
                      className="group relative h-[60px] w-full overflow-hidden rounded-[18px] border border-[#f6ed4a]/25 bg-[#f6ed4a] text-[#07111a] shadow-[0_18px_50px_rgba(246,237,74,0.12)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_25px_65px_rgba(246,237,74,0.2)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
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
                            Verifying identity…
                          </>
                        ) : (
                          <>
                            Verify & sign in
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

                  {/* Resend */}
                  <div className="mt-6 flex w-full max-w-[470px] items-center justify-between rounded-[15px] border border-white/[0.055] bg-white/[0.018] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-white/[0.035]">
                        <svg
                          className="h-3.5 w-3.5 text-white/28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 4v5h5M20 20v-5h-5M5.05 9A7 7 0 0117 5.55L20 9M19 15a7 7 0 01-11.95 3.45L4 15"
                          />
                        </svg>
                      </div>

                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">
                          Didn't receive it?
                        </div>
                        <div className="mt-1 text-[8px] font-medium text-white/18">
                          Request another code
                        </div>
                      </div>
                    </div>

                    {timer > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="relative h-9 w-9">
                          <svg
                            className="h-9 w-9 -rotate-90"
                            viewBox="0 0 48 48"
                          >
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              fill="none"
                              stroke="rgba(255,255,255,0.06)"
                              strokeWidth="2"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              fill="none"
                              stroke="#9fd5b2"
                              strokeWidth="2"
                              strokeDasharray={circumference}
                              strokeDashoffset={
                                circumference - (circumference * timer) / 30
                              }
                              strokeLinecap="round"
                              style={{
                                transition:
                                  "stroke-dashoffset 1s linear",
                              }}
                            />
                          </svg>

                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white/50">
                            {timer}
                          </span>
                        </div>

                        <span className="hidden text-[8px] font-bold uppercase tracking-[0.16em] text-white/20 sm:block">
                          Seconds
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendLoading}
                        className="rounded-[10px] border border-[#9fd5b2]/15 bg-[#9fd5b2]/[0.045] px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-[#9fd5b2]/75 transition-all duration-300 hover:border-[#9fd5b2]/25 hover:bg-[#9fd5b2]/[0.07] hover:text-[#bfe9cf] disabled:opacity-50"
                      >
                        {resendLoading ? "Sending…" : "Resend code"}
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-7 flex w-full max-w-[470px] items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/14">
                      Private • encrypted • one-time use
                    </span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="group mt-5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/28 transition-colors duration-300 hover:text-white/65 lg:hidden"
                  >
                    <svg
                      className="h-3 w-3 transition-transform duration-300 group-hover:-translate-x-0.5"
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
                    Back to login
                  </button>
                </section>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-[8.5px] font-bold uppercase tracking-[0.2em] text-white/25">
            Zeitnah • See the unseen
          </div>
        </div>
      </main>
    </div>
  );
}

export default VerifyOtp;
