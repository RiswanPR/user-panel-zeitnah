/**
 * Zeitnah — Shared Email Design Tokens & Specifications (Phase 1)
 *
 * Approved Brand Identity:
 * - Brand: Zeitnah
 * - Tagline: See the unseen
 * - Vision: Build, connect, discover
 * - Mission: To build the best global civil community where people can enjoy
 *   progress, network, opportunities, and success through the freedom of knowledge.
 *
 * Visual Direction: Intelligent hybrid, premium light by default, with dark security variants.
 */

export const ZEITNAH_BRAND = {
  name: 'Zeitnah',
  tagline: 'See the unseen',
  vision: 'Build, connect, discover',
  mission:
    'To build the best global civil community where people can enjoy progress, network, opportunities, and success through the freedom of knowledge.',
  copyright: `© ${new Date().getFullYear()} Zeitnah. All rights reserved.`,
  domains: {
    web: 'https://zeitnahacademy.com',
    support: 'support@zeitnahacademy.com',
  },
} as const;

/**
 * 600px max-width container is standard across Gmail, Outlook, Apple Mail, and Yahoo Mail
 */
export const EMAIL_LAYOUT = {
  maxContainerWidth: '600px',
  outerPadding: '40px 16px',
  headerPadding: '32px 32px 24px 32px',
  bodyPadding: '36px 32px',
  footerPadding: '28px 32px',
  borderRadius: {
    card: '16px',
    nestedCard: '12px',
    control: '8px',
    badge: '20px',
  },
} as const;

/**
 * Typography & Font Stacks with MSO safe fallbacks
 */
export const EMAIL_TYPOGRAPHY = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  monoFontFamily:
    "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
  msoFallback: 'Arial, sans-serif',
  fontSizes: {
    h1: '28px',
    h2: '22px',
    h3: '18px',
    body: '15px',
    bodySmall: '13px',
    caption: '11px',
    otpCode: '36px',
  },
  lineHeights: {
    tight: '1.2',
    heading: '1.3',
    body: '1.6',
    relaxed: '1.8',
  },
  letterSpacing: {
    normal: '0',
    tight: '-0.5px',
    wide: '1px',
    badge: '2px',
    otpCode: '10px',
  },
} as const;

/**
 * Color Palette: Premium Light (Default)
 * Curated for exceptional contrast, executive polish, and editorial cleanliness.
 */
export const EMAIL_LIGHT_PALETTE = {
  canvasBg: '#f4f7f8',
  containerBg: '#ffffff',
  headerGradient: 'linear-gradient(135deg, #12314c 0%, #0d2438 100%)',
  headerBgSolid: '#12314c',
  headerText: '#ffffff',
  brandMint: '#9fd5b2',
  brandMintSubtle: 'rgba(159, 213, 178, 0.15)',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  cardBg: '#f8fafc',
  cardBorder: '#e2e8f0',
  divider: '#edf2f7',
  footerBg: '#f9fafb',
  footerBorder: '#edf2f7',
  primaryButtonBg: '#12314c',
  primaryButtonText: '#ffffff',
  primaryButtonShadow: '0 4px 14px rgba(18, 49, 76, 0.25)',
} as const;

/**
 * Color Palette: Dark Security Variant
 * Reserved for security alerts, suspicious login notifications, and system error incidents.
 */
export const EMAIL_DARK_PALETTE = {
  canvasBg: '#0b0f19',
  containerBg: '#0f172a',
  headerGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  headerBgSolid: '#0f172a',
  headerText: '#f8fafc',
  brandMint: '#9fd5b2',
  brandMintSubtle: 'rgba(159, 213, 178, 0.12)',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  cardBg: '#0b0f19',
  cardBorder: '#1e293b',
  divider: '#1e293b',
  footerBg: '#080c14',
  footerBorder: '#1e293b',
  accentBlue: '#38bdf8',
  warningAmber: '#fbbf24',
  warningAmberSubtle: 'rgba(245, 158, 11, 0.12)',
  dangerRed: '#f87171',
  dangerRedSubtle: 'rgba(239, 68, 68, 0.15)',
} as const;

/**
 * Ergonomic OTP styling conventions benchmarked against Amazon Prime Video reference
 */
export const EMAIL_OTP_CARD = {
  tapToSelectCss: '-webkit-user-select: all; user-select: all;',
  light: {
    containerBg: '#f8fafc',
    containerBorder: '1px solid #cbd5e1',
    codeColor: '#0f172a',
    labelColor: '#12314c',
  },
  dark: {
    containerBg: '#0b0f19',
    containerBorder: '1px solid #334155',
    codeColor: '#ffffff',
    labelColor: '#38bdf8',
  },
} as const;
