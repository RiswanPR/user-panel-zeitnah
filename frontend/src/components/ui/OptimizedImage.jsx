import { useState, useCallback } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

/**
 * Optimized image component with lazy loading, fade-in, and error fallback.
 *
 * @param {string} src – Image URL
 * @param {string} alt – Alt text
 * @param {string} [fallback] – Fallback text or icon
 * @param {string} [className] – Additional classes for the image
 * @param {string} [containerClassName] – Additional classes for the wrapper
 * @param {boolean} [eager=false] – Skip lazy loading (for above-fold images)
 */
export default function OptimizedImage({
  src,
  alt,
  fallback,
  className = '',
  containerClassName = '',
  eager = false,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [ref, isVisible] = useIntersectionObserver({ rootMargin: '200px', triggerOnce: true });

  const shouldLoad = eager || isVisible;

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  if (error || !src) {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-center bg-bg-elevated text-text-muted ${containerClassName}`}
      >
        {fallback || (
          <span className="text-xs font-medium uppercase tracking-wider opacity-40">
            No Image
          </span>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative overflow-hidden ${containerClassName}`}>
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 shimmer" />
      )}

      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          {...rest}
        />
      )}
    </div>
  );
}
