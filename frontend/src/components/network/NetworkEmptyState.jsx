import { motion, useReducedMotion } from "framer-motion";
import { Users } from "lucide-react";

/**
 * NetworkEmptyState Component
 * Clean, compact empty state for empty network views or search results.
 *
 * @param {Object} props
 * @param {React.ComponentType<{ className?: string }>} [props.icon=Users] - Lucide icon component
 * @param {string} [props.title='Your network is waiting to grow.'] - Main title
 * @param {string} [props.description='Discover students and connect through learning.'] - Subtitle
 * @param {function(): void} [props.action] - Primary button action
 * @param {string} [props.actionLabel='Discover Students'] - Button label
 * @param {string} [props.className=''] - Additional styling
 */
export default function NetworkEmptyState({
  icon: Icon = Users,
  title = "Your network is waiting to grow.",
  description = "Discover students and connect through learning.",
  action,
  actionLabel = "Discover Students",
  className = "",
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-white/[0.08] bg-bg-surface/50 p-8 sm:p-12 backdrop-blur-xl ${className}`}
    >
      {/* Icon Pill */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-mint/20 bg-brand-mint/[0.08] text-brand-mint shadow-inner mb-4">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      {/* Heading */}
      <h3 className="text-base sm:text-lg font-heading font-bold text-white mb-1.5">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs sm:text-sm text-text-secondary max-w-md leading-relaxed mb-5">
          {description}
        </p>
      )}

      {/* CTA Action */}
      {action && (
        <button
          type="button"
          onClick={action}
          className="btn-primary py-2 px-5 text-xs focus-ring"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
