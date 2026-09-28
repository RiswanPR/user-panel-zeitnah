import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * ================================================================
 * ZEITNAH Z MOTIF
 * ================================================================
 *
 * Premium organic Zeitnah Z.
 *
 * Features:
 * - Organic Z silhouette
 * - Cinematic entrance
 * - Subtle organic breathing
 * - Magnetic cursor interaction
 * - 3D micro-parallax
 * - Reactive spotlight
 * - Premium glow
 * - Flowing shimmer
 * - Hover spring
 * - Outline mode
 * - Gradient mode
 * - Reduced-motion support
 *
 * Existing props:
 * - variant
 * - opacity
 * - animated
 * - strokeOnly
 * - className
 * - glow
 * - hoverable
 * - backdrop
 * - breathing
 *
 * Premium props:
 * - magnetic
 * - shimmer
 * - spotlight
 * - entrance
 * - intensity
 */

const COLORS = {
  mint: "#9FD5B2",
  yellow: "#F6ED4A",
  navy: "#12314C",
  white: "#FFFFFF",
};

/**
 * ================================================================
 * ORGANIC Z
 * ================================================================
 */

const ORGANIC_Z_PATH = `
  M 8.2 9.2

  C 8.0 5.4 11.2 2.9 15.1 2.9
  C 19.8 2.9 22.1 6.8 25.0 8.4

  C 27.7 9.9 30.0 8.4 33.0 5.4
  C 36.1 2.3 40.3 2.7 42.5 6.0

  C 45.1 9.7 44.6 14.9 41.4 18.0
  C 38.2 21.1 33.0 23.3 28.1 25.2

  C 23.0 27.2 19.8 29.0 19.0 32.0
  C 18.2 35.0 20.9 38.2 24.0 39.1

  C 27.0 40.0 29.5 37.1 32.8 34.2
  C 35.8 31.5 39.8 30.4 42.2 33.2

  C 45.0 36.3 44.5 40.9 41.2 43.0
  C 37.9 45.1 34.7 43.0 31.7 40.2

  C 28.8 37.5 26.6 39.4 23.6 41.4
  C 19.4 44.2 14.0 44.8 10.1 42.0

  C 6.4 39.2 6.0 34.1 8.9 29.9
  C 11.8 25.7 17.0 23.2 22.8 21.0

  C 28.0 19.0 32.1 17.6 32.1 14.9
  C 32.1 12.9 29.6 11.9 27.0 12.0

  C 23.8 12.0 21.9 14.7 19.0 16.8
  C 16.1 18.9 12.3 18.0 10.0 15.9

  C 8.3 14.1 7.6 11.5 8.2 9.2

  Z
`;

/**
 * Tiny organic variation.
 *
 * The path structure remains compatible with the
 * primary Z so Framer Motion can interpolate it.
 */
const ORGANIC_Z_BREATH_PATH = `
  M 8.15 9.15

  C 7.85 5.25 11.15 2.65 15.20 2.65
  C 19.95 2.65 22.25 6.65 25.10 8.30

  C 27.85 9.90 30.15 8.25 33.15 5.15
  C 36.35 2.05 40.55 2.55 42.70 5.95

  C 45.35 9.70 44.80 15.05 41.55 18.15
  C 38.30 21.30 33.05 23.40 28.05 25.35

  C 22.85 27.40 19.65 29.10 18.85 32.15
  C 18.05 35.30 20.80 38.45 24.05 39.30

  C 27.15 40.15 29.65 37.15 32.95 34.20
  C 35.95 31.45 39.95 30.35 42.35 33.20

  C 45.15 36.40 44.70 41.05 41.35 43.20
  C 37.95 45.35 34.65 43.10 31.60 40.20

  C 28.70 37.40 26.45 39.40 23.50 41.50
  C 19.25 44.35 13.80 44.95 9.90 42.10

  C 6.15 39.25 5.80 34.00 8.75 29.80
  C 11.70 25.55 16.95 23.05 22.85 20.85

  C 28.10 18.90 32.20 17.45 32.20 14.80
  C 32.20 12.75 29.55 11.75 26.90 11.85

  C 23.65 11.85 21.80 14.65 18.90 16.85
  C 15.95 19.05 12.15 18.05 9.85 15.85

  C 8.15 14.05 7.50 11.45 8.15 9.15

  Z
`;

/**
 * ================================================================
 * REDUCED MOTION
 * ================================================================
 *
 * We intentionally do not use Framer Motion's useReducedMotion()
 * because the project runtime previously reported:
 *
 * TypeError: useReducedMotion is not a function
 *
 * This native media-query implementation avoids that dependency.
 */

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] =
    useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

    const handleChange = () => {
      setReducedMotion(
        mediaQuery.matches
      );
    };

    handleChange();

    if (
      typeof mediaQuery.addEventListener ===
      "function"
    ) {
      mediaQuery.addEventListener(
        "change",
        handleChange
      );

      return () => {
        mediaQuery.removeEventListener(
          "change",
          handleChange
        );
      };
    }

    if (
      typeof mediaQuery.addListener ===
      "function"
    ) {
      mediaQuery.addListener(
        handleChange
      );

      return () => {
        mediaQuery.removeListener(
          handleChange
        );
      };
    }

    return undefined;
  }, []);

  return reducedMotion;
}

/**
 * ================================================================
 * OPACITY
 * ================================================================
 */

function normalizeOpacity(value) {
  if (typeof value !== "number") {
    return 1;
  }

  if (value <= 1) {
    return Math.min(
      1,
      Math.max(0, value)
    );
  }

  return (
    Math.min(
      100,
      Math.max(0, value)
    ) / 100
  );
}

/**
 * ================================================================
 * COMPONENT
 * ================================================================
 */

const ZeitnahZMotif = memo(
  function ZeitnahZMotif({
    variant = "brand",

    opacity = 100,

    animated = false,

    strokeOnly = false,

    glow = false,

    hoverable = false,

    backdrop = false,

    breathing = true,

    className = "h-64 w-64",

    /**
     * Premium controls
     */
    magnetic = true,

    shimmer = true,

    spotlight = true,

    entrance = true,

    intensity = 1,

    ...props
  }) {
    /**
     * ------------------------------------------------------------
     * React / IDs
     * ------------------------------------------------------------
     */

    const reactId = useId();

    const reducedMotion =
      usePrefersReducedMotion();

    const id = useMemo(
      () =>
        reactId.replace(
          /[^a-zA-Z0-9_-]/g,
          ""
        ),
      [reactId]
    );

    const gradientId =
      `zeitnah-z-gradient-${id}`;

    const shimmerId =
      `zeitnah-z-shimmer-${id}`;

    const glowId =
      `zeitnah-z-glow-${id}`;

    /**
     * ------------------------------------------------------------
     * Variant
     * ------------------------------------------------------------
     */

    const effectiveVariant =
      variant === "brand"
        ? "navy"
        : variant;

    const isOutline =
      strokeOnly ||
      variant === "outline";

    const normalizedOpacity =
      normalizeOpacity(opacity);

    let singleFill =
      COLORS.mint;

    if (
      effectiveVariant ===
      "yellow"
    ) {
      singleFill =
        COLORS.yellow;
    }

    if (
      effectiveVariant ===
      "navy"
    ) {
      singleFill =
        COLORS.navy;
    }

    if (
      effectiveVariant ===
      "white"
    ) {
      singleFill =
        COLORS.white;
    }

    /**
     * ------------------------------------------------------------
     * Motion states
     * ------------------------------------------------------------
     */

    const shouldAnimate =
      !reducedMotion &&
      (animated || breathing);

    const interactive =
      !reducedMotion &&
      (magnetic || hoverable);

    const shouldShimmer =
      !reducedMotion &&
      shimmer &&
      shouldAnimate;

    const shouldSpotlight =
      !reducedMotion &&
      spotlight &&
      interactive;

    /**
     * ------------------------------------------------------------
     * Cursor position
     * ------------------------------------------------------------
     */

    const pointerX =
      useMotionValue(0);

    const pointerY =
      useMotionValue(0);

    /**
     * Smooth cursor interpolation
     */

    const smoothPointerX =
      useSpring(
        pointerX,
        {
          stiffness: 120,
          damping: 22,
          mass: 0.55,
        }
      );

    const smoothPointerY =
      useSpring(
        pointerY,
        {
          stiffness: 120,
          damping: 22,
          mass: 0.55,
        }
      );

    /**
     * ------------------------------------------------------------
     * Magnetic movement
     * ------------------------------------------------------------
     */

    const magneticX =
      useTransform(
        smoothPointerX,
        [-1, 1],
        [
          -8 * intensity,
          8 * intensity,
        ]
      );

    const magneticY =
      useTransform(
        smoothPointerY,
        [-1, 1],
        [
          -8 * intensity,
          8 * intensity,
        ]
      );

    /**
     * ------------------------------------------------------------
     * 3D tilt
     * ------------------------------------------------------------
     */

    const rotateX =
      useTransform(
        smoothPointerY,
        [-1, 1],
        [
          3.5 * intensity,
          -3.5 * intensity,
        ]
      );

    const rotateY =
      useTransform(
        smoothPointerX,
        [-1, 1],
        [
          -3.5 * intensity,
          3.5 * intensity,
        ]
      );

    /**
     * ------------------------------------------------------------
     * Spotlight
     * ------------------------------------------------------------
     */

    const spotlightX =
      useTransform(
        smoothPointerX,
        [-1, 1],
        [18, 82]
      );

    const spotlightY =
      useTransform(
        smoothPointerY,
        [-1, 1],
        [18, 82]
      );

    const spotlightBackground =
      useMotionTemplate`
        radial-gradient(
          190px circle at
          ${spotlightX}% ${spotlightY}%,
          rgba(255,255,255,0.12),
          rgba(159,213,178,0.055) 28%,
          transparent 72%
        )
      `;

    /**
     * ------------------------------------------------------------
     * Hover
     * ------------------------------------------------------------
     */

    const [
      isHovered,
      setIsHovered,
    ] = useState(false);

    const hoverScale =
      useMotionValue(1);

    const smoothHoverScale =
      useSpring(
        hoverScale,
        {
          stiffness: 190,
          damping: 20,
          mass: 0.45,
        }
      );

    /**
     * ------------------------------------------------------------
     * Pointer handlers
     * ------------------------------------------------------------
     */

    const handlePointerEnter =
      useCallback(() => {
        if (!interactive) {
          return;
        }

        setIsHovered(true);

        if (hoverable) {
          hoverScale.set(1.028);
        }
      }, [
        interactive,
        hoverable,
        hoverScale,
      ]);

    const handlePointerLeave =
      useCallback(() => {
        setIsHovered(false);

        pointerX.set(0);
        pointerY.set(0);

        hoverScale.set(1);
      }, [
        pointerX,
        pointerY,
        hoverScale,
      ]);

    const handlePointerMove =
      useCallback(
        (event) => {
          if (!interactive) {
            return;
          }

          const rect =
            event.currentTarget.getBoundingClientRect();

          if (
            rect.width === 0 ||
            rect.height === 0
          ) {
            return;
          }

          const normalizedX =
            (
              (event.clientX -
                rect.left) /
              rect.width
            ) *
            2 -
            1;

          const normalizedY =
            (
              (event.clientY -
                rect.top) /
              rect.height
            ) *
            2 -
            1;

          pointerX.set(
            Math.max(
              -1,
              Math.min(
                1,
                normalizedX
              )
            )
          );

          pointerY.set(
            Math.max(
              -1,
              Math.min(
                1,
                normalizedY
              )
            )
          );
        },
        [
          interactive,
          pointerX,
          pointerY,
        ]
      );

    /**
     * ------------------------------------------------------------
     * Gradient
     * ------------------------------------------------------------
     */

    const gradientFill =
      `url(#${gradientId})`;

    /**
     * ------------------------------------------------------------
     * Pointer behavior
     * ------------------------------------------------------------
     */

    const pointerClass =
      interactive
        ? "pointer-events-auto"
        : "pointer-events-none";

    /**
     * ============================================================
     * RENDER
     * ============================================================
     */

    return (
      <motion.div
        aria-hidden="true"

        className={`
          relative
          select-none
          ${pointerClass}
          ${className}
        `}

        /**
         * --------------------------------------------------------
         * Cinematic entrance
         * --------------------------------------------------------
         */

        initial={
          entrance &&
            !reducedMotion
            ? {
              opacity: 0,
              scale: 0.94,
              y: 16,
              filter:
                "blur(10px)",
            }
            : false
        }

        animate={
          entrance &&
            !reducedMotion
            ? {
              opacity: 1,
              scale: 1,
              y: 0,
              filter:
                "blur(0px)",
            }
            : undefined
        }

        transition={
          entrance &&
            !reducedMotion
            ? {
              duration: 1.15,
              ease: [
                0.16,
                1,
                0.3,
                1,
              ],
            }
            : undefined
        }

        onPointerEnter={
          handlePointerEnter
        }

        onPointerMove={
          handlePointerMove
        }

        onPointerLeave={
          handlePointerLeave
        }

        {...props}
      >
        {/* ========================================================
            ATMOSPHERIC BACKDROP
           ======================================================== */}

        {backdrop && (
          <motion.div
            className="
              pointer-events-none
              absolute
              inset-[-15%]
              rounded-full
            "
            style={{
              background: `
                radial-gradient(
                  circle at 32% 28%,
                  rgba(159,213,178,0.13),
                  transparent 40%
                ),
                radial-gradient(
                  circle at 72% 74%,
                  rgba(246,237,74,0.06),
                  transparent 42%
                )
              `,
              filter:
                "blur(32px)",
            }}
            animate={
              shouldAnimate
                ? {
                  opacity: [
                    0.45,
                    0.72,
                    0.45,
                  ],
                  scale: [
                    0.98,
                    1.035,
                    0.98,
                  ],
                }
                : undefined
            }
            transition={
              shouldAnimate
                ? {
                  duration: 8.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
                : undefined
            }
          />
        )}

        {/* ========================================================
            PREMIUM GLOW
           ======================================================== */}

        {glow && (
          <motion.div
            className="
              pointer-events-none
              absolute
              inset-[3%]
              rounded-full
              blur-[44px]
            "
            style={{
              backgroundColor:
                effectiveVariant ===
                  "yellow"
                  ? COLORS.yellow
                  : effectiveVariant ===
                    "white"
                    ? COLORS.white
                    : COLORS.mint,

              opacity:
                normalizedOpacity *
                (isHovered
                  ? 0.31
                  : 0.16),
            }}
            animate={
              shouldAnimate
                ? {
                  scale: [
                    0.94,
                    1.045,
                    0.94,
                  ],
                  opacity: [
                    normalizedOpacity *
                    0.11,
                    normalizedOpacity *
                    0.22,
                    normalizedOpacity *
                    0.11,
                  ],
                }
                : undefined
            }
            transition={
              shouldAnimate
                ? {
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
                : undefined
            }
          />
        )}

        {/* ========================================================
            CURSOR LIGHT
           ======================================================== */}

        {shouldSpotlight && (
          <motion.div
            className="
              pointer-events-none
              absolute
              inset-0
              z-30
              overflow-hidden
              rounded-[30%]
            "
            style={{
              background:
                spotlightBackground,
            }}
            animate={{
              opacity:
                isHovered
                  ? 1
                  : 0.5,
            }}
            transition={{
              duration: 0.35,
              ease: "easeOut",
            }}
          />
        )}

        {/* ========================================================
            AMBIENT MOTION
           ======================================================== */}

        <motion.div
          className="
            relative
            h-full
            w-full
          "
          animate={
            shouldAnimate
              ? {
                y: [
                  0,
                  -3,
                  0,
                  2.5,
                  0,
                ],

                rotateZ: [
                  0,
                  0.18,
                  0,
                  -0.18,
                  0,
                ],

                scale: [
                  1,
                  1.005,
                  1,
                  0.998,
                  1,
                ],
              }
              : undefined
          }
          transition={
            shouldAnimate
              ? {
                duration: 10.5,
                repeat: Infinity,
                ease: "easeInOut",
              }
              : undefined
          }
        >
          {/* ======================================================
              MAGNETIC / 3D
             ====================================================== */}

          <motion.div
            className="
              relative
              h-full
              w-full
            "
            style={{
              x: magnetic
                ? magneticX
                : 0,

              y: magnetic
                ? magneticY
                : 0,

              rotateX: magnetic
                ? rotateX
                : 0,

              rotateY: magnetic
                ? rotateY
                : 0,

              scale:
                smoothHoverScale,

              transformPerspective:
                900,

              transformStyle:
                "preserve-3d",
            }}
          >
            {/* ==================================================
                SVG
               ================================================== */}

            <svg
              viewBox="0 0 48 46"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
              className="
                relative
                z-10
                h-full
                w-full
                overflow-visible
              "
              style={{
                opacity:
                  normalizedOpacity,
              }}
            >
              <defs>
                {/* ==============================================
                    MAIN GRADIENT
                   ============================================== */}

                <linearGradient
                  id={gradientId}
                  x1="4"
                  y1="3"
                  x2="44"
                  y2="43"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop
                    offset="0"
                    stopColor={
                      COLORS.mint
                    }
                  />

                  <stop
                    offset="0.42"
                    stopColor={
                      COLORS.mint
                    }
                  />

                  <stop
                    offset="0.73"
                    stopColor={
                      COLORS.navy
                    }
                  />

                  <stop
                    offset="1"
                    stopColor={
                      COLORS.yellow
                    }
                  />
                </linearGradient>

                {/* ==============================================
                    SHIMMER
                   ============================================== */}

                <linearGradient
                  id={shimmerId}
                  x1="-35"
                  y1="12"
                  x2="-5"
                  y2="34"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop
                    offset="0"
                    stopColor="#FFFFFF"
                    stopOpacity="0"
                  />

                  <stop
                    offset="0.42"
                    stopColor="#FFFFFF"
                    stopOpacity="0"
                  />

                  <stop
                    offset="0.50"
                    stopColor="#FFFFFF"
                    stopOpacity="0.15"
                  />

                  <stop
                    offset="0.58"
                    stopColor="#FFFFFF"
                    stopOpacity="0"
                  />

                  <stop
                    offset="1"
                    stopColor="#FFFFFF"
                    stopOpacity="0"
                  />
                </linearGradient>

                {/* ==============================================
                    GLOW
                   ============================================== */}

                <filter
                  id={glowId}
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                >
                  <feGaussianBlur
                    stdDeviation="1.1"
                    result="blur"
                  />

                  <feMerge>
                    <feMergeNode
                      in="blur"
                    />

                    <feMergeNode
                      in="SourceGraphic"
                    />
                  </feMerge>
                </filter>
              </defs>

              {/* ================================================
                  MAIN Z
                 ================================================= */}

              <motion.path
                d={ORGANIC_Z_PATH}

                fill={
                  isOutline
                    ? "none"
                    : effectiveVariant ===
                      "gradient"
                      ? gradientFill
                      : singleFill
                }

                stroke={
                  isOutline
                    ? effectiveVariant ===
                      "yellow"
                      ? COLORS.yellow
                      : effectiveVariant ===
                        "navy"
                        ? COLORS.navy
                        : effectiveVariant ===
                          "white"
                          ? COLORS.white
                          : COLORS.mint
                    : "none"
                }

                strokeWidth={
                  isOutline
                    ? 1.1
                    : undefined
                }

                strokeLinecap="round"
                strokeLinejoin="round"

                vectorEffect={
                  isOutline
                    ? "non-scaling-stroke"
                    : undefined
                }

                filter={
                  glow && !isOutline
                    ? `url(#${glowId})`
                    : undefined
                }

                animate={
                  shouldAnimate
                    ? {
                      d: [
                        ORGANIC_Z_PATH,
                        ORGANIC_Z_BREATH_PATH,
                        ORGANIC_Z_PATH,
                      ],
                    }
                    : undefined
                }

                transition={
                  shouldAnimate
                    ? {
                      duration: 11,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                    : undefined
                }
              />

              {/* ================================================
                  FLOWING SHIMMER
                 ================================================= */}

              {!isOutline &&
                shouldShimmer && (
                  <motion.rect
                    x="-60"
                    y="-10"
                    width="38"
                    height="70"
                    rx="18"
                    fill={`url(#${shimmerId})`}
                    transform="rotate(24 0 0)"
                    pointerEvents="none"
                    style={{
                      mixBlendMode:
                        "screen",
                    }}
                    animate={{
                      x: [
                        -55,
                        12,
                        55,
                      ],
                      opacity: [
                        0,
                        0.75,
                        0,
                      ],
                    }}
                    transition={{
                      duration: 5.8,
                      repeat: Infinity,
                      repeatDelay: 1.8,
                      ease: [
                        0.16,
                        1,
                        0.3,
                        1,
                      ],
                    }}
                  />
                )}

              {/* ================================================
                  EDGE LIGHT
                 ================================================= */}

              {!isOutline && (
                <motion.path
                  d={ORGANIC_Z_PATH}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="0.34"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                  animate={
                    shouldAnimate
                      ? {
                        opacity: [
                          0.025,
                          0.055,
                          0.025,
                        ],
                      }
                      : {
                        opacity:
                          isHovered
                            ? 0.075
                            : 0.025,
                      }
                  }
                  transition={
                    shouldAnimate
                      ? {
                        duration: 5.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                      : {
                        duration: 0.3,
                      }
                  }
                />
              )}

              {/* ================================================
                  ENTRANCE TRACE
                 ================================================= */}

              {!reducedMotion &&
                entrance && (
                  <motion.path
                    d={ORGANIC_Z_PATH}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="0.42"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    pathLength={1}
                    pointerEvents="none"
                    initial={{
                      pathLength: 0,
                      opacity: 0,
                    }}
                    animate={{
                      pathLength: 1,
                      opacity: 0.055,
                    }}
                    transition={{
                      pathLength: {
                        duration: 1.25,
                        ease: [
                          0.16,
                          1,
                          0.3,
                          1,
                        ],
                      },
                      opacity: {
                        duration: 0.5,
                        delay: 0.2,
                      },
                    }}
                  />
                )}
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>
  );
});

ZeitnahZMotif.displayName =
  "ZeitnahZMotif";

export default ZeitnahZMotif;