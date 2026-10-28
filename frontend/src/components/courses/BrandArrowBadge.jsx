import { memo } from "react";
import { motion } from "framer-motion";

/**
 * BrandArrowBadge
 *
 * Signature Brand Yellow circle badge with directional arrow directly from
 * Page 1 of the Zeitnah Group of Institution Brand Guideline.
 *
 * Features:
 * - Brand Yellow (#F6ED4A) circle with Deep Navy (#12314C) arrow
 * - Interactive spring rotation on hover
 * - Subtle ambient glow
 *
 * @param {object} props
 * @param {number} props.size - Dimension in px (default: 44)
 * @param {string} props.className - Additional classes
 * @param {function} props.onClick - Optional click handler
 */
const BrandArrowBadge = memo(function BrandArrowBadge({
  size = 44,
  className = "",
  onClick,
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      tabIndex={onClick ? 0 : -1}
      aria-label="Brand discovery arrow indicator"
      whileHover={{
        scale: 1.12,
        rotate: 15,
        transition: { type: "spring", stiffness: 400, damping: 18 },
      }}
      whileTap={{ scale: 0.95 }}
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center rounded-full bg-brand-yellow text-brand-navy shadow-[0_4px_18px_rgba(246,237,74,0.45)] border border-amber-300/60 cursor-pointer select-none transition-shadow hover:shadow-[0_0_24px_rgba(246,237,74,0.65)] shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-1/2 h-1/2 stroke-current transform-gpu"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Curving dynamic arrow from brand guideline Page 1 */}
        <path d="M 5 17 Q 11 15, 17 9" />
        <path d="M 11 8 L 17 9 L 16 15" />
      </svg>
    </motion.button>
  );
});

export default BrandArrowBadge;
