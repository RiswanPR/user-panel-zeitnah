import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options = {}) {
  const { threshold = 1.0, root = null, rootMargin = '0px', onIntersect } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && onIntersect) {
          onIntersect();
        }
      },
      { root, rootMargin, threshold }
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
  }, [targetRef, root, rootMargin, threshold, onIntersect]);

  return { targetRef, isIntersecting };
}
