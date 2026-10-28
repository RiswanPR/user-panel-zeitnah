import { useState, useCallback } from "react";

/**
 * useCardSpotlight
 *
 * Micro-hook to track cursor position inside an interactive card.
 * Enables tactile radial spotlight illumination in Light Mode without re-rendering outer layouts.
 *
 * @param {object} options
 * @param {number} options.radius - Spotlight radius in px (default: 450)
 * @returns {object} { onMouseMove, onMouseLeave, spotlightStyle, borderSpotlightStyle, isHovered, x, y }
 */
export function useCardSpotlight({ radius = 450 } = {}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const onMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const spotlightStyle = {
    opacity: isHovered ? 1 : 0,
    background: `radial-gradient(${radius}px circle at ${position.x}px ${position.y}px, rgba(159, 213, 178, 0.22), transparent 75%)`,
    transition: "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    pointerEvents: "none",
  };

  const borderSpotlightStyle = {
    opacity: isHovered ? 1 : 0,
    background: `radial-gradient(${radius * 0.75}px circle at ${position.x}px ${position.y}px, rgba(246, 237, 74, 0.35), transparent 70%)`,
    transition: "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    pointerEvents: "none",
  };

  return {
    onMouseMove,
    onMouseLeave,
    spotlightStyle,
    borderSpotlightStyle,
    isHovered,
    x: position.x,
    y: position.y,
  };
}

export default useCardSpotlight;
