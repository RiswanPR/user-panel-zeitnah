import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { getUploadUrl } from '../../utils/courseUi';

/**
 * BusinessLogo — Canonical business logo renderer with error fallback.
 *
 * Requirements (Phase 1):
 * 1. Handles valid logo URL or S3 key via getUploadUrl.
 * 2. Gracefully handles missing logo (no logo provided).
 * 3. Gracefully handles broken logo URL (network/image error).
 * 4. Premium Zeitnah aesthetic fallback with Building2 icon and subtle mint accent.
 */
export default function BusinessLogo({
  logo,
  name = 'Business',
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  iconClassName = '',
}) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when logo prop changes
  useEffect(() => {
    setHasError(false);
  }, [logo]);

  const resolvedUrl = logo ? (getUploadUrl(logo) || logo) : null;

  const sizeClasses = {
    xs: 'w-6 h-6 rounded-lg text-xs',
    sm: 'w-8 h-8 rounded-xl text-sm',
    md: 'w-10 h-10 rounded-xl text-base',
    lg: 'w-14 h-14 rounded-2xl text-lg',
    xl: 'w-20 h-20 rounded-2xl text-2xl',
  }[size] || 'w-10 h-10 rounded-xl';

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10',
  }[size] || 'w-5 h-5';

  const initials = name
    ? name
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'B';

  if (resolvedUrl && !hasError) {
    return (
      <div
        className={`relative overflow-hidden bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 shadow-sm ${sizeClasses} ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // Graceful fallback: Building2 icon inside styled container
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-brand-mint/15 to-[#12314C]/40 border border-brand-mint/25 flex items-center justify-center shrink-0 shadow-sm text-brand-mint ${sizeClasses} ${className}`}
      title={name}
      aria-label={`${name} logo`}
    >
      <Building2 className={`${iconSizes} ${iconClassName}`} aria-hidden="true" />
    </div>
  );
}
