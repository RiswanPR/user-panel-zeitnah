import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Reusable error state with retry action.
 */
export default function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
    >
      <div className="h-16 w-16 rounded-2xl bg-danger/8 border border-danger/15 flex items-center justify-center text-danger mb-5">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-heading font-bold text-white mb-2">{title}</h3>
      <p className="text-sm font-medium text-text-muted max-w-sm leading-relaxed mb-6">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary py-2.5 px-5"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </motion.div>
  );
}
