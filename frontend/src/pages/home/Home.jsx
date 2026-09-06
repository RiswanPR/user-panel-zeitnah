import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { storage } from "../../services/storage";

function Home() {
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // SECURE DISCONNECT PIPELINE
  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      } else {
        await api.post("/auth/logout").catch(() => {});
        await storage.clearAuth();
        setUser(null);
      }
    } catch (error) {
      console.log(error);
    } finally {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] relative overflow-hidden px-4 py-6 sm:py-10 text-white font-body antialiased selection:bg-[#f6ed4a] selection:text-[#07192a] accelerated-canvas">
      
      {/* ── HIGH PERFORMANCE CUSTOM NETWORK LOOP BACKGROUND GRAPHICS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .accelerated-canvas {
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
        }

        /* Fluid breathing motion for custom architectural loop networks */
        @keyframes abstractBreathe {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(6px, -10px, 0) scale(1.01);
          }
        }

        .animated-mesh-art {
          animation: abstractBreathe 32s ease-in-out infinite;
          transform-origin: center;
        }

        /* Panoramic fade mask to isolate workspace text structures */
        .workspace-panoramic-mask {
          mask-image: radial-gradient(circle at center, transparent 20%, black 80%, black 100%);
          -webkit-mask-image: radial-gradient(circle at center, transparent 20%, black 80%, black 100%);
        }

        @media (prefers-reduced-motion: reduce) {
          .animated-mesh-art {
            animation: none !important;
          }
        }
      `}} />

      {/* Atmospheric Ambient Lighting Gradients */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <div className="absolute inset-0 filter blur-[130px] opacity-50 mix-blend-screen">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] rounded-full bg-[radial-gradient(circle,rgba(159,213,178,0.08)_0%,transparent_65%)]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] rounded-full bg-[radial-gradient(circle,rgba(246,237,74,0.03)_0%,transparent_65%)]" />
        </div>

        {/* Custom Integrated Continuous Loop Grid Architecture */}
        <div className="absolute inset-0 workspace-panoramic-mask opacity-75">
          <svg 
            className="w-full h-full animated-mesh-art" 
            viewBox="0 0 1200 800" 
            preserveAspectRatio="xMidYMid slice" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="homeBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9fd5b2" stopOpacity="0.08" />
                <stop offset="50%" stopColor="#a8f06a" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#f6ed4a" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {/* Interlocking Custom Circuit Flow Lines */}
            <g stroke="url(#homeBrandGrad)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 100,150 C 130,100 170,100 200,150 C 230,200 200,250 250,280 C 300,310 330,270 360,320 C 390,370 350,420 400,450 C 450,480 490,430 520,490 C 550,550 510,600 560,640 C 610,680 650,630 690,680 C 730,730 710,780 760,790" />
              <path d="M 950,100 C 920,50 850,80 820,130 C 790,180 840,220 800,270 C 760,320 700,300 660,360 C 620,420 650,480 600,530 C 550,580 480,560 440,620 C 400,680 420,740 370,790" />
              <path d="M 850,200 C 900,150 960,180 990,240 C 1020,300 970,350 1010,420 C 1050,490 1120,470 1150,540" />
              <path d="M 150,500 C 180,450 240,480 270,540 C 300,600 260,650 300,710 C 340,770 410,750 440,820" />
            </g>
          </svg>
        </div>
      </div>

      {/* ── INTERACTIVE WORKSPACE HUB CONTENT ── */}
      <div className="relative z-10 max-w-6xl mx-auto space-y-8 sm:space-y-10">

        {/* WELCOME IDENTIFICATION HUB */}
        <div className="space-y-2 text-center sm:text-left select-none">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-white tracking-tight leading-none">
            Welcome back, {user?.name || "Academic Member"} 👋
          </h1>
          <p className="text-[rgba(255,255,255,0.45)] text-sm font-medium max-w-xl leading-relaxed mx-auto sm:mx-0">
            Manage your academic parameters, active profile sessions, performance activities, and system security.
          </p>
        </div>

        {/* WORKSPACE OPERATIONS GRID SYSTEM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">

          {/* PROFILE CONTROL HUB */}
          <Link
            to="/profile"
            className="group glass-card p-6 flex flex-col justify-between h-44 w-full"
          >
            <div className="w-full min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-base font-heading font-bold text-white tracking-tight truncate">
                  Profile Asset
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-lg leading-none shrink-0">
                  &rarr;
                </span>
              </div>
              <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium leading-relaxed line-clamp-3">
                View, audit, and modify your corporate technical specialty indexes and biography metadata.
              </p>
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase select-none mt-2">
              Identity Matrix
            </div>
          </Link>

          {/* ACTIVE ACCOUNT SECURITY WORKSPACE STATUS */}
          <div className="glass-card p-6 flex flex-col justify-between h-44 w-full relative overflow-hidden">
            <div className="w-full min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-base font-heading font-bold text-white tracking-tight truncate">
                  Security Status
                </h2>
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 truncate">
                Workstation Shield Active
              </p>
              <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium leading-relaxed line-clamp-2">
                Cryptographic 6-digit OTP verification parameters are active across your node.
              </p>
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase select-none mt-2">
              Operational Safety
            </div>
          </div>

          {/* ACTIVE ALLOCATIONS METRIC HUB */}
          <Link
            to="/active-sessions"
            className="group glass-card p-6 flex flex-col justify-between h-44 w-full"
          >
            <div className="w-full min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-base font-heading font-bold text-white tracking-tight truncate">
                  Active Sessions
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-lg leading-none shrink-0">
                  &rarr;
                </span>
              </div>
              <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium leading-relaxed line-clamp-3">
                Examine running hardware device addresses and cross-verify active authorized workspace connections.
              </p>
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase select-none mt-2">
              Session Tracking
            </div>
          </Link>

          {/* SYSTEM CHANGE OPERATION METRIC STREAM */}
          <Link
            to="/audit-logs"
            className="group glass-card p-6 flex flex-col justify-between h-44 w-full"
          >
            <div className="w-full min-w-0">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-base font-heading font-bold text-white tracking-tight truncate">
                  Audit Logs
                </h2>
                <span className="text-[#9fd5b2] group-hover:translate-x-0.5 transition-transform text-lg leading-none shrink-0">
                  &rarr;
                </span>
              </div>
              <p className="text-[rgba(255,255,255,0.45)] text-xs font-medium leading-relaxed line-clamp-3">
                Trace account metadata modifications, chronological authentication records, and core system actions.
              </p>
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase select-none mt-2">
              Activity Stream
            </div>
          </Link>

        </div>

        {/* BOTTOM METADATA CONTROLS FOOTER */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 w-full border-t border-white/[0.04]">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[rgba(255,255,255,0.25)] uppercase select-none text-center sm:text-left">
            <svg className="w-4 h-4 text-emerald-500/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Protected Academic Session Active
          </div>

          {/* TERMINATION TRIGGER — VOLT YELLOW EXCLUSIVE CTA FROM DESIGN SYSTEM */}
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto btn-primary shrink-0 block"
          >
            Logout Securely
          </button>
        </div>

      </div>
    </div>
  );
}

export default Home;