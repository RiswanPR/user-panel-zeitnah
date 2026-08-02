import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for observing element intersection with viewport.
 *
 * @param {Object} options
 * @param {number}  [options.threshold=1.0]
 * @param {Element} [options.root=null]
 * @param {string}  [options.rootMargin='0px']
 * @param {boolean} [options.triggerOnce=false] – Stop observing after first intersection
 * @param {Function} [options.onIntersect]
 * @returns {{ targetRef: React.RefObject, isIntersecting: boolean }}
 */
export function useIntersectionObserver(options = {}) {
  const {
    threshold = 1.0,
    root = null,
    rootMargin = '0px',
    triggerOnce = false,
    onIntersect,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);
  const hasTriggered = useRef(false);

  const stableOnIntersect = useCallback(
    (entry) => {
      if (onIntersect) onIntersect(entry);
    },
    [onIntersect],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // If triggerOnce and we already fired, skip
        if (triggerOnce && hasTriggered.current) return;

        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting) {
          stableOnIntersect(entry);

          if (triggerOnce) {
            hasTriggered.current = true;
            // Disconnect — no further observation needed
            observer.disconnect();
          }
        }
      },
      { root, rootMargin, threshold },
    );

    const currentTarget = targetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [root, rootMargin, threshold, triggerOnce, stableOnIntersect]);

  return { targetRef, isIntersecting };
}
