import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * NetworkErrorState Component
 * Error display with retry capability when network data fails to load.
 *
 * @param {Object} props
 * @param {string} [props.title='Unable to load your network'] - Error headline
 * @param {string} [props.message='Something went wrong while loading Network.'] - Error message
 * @param {function(): void} [props.onRetry] - Retry callback function
 * @param {string} [props.className=''] - Additional container classes
 */
export default function NetworkErrorState({
  title = "Unable to load your network",
  message = "Something went wrong while loading Network.",
  onRetry,
  className = "",
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-danger/20 bg-danger/[0.04] p-8 sm:p-12 backdrop-blur-xl ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/25 bg-danger/10 text-danger mb-4 shadow-inner">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>

      <h3 className="text-base sm:text-lg font-heading font-bold text-white mb-1.5">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-text-secondary max-w-md leading-relaxed mb-6">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary py-2 px-5 text-xs inline-flex items-center gap-2 focus-ring"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Try Again</span>
        </button>
      )}
    </motion.div>
  );
}
