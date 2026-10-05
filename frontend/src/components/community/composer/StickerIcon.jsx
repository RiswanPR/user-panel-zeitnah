import { memo } from 'react';

/**
 * StickerIcon — Pure React SVG renderer for curated Zeitnah Community stickers (Phase 3D).
 * Guarantees zero XSS exposure without using dangerouslySetInnerHTML.
 */
function StickerIconComponent({ stickerId, className = 'w-full h-full' }) {
  switch (stickerId) {
    case 'zn-verified':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill="#10B981" />
          <path d="M14 24L21 31L34 17" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'zn-logo':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill="#070B14" stroke="#10B981" strokeWidth="2" />
          <path d="M15 15H33L15 33H33" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'fire':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M24 4C24 4 14 16 14 28C14 34.627 18.477 40 24 40C29.523 40 34 34.627 34 28C34 16 24 4 24 4Z" fill="#F97316" />
          <path d="M24 16C24 16 18 24 18 30C18 33.314 20.686 36 24 36C27.314 36 30 33.314 30 30C30 24 24 16 24 16Z" fill="#FACC15" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M24 42L20.8 39.09C10.5 29.74 4 23.84 4 16.5C4 10.5 8.7 6 14.5 6C17.8 6 20.9 7.55 24 10C27.1 7.55 30.2 6 33.5 6C39.3 6 44 10.5 44 16.5C44 23.84 37.5 29.74 27.2 39.09L24 42Z" fill="#EF4444" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M24 4L30.18 16.52L44 18.53L34 28.28L36.36 42.04L24 35.54L11.64 42.04L14 28.28L4 18.53L17.82 16.52L24 4Z" fill="#F59E0B" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M24 6L27 18L39 21L27 24L24 36L21 24L9 21L21 18L24 6Z" fill="#10B981" />
          <path d="M37 29L38.5 35L44.5 36.5L38.5 38L37 44L35.5 38L29.5 36.5L35.5 35L37 29Z" fill="#FBBF24" />
        </svg>
      );
    case 'thumbs-up':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill="#0EA5E9" />
          <path d="M16 22V36M16 26H28C30.2 26 32 24.2 32 22C32 20.8 31 18 29 18H24L25.5 12C25.8 10.9 25 10 24 10C23 10 22 11 21.5 12L16 22Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'trophy':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M14 8H34V20C34 25.52 29.52 30 24 30C18.48 30 14 25.52 14 20V8Z" fill="#F59E0B" />
          <path d="M20 30V38H28V30M16 42H32M14 12H8C6.9 12 6 12.9 6 14C6 17.5 9 20 14 20M34 12H40C41.1 12 42 12.9 42 14C42 17.5 39 20 34 20" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'party':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M8 40L16 20L28 32L8 40Z" fill="#8B5CF6" />
          <circle cx="28" cy="14" r="3" fill="#EF4444" />
          <circle cx="36" cy="22" r="3" fill="#10B981" />
          <circle cx="34" cy="10" r="2.5" fill="#F59E0B" />
          <circle cx="42" cy="16" r="2.5" fill="#3B82F6" />
        </svg>
      );
    case 'rocket':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <path d="M30 6C30 6 36 12 36 22L26 32C16 32 10 26 10 26L16 20L18 22L24 16L22 14L30 6Z" fill="#0EA5E9" />
          <path d="M12 36L8 40M16 38L12 42M20 34L18 42" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'bulb':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="20" r="14" fill="#FBBF24" />
          <path d="M18 34H30M20 38H28M22 42H26" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="20" fill="#10B981" />
          <path d="M16 24L22 30L32 18" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <div className="w-full h-full rounded-full bg-brand-mint/20 border border-brand-mint/40 flex items-center justify-center text-white font-bold text-xs">
          {stickerId || 'Sticker'}
        </div>
      );
  }
}

export const StickerIcon = memo(StickerIconComponent);
export default StickerIcon;
