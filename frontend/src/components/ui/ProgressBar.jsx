import { motion } from 'framer-motion';

/**
 * Animated progress bar with gradient and label support.
 *
 * @param {number} value – Current progress (0-100)
 * @param {'mint' | 'success' | 'info'} variant
 * @param {boolean} showLabel – Show percentage label
 * @param {'sm' | 'md'} size
 */

const gradients = {
  mint: 'bg-gradient-to-r from-brand-mint to-brand-yellow',
  success: 'bg-gradient-to-r from-success to-brand-mint',
  info: 'bg-gradient-to-r from-info to-brand-mint',
};

const heights = {
  sm: 'h-1.5',
  md: 'h-2',
};

export default function ProgressBar({
  value = 0,
  variant = 'mint',
  showLabel = false,
  size = 'md',
  className = '',
  label,
  animated = true,
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          {label && <span>{label}</span>}
          {showLabel && <span className="font-bold text-white">{clamped}%</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-white/[0.06] ${heights[size]}`}>
        {animated ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${gradients[variant]}`}
          />
        ) : (
          <div
            className={`h-full rounded-full ${gradients[variant]}`}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  );
}
