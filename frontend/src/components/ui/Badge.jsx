/**
 * Unified badge component with semantic variants.
 *
 * @param {'default' | 'success' | 'warning' | 'danger' | 'info' | 'mint' | 'yellow'} variant
 * @param {'sm' | 'md'} size
 */

const variantStyles = {
  default: 'border-white/[0.06] bg-white/[0.03] text-text-muted',
  success: 'border-success/20 bg-success/8 text-success',
  warning: 'border-warning/20 bg-warning/8 text-warning',
  danger: 'border-danger/20 bg-danger/8 text-danger',
  info: 'border-info/20 bg-info/8 text-info',
  mint: 'border-brand-mint/20 bg-brand-mint/8 text-brand-mint',
  yellow: 'border-brand-yellow/15 bg-brand-yellow/5 text-brand-yellow',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-2.5 py-1 text-[10px]',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border font-bold uppercase tracking-wider ${
        variantStyles[variant] || variantStyles.default
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}
