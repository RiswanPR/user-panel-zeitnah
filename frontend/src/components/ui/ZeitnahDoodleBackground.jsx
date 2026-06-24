import React from "react";

export default function ZeitnahVibrantBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 accelerated-glow-canvas">

      {/* ── HIGH-EXPOSURE LUMINESCENT GLOW ENGINE ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .accelerated-glow-canvas {
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
        }

        /* Continuous organic breathing motion for the glowing loops */
        @keyframes radiantBreathe {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
            filter: drop-shadow(0 0 6px rgba(159, 213, 178, 0.2)) drop-shadow(0 0 15px rgba(246, 237, 74, 0.15));
          }
          50% {
            transform: translate3d(10px, -12px, 0) scale(1.03);
            filter: drop-shadow(0 0 16px rgba(159, 213, 178, 0.35)) drop-shadow(0 0 30px rgba(246, 237, 74, 0.3));
          }
        }

        .vibrant-mesh-art {
          animation: radiantBreathe 28s ease-in-out infinite;
          transform-origin: center;
        }

        /* Retaining a wide structural focus field so content cards remain hyper-readable */
        .vibrant-content-mask {
          mask-image: radial-gradient(circle at center, transparent 15%, black 85%, black 100%);
          -webkit-mask-image: radial-gradient(circle at center, transparent 15%, black 85%, black 100%);
        }

        @media (prefers-reduced-motion: reduce) {
          .vibrant-mesh-art {
            animation: none !important;
            filter: none !important;
          }
        }
      `}} />

      {/* 1. Base Dark Navy Foundation Canvas (Lifted from flat black to rich deep slate) */}
      <div className="absolute inset-0 bg-[#070B14]" />

      {/* 2. Vibrant High-Impact Ambient Light Flares */}
      <div className="absolute inset-0 z-10 filter blur-[140px] opacity-95 mix-blend-screen">
        {/* High-Exposure Mint Core - Top Left */}
        <div className="absolute top-[-15%] left-[-5%] w-[60vw] h-[60vw] max-w-[650px] rounded-full bg-[radial-gradient(circle,rgba(159,213,178,0.22)_0%,transparent_70%)]" />

        {/* High-Exposure Volt Yellow Core - Bottom Right */}
        <div className="absolute bottom-[-15%] right-[-5%] w-[60vw] h-[60vw] max-w-[650px] rounded-full bg-[radial-gradient(circle,rgba(246,237,74,0.15)_0%,transparent_70%)]" />

        {/* Electric Indigo Support Aura - Center Left */}
        <div className="absolute top-[25%] left-[15%] w-[45vw] h-[40vw] max-w-[500px] rounded-full bg-[radial-gradient(circle,rgba(18,49,76,0.45)_0%,transparent_65%)]" />
      </div>

      {/* 3. Luminescent Custom Interlocking Loop Network */}
      <div className="absolute inset-0 z-20 vibrant-content-mask opacity-100">
        <svg
          className="w-full h-full vibrant-mesh-art"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Vibrant Continuous Stroke Gradient */}
            <linearGradient id="vibrantDoodleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9fd5b2" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#a8f06a" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#f6ed4a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#9fd5b2" stopOpacity="0.3" />
            </linearGradient>

            {/* Neon Path Lighting Blueprint Filter */}
            <filter id="neonGlowEngine" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.75" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Interlocking Custom Circuit Tracks with Neon Engine Injection */}
          <g stroke="url(#vibrantDoodleGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlowEngine)">

            {/* COMPREHENSIVE, ALL-OVER BIOMORPHIC PATTERN DIRECTLY INSPIRED BY THE CONTINUOUS DOODLE ART MAP */}
            {/* Track 1: Left & Center-Top Network Flow */}
            <path d="M -50,100 C 50,100 20,250 100,250 C 180,250 150,120 250,120 C 350,120 320,280 420,280 C 520,280 490,140 590,140 C 690,140 660,300 760,300 C 860,300 830,160 930,160 C 1030,160 1000,320 1100,320 C 1200,320 1150,180 1250,180" />

            {/* Track 2: Center Meandering Inversion Loop */}
            <path d="M 50,400 C -20,320 120,220 180,320 C 240,420 100,480 200,560 C 300,640 380,480 440,580 C 500,680 380,750 480,850" />

            {/* Track 3: Upper-Right Swelling Counter-Map */}
            <path d="M 700,-50 C 760,40 650,120 750,180 C 850,240 920,100 1000,180 C 1080,260 960,340 1050,420 C 1140,500 1250,400 1250,550" />

            {/* Track 4: Bottom Left Serpentine Strands */}
            <path d="M -20,550 C 60,510 80,680 160,640 C 240,600 210,750 320,710 C 430,670 400,820 500,820" />

            {/* Track 5: Center-Right Core Structural Blueprint Loop */}
            <path d="M 600,450 C 680,380 720,520 800,480 C 880,440 840,300 950,340 C 1060,380 1020,560 1120,520 C 1220,480 1180,680 1250,660" />

            {/* Track 6: Baseline Rhythmic Interwoven Flow */}
            <path d="M 250,850 C 300,740 420,780 480,690 C 540,600 660,660 720,550 C 780,440 900,480 960,380 C 1020,280 1140,320 1250,220" />

            {/* Faint high-fidelity alignment nodes at key intersection points */}
            <circle cx="100" cy="250" r="3.5" fill="#f6ed4a" opacity="0.8" />
            <circle cx="420" cy="280" r="3.5" fill="#9fd5b2" opacity="0.8" />
            <circle cx="760" cy="300" r="3.5" fill="#f6ed4a" opacity="0.8" />
            <circle cx="950" cy="340" r="3.5" fill="#9fd5b2" opacity="0.8" />
            <circle cx="720" cy="550" r="3.5" fill="#f6ed4a" opacity="0.7" />
            <circle cx="160" cy="640" r="3.5" fill="#9fd5b2" opacity="0.7" />
          </g>
        </svg>
      </div>

    </div>
  );
}