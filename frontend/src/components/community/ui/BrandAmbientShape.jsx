import React, { memo } from 'react';

/**
 * BrandAmbientShape — Reusable Zeitnah visual primitive for organic Z shapes,
 * flowing curves, and brand contour-line patterns.
 *
 * Official Palette:
 * - Navy: #12314C (70% foundation)
 * - Mint: #9FD5B2 (20% atmosphere)
 * - Yellow: #F6ED4A (10% energy accent)
 * - White: #FFFFFF
 *
 * Variants:
 * - 'header': Fluid mint/navy contour line and gentle gradient aura behind the Community header
 * - 'canvas': Full-canvas ambient background with organic Z curves and contour patterns
 * - 'contour': Thin organic contour lines for section dividers / cards
 * - 'composer': Subtle abstract Z accent behind composer dropzone
 * - 'viewer': Cinematic ambient layer behind story media
 * - 'empty': Simplified organic Z motif for empty states
 */

// Authentic Organic Z Path from Brand Guidelines
const ORGANIC_Z_PATH = `
  M 12 14
  C 11.8 7.5 16.5 4 23 4
  C 31 4 35 10.5 40 13
  C 44.5 15.5 48.5 13 53.5 8
  C 58.5 3 65.5 3.5 69 9
  C 73 15 72 23.5 67 28.5
  C 62 33.5 53.5 37 45.5 40
  C 37 43.5 32 46.5 30.5 51.5
  C 29 56.5 33.5 61.5 38.5 63
  C 43.5 64.5 47.5 59.8 53 55
  C 58 50.8 64.5 49 68.5 53.5
  C 73 58.5 72 66 67 69.5
  C 61.5 73 56.5 69.5 51.5 65
  C 47 60.8 43.5 63.8 38.5 67
  C 31.5 71.5 22.8 72.5 16.5 68
  C 10.5 63.5 10 55 14.5 48.5
  C 19 41.8 27.5 37.8 37 34.2
  C 45.5 31 52 28.8 52 24.5
  C 52 21.2 48 19.5 44 19.7
  C 38.8 19.7 35.8 24 31 27.5
  C 26.5 31 20.2 29.5 16.5 26
  C 13.8 23 12.6 18.8 12 14
  Z
`;

export const BrandAmbientShape = memo(function BrandAmbientShape({
  variant = 'canvas',
  className = '',
  opacity = 1,
}) {
  if (variant === 'header') {
    return (
      <div
        className={`absolute -top-10 right-0 sm:right-6 w-72 sm:w-96 h-48 pointer-events-none select-none overflow-hidden z-0 ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 380 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full opacity-60"
        >
          <defs>
            <linearGradient id="header-grad-mint-navy" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9FD5B2" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#12314C" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F6ED4A" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="header-stroke-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9FD5B2" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#12314C" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F6ED4A" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Organic flowing contour waves */}
          <path
            d="M -20,40 C 60,10 140,80 220,50 C 300,20 340,90 400,60"
            stroke="url(#header-stroke-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 10,75 C 90,45 170,110 250,85 C 330,60 370,120 420,95"
            stroke="url(#header-stroke-grad)"
            strokeWidth="1"
            strokeDasharray="4 4"
            fill="none"
            opacity="0.5"
          />
          {/* Subtle soft organic cloud */}
          <ellipse
            cx="240"
            cy="70"
            rx="110"
            ry="45"
            fill="url(#header-grad-mint-navy)"
            filter="blur(32px)"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'composer') {
    return (
      <div
        className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute -right-8 -bottom-8 w-48 h-48 opacity-[0.06]"
        >
          <path
            d={ORGANIC_Z_PATH}
            transform="scale(2.2)"
            fill="url(#composer-z-gradient)"
          />
          <defs>
            <linearGradient id="composer-z-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9FD5B2" />
              <stop offset="60%" stopColor="#12314C" />
              <stop offset="100%" stopColor="#F6ED4A" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (variant === 'viewer') {
    return (
      <div
        className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        {/* Cinematic deep navy to black gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#12314C]/90 via-[#0B111E]/95 to-[#070B14]" />

        {/* Ambient mint & yellow glows */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[#9FD5B2]/[0.06] blur-[90px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-[#F6ED4A]/[0.035] blur-[100px]" />

        {/* Organic contour curves */}
        <svg
          viewBox="0 0 600 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full opacity-[0.07]"
          preserveAspectRatio="none"
        >
          <path
            d="M 50,100 C 180,220 120,440 280,560 C 440,680 400,750 550,850"
            stroke="#9FD5B2"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M 120,50 C 260,180 200,400 360,520 C 520,640 480,720 620,800"
            stroke="#12314C"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M -20,200 C 120,320 80,500 220,640 C 360,780 320,840 450,920"
            stroke="#F6ED4A"
            strokeWidth="1"
            fill="none"
            strokeDasharray="6 6"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'empty') {
    return (
      <div
        className={`w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center select-none pointer-events-none ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#12314C]/40 via-[#9FD5B2]/10 to-[#F6ED4A]/5 border border-brand-mint/20 shadow-[0_0_24px_rgba(159,213,178,0.1)]" />
        <svg
          viewBox="0 0 85 85"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 relative z-10"
        >
          <defs>
            <linearGradient id="empty-z-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9FD5B2" />
              <stop offset="60%" stopColor="#12314C" />
              <stop offset="100%" stopColor="#F6ED4A" />
            </linearGradient>
          </defs>
          <path d={ORGANIC_Z_PATH} fill="url(#empty-z-gradient)" opacity="0.85" />
        </svg>
      </div>
    );
  }

  if (variant === 'contour') {
    return (
      <div
        className={`w-full overflow-hidden pointer-events-none select-none ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1000 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-8 opacity-[0.18]"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,30 Q 250,5 500,35 T 1000,20"
            stroke="url(#contour-grad-mint-navy)"
            strokeWidth="1.2"
            fill="none"
          />
          <path
            d="M 0,45 Q 250,20 500,50 T 1000,35"
            stroke="url(#contour-grad-yellow)"
            strokeWidth="0.8"
            strokeDasharray="4 4"
            fill="none"
            opacity="0.6"
          />
          <defs>
            <linearGradient id="contour-grad-mint-navy" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#12314C" />
              <stop offset="50%" stopColor="#9FD5B2" />
              <stop offset="100%" stopColor="#12314C" />
            </linearGradient>
            <linearGradient id="contour-grad-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9FD5B2" stopOpacity="0.2" />
              <stop offset="60%" stopColor="#F6ED4A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#9FD5B2" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Default Canvas Background Variant
  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-[0.045] object-cover"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="canvas-z-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#12314C" />
            <stop offset="50%" stopColor="#9FD5B2" />
            <stop offset="100%" stopColor="#F6ED4A" />
          </linearGradient>
        </defs>

        {/* Large abstract organic Z paths flowing in the background */}
        <g transform="translate(900, -80) scale(7)">
          <path d={ORGANIC_Z_PATH} stroke="url(#canvas-z-grad)" strokeWidth="0.5" fill="none" />
        </g>
        <g transform="translate(-100, 350) scale(6)">
          <path d={ORGANIC_Z_PATH} stroke="#12314C" strokeWidth="0.6" fill="none" opacity="0.6" />
        </g>

        {/* Flowing contour lines */}
        <path
          d="M -50,180 C 300,80 600,320 950,220 C 1300,120 1400,280 1500,200"
          stroke="#9FD5B2"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M 0,420 C 350,300 700,560 1050,440 C 1400,320 1450,480 1520,380"
          stroke="#12314C"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M -20,680 C 280,580 620,820 980,700 C 1340,580 1420,740 1510,640"
          stroke="#F6ED4A"
          strokeWidth="0.8"
          strokeDasharray="8 6"
          fill="none"
        />
      </svg>
    </div>
  );
});

export default BrandAmbientShape;
