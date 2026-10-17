import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const INDEX_CSS_PATH = path.resolve(__dirname, '../index.css');
const APP_CSS_PATH = path.resolve(__dirname, '../App.css');
const APP_JSX_PATH = path.resolve(__dirname, '../App.jsx');

/**
 * Helper to compute relative luminance of a hex color.
 */
function getRelativeLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Helper to calculate WCAG contrast ratio between two hex colors.
 */
function getContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('Zeitnah — Phase 1: Semantic Theme Foundation Tests', () => {
  const indexCss = fs.readFileSync(INDEX_CSS_PATH, 'utf8');
  const appCss = fs.readFileSync(APP_CSS_PATH, 'utf8');
  const appJsx = fs.readFileSync(APP_JSX_PATH, 'utf8');

  it('verifies all required semantic color tokens are defined in @theme', () => {
    const requiredThemeTokens = [
      '--color-page-bg:',
      '--color-surface:',
      '--color-surface-card:',
      '--color-surface-elevated:',
      '--color-border:',
      '--color-border-default:',
      '--color-border-subtle:',
      '--color-border-accent:',
      '--color-text-primary:',
      '--color-text-secondary:',
      '--color-text-muted:',
      '--color-text-faint:',
      '--color-primary:',
      '--color-primary-contrast:',
      '--color-accent:',
      '--color-focus-ring:',
      '--color-success:',
      '--color-warning:',
      '--color-danger:',
      '--color-info:',
    ];

    for (const token of requiredThemeTokens) {
      assert.ok(
        indexCss.includes(token),
        `Missing required theme token in @theme: ${token}`
      );
    }
  });

  it('preserves existing token aliases for backward compatibility', () => {
    const backwardCompatibleAliases = [
      '--color-bg-base:',
      '--color-bg-surface:',
      '--color-bg-card:',
      '--color-bg-elevated:',
      '--color-border-default:',
      '--zn-bg:',
      '--zn-surface-1:',
      '--zn-surface-2:',
      '--zn-surface-3:',
      '--zn-surface-card:',
      '--zn-border:',
      '--zn-border-subtle:',
      '--zn-border-accent:',
      '--zn-text:',
      '--zn-text-muted:',
      '--zn-text-faint:',
      '--zn-accent:',
      '--zn-gold:',
      '--zn-navy:',
    ];

    for (const alias of backwardCompatibleAliases) {
      assert.ok(
        indexCss.includes(alias),
        `Missing backward-compatible alias in index.css: ${alias}`
      );
    }
  });

  it('verifies :root defines the default dark theme values exactly matching existing appearance', () => {
    // Expected default values
    assert.match(indexCss, /--zn-token-page-bg:\s*#070B14;/);
    assert.match(indexCss, /--zn-token-surface:\s*#0F1724;/);
    assert.match(indexCss, /--zn-token-surface-card:\s*#131D2D;/);
    assert.match(indexCss, /--zn-token-text-primary:\s*#FFFFFF;/);
    assert.match(indexCss, /--zn-token-primary:\s*#12314C;/);
    assert.match(indexCss, /--zn-token-accent:\s*#9FD5B2;/);
  });

  it('verifies [data-theme="light"] defines the premium light theme foundation', () => {
    assert.match(indexCss, /\[data-theme="light"\]/);
    assert.match(indexCss, /--zn-token-page-bg:\s*#F8FAFC;/);
    assert.match(indexCss, /--zn-token-surface:\s*#FFFFFF;/);
    assert.match(indexCss, /--zn-token-border:\s*#E2E8F0;/);
    assert.match(indexCss, /--zn-token-text-primary:\s*#0A0F1D;/);
    assert.match(indexCss, /--zn-token-text-secondary:\s*#334155;/);
    assert.match(indexCss, /--zn-token-primary:\s*#12314C;/);
    assert.match(indexCss, /--zn-token-accent:\s*#0D7A5F;/);
  });

  it('verifies [data-theme="dark"] defines the explicit dark activation target', () => {
    assert.match(indexCss, /\[data-theme="dark"\]/);
    assert.match(indexCss, /--zn-token-page-bg:\s*#070B14;/);
    assert.match(indexCss, /--zn-token-surface:\s*#0F1724;/);
  });

  it('verifies global focus-visible styling in App.css is migrated to --color-focus-ring', () => {
    assert.match(appCss, /:focus-visible\s*\{[\s\S]*outline:\s*2px solid var\(--color-focus-ring\);/);
    assert.match(appCss, /button:focus-visible,[\s\S]*outline:\s*2px solid var\(--color-focus-ring\);/);
  });

  it('validates WCAG contrast compliance for the light theme foundation', () => {
    const pageBg = '#F8FAFC';
    const surfaceCard = '#FFFFFF';
    const textPrimary = '#0A0F1D';
    const textSecondary = '#334155';
    const textMuted = '#64748B';
    const brandNavy = '#12314C';
    const lightAccent = '#0D7A5F';

    // Primary text on canvas & card must pass WCAG AAA (>= 7.0:1)
    const textOnPage = getContrastRatio(textPrimary, pageBg);
    const textOnCard = getContrastRatio(textPrimary, surfaceCard);
    assert.ok(textOnPage >= 14.0, `Primary text on canvas contrast ${textOnPage.toFixed(2)} should be >= 14`);
    assert.ok(textOnCard >= 15.0, `Primary text on card contrast ${textOnCard.toFixed(2)} should be >= 15`);

    // Secondary text on card must pass WCAG AAA (>= 7.0:1)
    const secondaryOnCard = getContrastRatio(textSecondary, surfaceCard);
    assert.ok(secondaryOnCard >= 9.0, `Secondary text on card contrast ${secondaryOnCard.toFixed(2)} should be >= 9.0`);

    // Muted text on card must pass WCAG AA (>= 4.5:1)
    const mutedOnCard = getContrastRatio(textMuted, surfaceCard);
    assert.ok(mutedOnCard >= 4.5, `Muted text on card contrast ${mutedOnCard.toFixed(2)} should be >= 4.5 (WCAG AA)`);

    // Navy headings/buttons with white text must pass WCAG AAA (>= 7.0:1)
    const whiteOnNavy = getContrastRatio('#FFFFFF', brandNavy);
    assert.ok(whiteOnNavy >= 7.0, `White text on Brand Navy contrast ${whiteOnNavy.toFixed(2)} should be >= 7.0 (WCAG AAA)`);

    // Deepened light accent on white must pass WCAG AA (>= 4.5:1)
    const accentOnCard = getContrastRatio(lightAccent, surfaceCard);
    assert.ok(accentOnCard >= 4.5, `Accent on white contrast ${accentOnCard.toFixed(2)} should be >= 4.5 (WCAG AA)`);
  });

  it('validates WCAG contrast compliance for the dark theme foundation', () => {
    const darkBg = '#070B14';
    const darkText = '#FFFFFF';
    const darkAccent = '#9FD5B2';

    const textContrast = getContrastRatio(darkText, darkBg);
    const accentContrast = getContrastRatio(darkAccent, darkBg);

    assert.ok(textContrast >= 7.0, `Dark primary text contrast ${textContrast.toFixed(2)} should be >= 7.0 (WCAG AAA)`);
    assert.ok(accentContrast >= 7.0, `Dark accent contrast ${accentContrast.toFixed(2)} should be >= 7.0 (WCAG AAA)`);
  });

  it('guarantees Phase 1 strict exclusions: no settings switches or preference hooks introduced prematurely', () => {
    // App.jsx must not have premature theme toggles
    assert.doesNotMatch(appJsx, /ThemeToggle/);
    assert.doesNotMatch(appJsx, /useThemePreference/);
    assert.doesNotMatch(appJsx, /ThemeProvider/);
  });
});
