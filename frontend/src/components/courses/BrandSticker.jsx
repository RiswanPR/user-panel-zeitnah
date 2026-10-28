import { memo } from "react";
import { motion } from "framer-motion";

/**
 * BrandSticker
 *
 * Tilted editorial brand sticker directly inspired by the Zeitnah Group of Institution
 * Brand Guideline (Page 1 "Everything About" sticker tag & Page 3 variant).
 *
 * Features:
 * - Subtle paper angle tilt (-5° to -7°) with tactile drop shadow
 * - Pure white or brand yellow background with crisp deep navy typography
 * - Tactile micro-bounce on hover with spring physics
 *
 * @param {object} props
 * @param {string} props.children - Sticker text content
 * @param {string} props.variant - "white" | "yellow" | "mint" (default: "white")
 * @param {number} props.rotation - Rotation angle in degrees (default: -5)
 * @param {string} props.className - Additional custom classes
 */
const BrandSticker = memo(function BrandSticker({
  children,
  variant = "white",
  rotation = -5,
  className = "",
}) {
  const bgStyles =
    variant === "yellow"
      ? "bg-brand-yellow text-brand-navy border-amber-400/50 shadow-[0_4px_14px_rgba(246,237,74,0.35)]"
      : variant === "mint"
      ? "bg-brand-mint text-brand-navy border-emerald-500/30 shadow-[0_4px_14px_rgba(159,213,178,0.35)]"
      : "bg-white text-brand-navy border-slate-200/90 shadow-[0_4px_16px_rgba(18,49,76,0.12)]";

  return (
    <motion.div
      initial={{ rotate: rotation, scale: 0.95, opacity: 0 }}
      animate={{ rotate: rotation, scale: 1, opacity: 1 }}
      whileHover={{
        rotate: 0,
        scale: 1.05,
        transition: { type: "spring", stiffness: 450, damping: 20 },
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-extrabold uppercase tracking-widest border select-none cursor-default transform-gpu z-20 ${bgStyles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0 opacity-80" />
      <span>{children}</span>
    </motion.div>
  );
});

export default BrandSticker;
