import React from 'react';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

/**
 * Zeitnah 2.0 Editorial Empty State
 * Calms empty lists, tabs, and dashboards with clear next steps.
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = '',
  action,
  actionLabel = 'Explore',
  secondaryAction,
  secondaryActionLabel,
  children,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-8 sm:p-12 flex flex-col items-center justify-center text-center ${className}`}
    >
      {/* Icon with refined double ring badge */}
      <div className="relative mb-4 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-brand-mint/10 blur-xl pointer-events-none" />
        <div className="relative w-14 h-14 rounded-2xl bg-white/[0.03] border border-brand-mint/25 flex items-center justify-center text-brand-mint shadow-inner">
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-heading font-bold text-white tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-xs sm:text-sm font-normal text-text-muted max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}

      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center justify-center flex-wrap gap-3">
          {action &&
            (typeof action === 'function' ? (
              <button
                type="button"
                onClick={action}
                className="zn-btn-primary text-xs px-4 py-2 min-h-[40px]"
              >
                {actionLabel}
              </button>
            ) : (
              action
            ))}

          {secondaryAction &&
            (typeof secondaryAction === 'function' ? (
              <button
                type="button"
                onClick={secondaryAction}
                className="zn-btn-secondary text-xs px-4 py-2 min-h-[40px]"
              >
                {secondaryActionLabel}
              </button>
            ) : (
              secondaryAction
            ))}
        </div>
      )}
    </motion.div>
  );
}
