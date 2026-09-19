import { motion, useReducedMotion } from 'framer-motion';

/**
 * Wraps page content in a smooth enter/exit animation.
 * Use this inside route layout components.
 * Respects prefers-reduced-motion for accessibility.
 */
export default function PageTransition({ children, className = '' }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
