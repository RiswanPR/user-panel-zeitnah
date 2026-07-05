import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

/**
 * Reusable empty state with icon, title, description, and optional action.
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = '',
  action,
  actionLabel = 'Get Started',
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
    >
      <div className="h-16 w-16 rounded-2xl bg-brand-mint/8 border border-brand-mint/15 flex items-center justify-center text-brand-mint mb-5">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-heading font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm font-medium text-text-muted max-w-sm leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action}
          className="btn-primary mt-6 py-2.5 px-5"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
