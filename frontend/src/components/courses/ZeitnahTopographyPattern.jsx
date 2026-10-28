import { memo } from "react";
import { motion } from "framer-motion";

/**
 * ZeitnahTopographyPattern
 *
 * Signature organic topographic contour wave pattern directly derived from the
 * Zeitnah Group of Institution Brand Guideline (Pages 1, 3, & 5).
 *
 * Renders nested undulating contour lines in Brand Mint (#9FD5B2) and Deep Navy (#12314C)
 * to give light-mode cards and hero sections a distinctive, editorial academic signature.
 *
 * @param {object} props
 * @param {string} props.className - Additional tailwind/CSS classes
 * @param {string} props.variant - "mint" | "navy" | "yellow" | "dual" (default: "mint")
 * @param {number} props.opacity - Stroke opacity (default: 0.28)
 * @param {boolean} props.animated - Whether to apply subtle organic breathing motion
 */
const ZeitnahTopographyPattern = memo(function ZeitnahTopographyPattern({
  className = "",
  variant = "mint",
  opacity = 0.28,
  animated = true,
}) {
  const strokeColor =
    variant === "navy"
      ? "#12314C"
      : variant === "yellow"
      ? "#F6ED4A"
      : "#9FD5B2";

  const secondaryColor =
    variant === "dual"
      ? "#F6ED4A"
      : strokeColor;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      style={{ opacity }}
    >
      <motion.svg
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transform-gpu"
        animate={
          animated
            ? {
                rotate: [0, 1.5, -1, 0],
                scale: [1, 1.02, 0.99, 1],
              }
            : undefined
        }
        transition={
          animated
            ? {
                duration: 22,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
      >
        {/* Layer 1: Outer wide undulating contour loop */}
        <path
          d="M 50 120 C 120 70, 220 160, 310 110 C 400 60, 480 130, 560 90 C 590 190, 520 280, 550 380 C 570 450, 490 530, 400 520 C 310 510, 260 580, 170 540 C 90 500, 130 400, 80 320 C 30 240, 0 160, 50 120 Z"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Layer 2: Middle nested organic wave contour */}
        <path
          d="M 90 150 C 150 110, 240 190, 320 150 C 400 110, 460 170, 520 140 C 550 220, 490 300, 510 390 C 530 450, 460 500, 380 480 C 310 460, 270 530, 190 500 C 120 470, 150 380, 110 310 C 70 240, 50 180, 90 150 Z"
          stroke={strokeColor}
          strokeWidth="1.1"
          strokeDasharray="4 2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* Layer 3: Secondary contour line */}
        <path
          d="M 130 180 C 180 150, 260 220, 330 190 C 400 160, 440 210, 480 190 C 510 250, 460 320, 470 400 C 480 440, 430 470, 360 450 C 300 430, 270 480, 210 460 C 150 440, 170 360, 140 300 C 110 240, 90 200, 130 180 Z"
          stroke={secondaryColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Layer 4: Inner focus contour loop */}
        <path
          d="M 170 210 C 210 190, 280 250, 340 230 C 400 210, 420 250, 440 240 C 470 280, 430 340, 430 410 C 430 430, 400 440, 340 420 C 290 400, 270 430, 230 420 C 180 410, 190 340, 170 290 C 150 240, 140 220, 170 210 Z"
          stroke={strokeColor}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />

        {/* Layer 5: Nucleus organic contour */}
        <path
          d="M 210 240 C 240 230, 300 280, 350 270 C 400 260, 400 290, 400 290 C 430 310, 400 360, 390 420 C 380 420, 370 410, 320 390 C 280 370, 270 380, 250 380 C 210 380, 210 320, 200 280 C 190 240, 190 240, 210 240 Z"
          stroke={secondaryColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Layer 6: Center core contour */}
        <path
          d="M 250 270 C 270 270, 320 310, 360 310 C 400 310, 380 330, 370 340 C 390 350, 370 380, 350 430 C 340 410, 340 380, 300 360 C 270 340, 270 340, 260 340 C 240 340, 230 300, 230 270 C 230 250, 240 260, 250 270 Z"
          stroke={strokeColor}
          strokeWidth="1"
          strokeDasharray="2 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />

        {/* Flowing open ridges */}
        <path
          d="M 20 200 Q 180 260, 300 180 T 580 240"
          stroke={strokeColor}
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M 40 380 Q 220 320, 340 400 T 560 320"
          stroke={secondaryColor}
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M 80 480 Q 250 440, 380 500 T 540 460"
          stroke={strokeColor}
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.4"
        />
      </motion.svg>
    </div>
  );
});

export default ZeitnahTopographyPattern;
