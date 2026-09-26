import { memo } from "react";

/**
 * AuthPremiumBackground
 * A shared, ultra-premium animated background for all authentication pages.
 * Features floating luminous particles, aurora mesh gradients, subtle grid lines,
 * and organic breathing animations for a high-end luxury experience.
 */
const AuthPremiumBackground = memo(function AuthPremiumBackground() {
  return (
    <div className="auth-bg-root">
      <style dangerouslySetInnerHTML={{
        __html: `
        /* ── AUTH PREMIUM BACKGROUND SYSTEM ── */
        .auth-bg-root {
          position: absolute;
          inset: 0;
          pointer-events: none;
          user-select: none;
          overflow: hidden;
          z-index: 0;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
        }

        /* ── FLOATING PARTICLE SYSTEM ── */
        @keyframes authParticleFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.6; }
          25% { transform: translate3d(12px, -18px, 0) scale(1.1); opacity: 0.9; }
          50% { transform: translate3d(-8px, -32px, 0) scale(0.95); opacity: 0.7; }
          75% { transform: translate3d(16px, -14px, 0) scale(1.05); opacity: 0.85; }
        }

        @keyframes authParticleFloat2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.5; }
          33% { transform: translate3d(-15px, -22px, 0) scale(1.08); opacity: 0.8; }
          66% { transform: translate3d(10px, -28px, 0) scale(0.92); opacity: 0.65; }
        }

        .auth-particle {
          position: absolute;
          border-radius: 50%;
          will-change: transform, opacity;
        }

        .auth-particle-mint {
          background: radial-gradient(circle, rgba(159, 213, 178, 0.8), rgba(159, 213, 178, 0) 70%);
          animation: authParticleFloat 18s ease-in-out infinite;
        }

        .auth-particle-yellow {
          background: radial-gradient(circle, rgba(246, 237, 74, 0.6), rgba(246, 237, 74, 0) 70%);
          animation: authParticleFloat2 22s ease-in-out infinite;
        }

        .auth-particle-blue {
          background: radial-gradient(circle, rgba(56, 189, 248, 0.5), rgba(56, 189, 248, 0) 70%);
          animation: authParticleFloat 25s ease-in-out infinite reverse;
        }

        /* ── AURORA GRADIENT MESH ── */
        @keyframes auroraShift {
          0%, 100% { 
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
            opacity: 0.7;
          }
          33% { 
            transform: translate3d(30px, -20px, 0) rotate(3deg) scale(1.05);
            opacity: 0.9;
          }
          66% { 
            transform: translate3d(-20px, 15px, 0) rotate(-2deg) scale(0.97);
            opacity: 0.75;
          }
        }

        @keyframes auroraShift2 {
          0%, 100% { 
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          50% { 
            transform: translate3d(-25px, 20px, 0) rotate(4deg) scale(1.03);
          }
        }

        .auth-aurora-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform, opacity;
          mix-blend-mode: screen;
        }

        /* ── GRID PATTERN ── */
        .auth-grid-pattern {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(159, 213, 178, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(159, 213, 178, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%);
        }

        /* ── SCAN LINE SWEEP ── */
        @keyframes scanSweep {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        .auth-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 200px;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(159, 213, 178, 0.015) 40%,
            rgba(159, 213, 178, 0.03) 50%,
            rgba(159, 213, 178, 0.015) 60%,
            transparent 100%
          );
          animation: scanSweep 12s linear infinite;
          will-change: transform;
        }

        /* ── CONSTELLATION DOTS ── */
        @keyframes constellationPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }

        .auth-constellation-dot {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: #9fd5b2;
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-particle,
          .auth-aurora-orb,
          .auth-scan-line,
          .auth-constellation-dot {
            animation: none !important;
          }
        }
      `}} />

      {/* 1. Deep Base Layer */}
      <div className="absolute inset-0 bg-[#050a12]" />

      {/* 2. Subtle Noise Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* 3. Aurora Gradient Orbs */}
      <div
        className="auth-aurora-orb"
        style={{
          top: "-15%",
          left: "-10%",
          width: "55vw",
          height: "55vw",
          maxWidth: "600px",
          maxHeight: "600px",
          background: "radial-gradient(circle, rgba(159, 213, 178, 0.15) 0%, rgba(159, 213, 178, 0.05) 40%, transparent 70%)",
          animation: "auroraShift 30s ease-in-out infinite",
        }}
      />
      <div
        className="auth-aurora-orb"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "50vw",
          height: "50vw",
          maxWidth: "550px",
          maxHeight: "550px",
          background: "radial-gradient(circle, rgba(246, 237, 74, 0.1) 0%, rgba(246, 237, 74, 0.03) 40%, transparent 70%)",
          animation: "auroraShift2 35s ease-in-out infinite",
        }}
      />
      <div
        className="auth-aurora-orb"
        style={{
          top: "40%",
          left: "30%",
          width: "40vw",
          height: "35vw",
          maxWidth: "450px",
          maxHeight: "400px",
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.06) 0%, transparent 65%)",
          animation: "auroraShift 40s ease-in-out infinite reverse",
        }}
      />

      {/* 4. Grid Pattern Overlay */}
      <div className="auth-grid-pattern" />

      {/* 5. Scan Line Effect */}
      <div className="auth-scan-line" style={{ zIndex: 5 }} />

      {/* 6. Floating Particles */}
      {/* Mint particles */}
      <div className="auth-particle auth-particle-mint" style={{ top: "12%", left: "8%", width: "4px", height: "4px", animationDelay: "0s" }} />
      <div className="auth-particle auth-particle-mint" style={{ top: "25%", right: "15%", width: "3px", height: "3px", animationDelay: "3s" }} />
      <div className="auth-particle auth-particle-mint" style={{ bottom: "30%", left: "20%", width: "5px", height: "5px", animationDelay: "7s" }} />
      <div className="auth-particle auth-particle-mint" style={{ top: "60%", right: "25%", width: "3px", height: "3px", animationDelay: "11s" }} />
      <div className="auth-particle auth-particle-mint" style={{ top: "80%", left: "40%", width: "4px", height: "4px", animationDelay: "15s" }} />

      {/* Yellow particles */}
      <div className="auth-particle auth-particle-yellow" style={{ top: "18%", right: "22%", width: "3px", height: "3px", animationDelay: "2s" }} />
      <div className="auth-particle auth-particle-yellow" style={{ bottom: "20%", right: "10%", width: "4px", height: "4px", animationDelay: "5s" }} />
      <div className="auth-particle auth-particle-yellow" style={{ top: "45%", left: "12%", width: "3px", height: "3px", animationDelay: "9s" }} />

      {/* Blue particles */}
      <div className="auth-particle auth-particle-blue" style={{ top: "35%", left: "30%", width: "3px", height: "3px", animationDelay: "4s" }} />
      <div className="auth-particle auth-particle-blue" style={{ bottom: "15%", right: "35%", width: "4px", height: "4px", animationDelay: "8s" }} />

      {/* 7. Constellation Dots */}
      {[
        { top: "10%", left: "15%", delay: "0s", dur: "4s" },
        { top: "22%", left: "45%", delay: "1.2s", dur: "5s" },
        { top: "15%", right: "20%", delay: "2.5s", dur: "4.5s" },
        { top: "40%", left: "5%", delay: "0.8s", dur: "6s" },
        { top: "55%", right: "12%", delay: "3s", dur: "4s" },
        { top: "70%", left: "25%", delay: "1.5s", dur: "5.5s" },
        { top: "85%", right: "30%", delay: "2s", dur: "4.2s" },
        { top: "30%", left: "60%", delay: "4s", dur: "5s" },
        { top: "65%", left: "50%", delay: "0.5s", dur: "6.5s" },
        { top: "90%", left: "70%", delay: "3.5s", dur: "4.8s" },
      ].map((dot, i) => (
        <div
          key={i}
          className="auth-constellation-dot"
          style={{
            ...dot,
            animation: `constellationPulse ${dot.dur} ease-in-out ${dot.delay} infinite`,
          }}
        />
      ))}

      {/* 8. Vignette Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(5, 10, 18, 0.6) 100%)",
          zIndex: 10,
        }}
      />
    </div>
  );
});

export default AuthPremiumBackground;
