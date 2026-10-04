/**
 * ZEITNAH ONBOARDING TOUR — SMART POSITIONING & GEOMETRY ENGINE
 *
 * Provides sub-pixel target measuring, collision detection, and responsive
 * placement calculations with zero layout shift and safe viewport margins.
 */

/**
 * Finds the currently rendered and visible DOM element matching the selector.
 * Robust against responsive layouts where both desktop and mobile elements
 * may exist in the DOM with different visibility states.
 */
export function findVisibleTarget(selector) {
  if (!selector || typeof document === 'undefined') return null;

  try {
    const candidates = document.querySelectorAll(selector);
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      if (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      ) {
        return el;
      }
    }
  } catch {}

  return null;
}

/**
 * Calculates spotlight cutout geometry around a target element.
 */
export function calculateSpotlightGeometry(targetEl, padding = 8) {
  if (!targetEl || typeof window === 'undefined') {
    return null;
  }

  const rect = targetEl.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(targetEl);
  const rawRadius = parseFloat(computedStyle.borderRadius) || 12;

  const top = Math.max(0, rect.top - padding);
  const left = Math.max(0, rect.left - padding);
  const width = Math.min(window.innerWidth - left, rect.width + padding * 2);
  const height = Math.min(window.innerHeight - top, rect.height + padding * 2);

  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    borderRadius: Math.min(24, Math.max(8, rawRadius + 2)),
    center: {
      x: left + width / 2,
      y: top + height / 2,
    },
  };
}

/**
 * Computes optimal tooltip placement relative to target rectangle.
 * Prevents viewport clipping and dynamically selects the best placement.
 */
export function calculateTooltipPlacement({
  targetRect,
  tooltipWidth = 360,
  tooltipHeight = 240,
  preferredPlacement = 'bottom',
  viewportPadding = 16,
  margin = 12,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800,
}) {
  // If no target is active (e.g. Welcome or Finish screen), center in viewport
  if (!targetRect) {
    return {
      top: Math.max(viewportPadding, (viewportHeight - tooltipHeight) / 2),
      left: Math.max(viewportPadding, (viewportWidth - tooltipWidth) / 2),
      placement: 'center',
      arrowOffset: 0,
    };
  }

  // Available spaces in 4 directions
  const spaceBelow = viewportHeight - targetRect.bottom - margin - viewportPadding;
  const spaceAbove = targetRect.top - margin - viewportPadding;
  const spaceRight = viewportWidth - targetRect.right - margin - viewportPadding;
  const spaceLeft = targetRect.left - margin - viewportPadding;

  // Determine viable placement
  let placement = preferredPlacement;

  const fitsPreferred =
    (preferredPlacement === 'bottom' && spaceBelow >= tooltipHeight) ||
    (preferredPlacement === 'top' && spaceAbove >= tooltipHeight) ||
    (preferredPlacement === 'right' && spaceRight >= tooltipWidth) ||
    (preferredPlacement === 'left' && spaceLeft >= tooltipWidth);

  if (!fitsPreferred) {
    if (preferredPlacement === 'bottom' && spaceAbove >= tooltipHeight) {
      placement = 'top';
    } else if (preferredPlacement === 'top' && spaceBelow >= tooltipHeight) {
      placement = 'bottom';
    } else if (preferredPlacement === 'right' && spaceLeft >= tooltipWidth) {
      placement = 'left';
    } else if (preferredPlacement === 'left' && spaceRight >= tooltipWidth) {
      placement = 'right';
    } else {
      // If neither fits, choose side with maximum space
      const spaces = [
        { side: 'bottom', space: spaceBelow },
        { side: 'top', space: spaceAbove },
        { side: 'right', space: spaceRight },
        { side: 'left', space: spaceLeft },
      ];
      spaces.sort((a, b) => b.space - a.space);

      if (spaces[0].side === 'bottom' && spaceBelow < tooltipHeight * 0.7 && spaceAbove > spaceBelow) {
        placement = 'top';
      } else {
        placement = spaces[0].side;
      }
    }
  }

  let top;
  let left;

  // Coordinate calculation
  switch (placement) {
    case 'top':
      top = targetRect.top - tooltipHeight - margin;
      left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
      break;

    case 'bottom':
      top = targetRect.bottom + margin;
      left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
      break;

    case 'left':
      left = targetRect.left - tooltipWidth - margin;
      top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
      break;

    case 'right':
      left = targetRect.right + margin;
      top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
      break;

    default:
      placement = 'bottom';
      top = targetRect.bottom + margin;
      left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
      break;
  }

  // Constrain horizontally within viewport bounds
  const minLeft = viewportPadding;
  const maxLeft = Math.max(viewportPadding, viewportWidth - tooltipWidth - viewportPadding);
  left = Math.max(minLeft, Math.min(left, maxLeft));

  // Constrain vertically within viewport bounds
  const minTop = viewportPadding;
  const maxTop = Math.max(viewportPadding, viewportHeight - tooltipHeight - viewportPadding);
  top = Math.max(minTop, Math.min(top, maxTop));

  // Compute arrow offset relative to target center
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const arrowOffset = Math.max(20, Math.min(tooltipWidth - 20, targetCenterX - left));

  return {
    top: Math.round(top),
    left: Math.round(left),
    placement,
    arrowOffset: Math.round(arrowOffset),
  };
}
