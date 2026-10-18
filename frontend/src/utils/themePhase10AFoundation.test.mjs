import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEX_CSS_PATH = path.resolve(__dirname, '../index.css');

describe('Zeitnah — Phase 10A: Foundation, Semantic Tokens, and Shared Primitives Unit Tests', () => {
  const css = fs.readFileSync(INDEX_CSS_PATH, 'utf8');

  it('1. verifies 3-tier corner radius tokens are defined in @theme', () => {
    assert.ok(css.includes('--radius-control: 8px;'), '@theme must define --radius-control as 8px');
    assert.ok(css.includes('--radius-card: 12px;'), '@theme must define --radius-card as 12px');
    assert.ok(css.includes('--radius-modal: 16px;'), '@theme must define --radius-modal as 16px');
  });

  it('2. verifies semantic elevation shadow tokens are bound to active theme variables in @theme', () => {
    assert.ok(css.includes('--shadow-card: var(--zn-token-shadow-card);'), '@theme must map --shadow-card to var(--zn-token-shadow-card)');
    assert.ok(css.includes('--shadow-card-hover: var(--zn-token-shadow-card-hover);'), '@theme must map --shadow-card-hover to var(--zn-token-shadow-card-hover)');
    assert.ok(css.includes('--shadow-popover: var(--zn-token-shadow-popover);'), '@theme must map --shadow-popover to var(--zn-token-shadow-popover)');
    assert.ok(css.includes('--shadow-modal: var(--zn-token-shadow-modal);'), '@theme must map --shadow-modal to var(--zn-token-shadow-modal)');
  });

  it('3. verifies Dark Theme defines restrained depth shadows', () => {
    // Check in :root or [data-theme="dark"]
    assert.ok(css.includes('--zn-token-shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.45)'), 'Dark theme must define restrained card shadow');
    assert.ok(css.includes('--zn-token-shadow-card-hover: 0 8px 30px -4px rgba(0, 0, 0, 0.55)'), 'Dark theme must define card hover shadow');
    assert.ok(css.includes('--zn-token-shadow-popover: 0 12px 36px -6px rgba(0, 0, 0, 0.6)'), 'Dark theme must define popover shadow');
    assert.ok(css.includes('--zn-token-shadow-modal: 0 24px 64px -12px rgba(0, 0, 0, 0.75)'), 'Dark theme must define modal shadow');
  });

  it('4. verifies Light Theme defines crisp, cool-toned elevation shadows', () => {
    assert.ok(css.includes('--zn-token-shadow-card: 0 1px 3px rgba(18, 49, 76, 0.05)'), 'Light theme must define cool-toned card shadow');
    assert.ok(css.includes('--zn-token-shadow-card-hover: 0 6px 24px -4px rgba(18, 49, 76, 0.08)'), 'Light theme must define card hover shadow');
    assert.ok(css.includes('--zn-token-shadow-popover: 0 10px 32px -4px rgba(18, 49, 76, 0.1)'), 'Light theme must define popover shadow');
    assert.ok(css.includes('--zn-token-shadow-modal: 0 20px 48px -8px rgba(18, 49, 76, 0.16)'), 'Light theme must define modal shadow');
  });

  it('5. verifies .glass-input binds to semantic variables and avoids hardcoded dark colors', () => {
    // Extract .glass-input block
    const glassInputMatch = css.match(/\.glass-input\s*\{([^}]+)\}/);
    assert.ok(glassInputMatch, '.glass-input definition must exist in index.css');
    const glassInputBody = glassInputMatch[1];

    assert.ok(glassInputBody.includes('var(--color-surface-elevated'), '.glass-input must bind background to surface-elevated');
    assert.ok(glassInputBody.includes('var(--color-border'), '.glass-input must bind border to semantic border token');
    assert.ok(glassInputBody.includes('var(--color-text-primary'), '.glass-input must bind text color to text-primary');
    assert.doesNotMatch(glassInputBody, /rgba\(7,\s*11,\s*20,\s*0\.6\)/, '.glass-input must not hardcode dark rgba background');
    assert.doesNotMatch(glassInputBody, /color:\s*white;/, '.glass-input must not hardcode color: white');
  });

  it('6. verifies button hierarchy: Light Mode primary CTAs use deep brand navy (#12314C) with white text', () => {
    // Both .btn-primary and .zn-btn-primary must have Light Mode deep navy overrides
    assert.ok(css.includes('[data-theme="light"] .btn-primary'), '[data-theme="light"] .btn-primary rule must exist');
    assert.ok(css.includes('[data-theme="light"] .zn-btn-primary'), '[data-theme="light"] .zn-btn-primary rule must exist');

    // Both must use --zn-token-primary (#12314C) and white text
    const lightBtnPrimary = css.match(/\[data-theme="light"\]\s+\.btn-primary\s*\{([^}]+)\}/);
    assert.ok(lightBtnPrimary, 'Light .btn-primary rule block must exist');
    assert.ok(lightBtnPrimary[1].includes('var(--zn-token-primary)'), 'Light .btn-primary must use brand navy token');
    assert.ok(lightBtnPrimary[1].includes('color: #FFFFFF'), 'Light .btn-primary must use white text');

    const lightZnBtnPrimary = css.match(/\[data-theme="light"\]\s+\.zn-btn-primary\s*\{([^}]+)\}/);
    assert.ok(lightZnBtnPrimary, 'Light .zn-btn-primary rule block must exist');
    assert.ok(lightZnBtnPrimary[1].includes('var(--zn-token-primary)'), 'Light .zn-btn-primary must use brand navy token');
    assert.ok(lightZnBtnPrimary[1].includes('color: #FFFFFF'), 'Light .zn-btn-primary must use white text');
  });

  it('7. verifies secondary CTAs: Light Mode uses white surface, slate border, and readable dark text', () => {
    assert.ok(css.includes('[data-theme="light"] .btn-secondary'), '[data-theme="light"] .btn-secondary rule must exist');
    assert.ok(css.includes('[data-theme="light"] .zn-btn-secondary'), '[data-theme="light"] .zn-btn-secondary rule must exist');

    const lightBtnSecondary = css.match(/\[data-theme="light"\]\s+\.btn-secondary\s*\{([^}]+)\}/);
    assert.ok(lightBtnSecondary, 'Light .btn-secondary rule block must exist');
    assert.ok(lightBtnSecondary[1].includes('background: #FFFFFF'), 'Light .btn-secondary must use white background');
    assert.ok(lightBtnSecondary[1].includes('color: #1E293B'), 'Light .btn-secondary must use dark slate text');
    assert.ok(lightBtnSecondary[1].includes('border: 1px solid #CBD5E1'), 'Light .btn-secondary must use slate-300 border');
  });

  it('8. verifies brand text contrast protections in Light Mode (mint -> #0D7A5F, yellow -> #B45309, mint button navy text)', () => {
    assert.ok(css.includes('[data-theme="light"] .text-brand-mint'), 'Light theme must map .text-brand-mint to high-contrast forest emerald');
    assert.ok(css.includes('#0D7A5F'), 'Light theme mint mapping must use #0D7A5F');

    assert.ok(css.includes('[data-theme="light"] .text-brand-yellow'), 'Light theme must map .text-brand-yellow to high-contrast amber/gold');
    assert.ok(css.includes('#B45309'), 'Light theme yellow mapping must use #B45309');

    // Automatic dark text on mint buttons in Light Mode
    assert.ok(css.includes('[data-theme="light"] .bg-brand-mint.text-bg-base'), 'Light theme must ensure mint buttons use dark text');
    assert.ok(css.includes('color: #070B14 !important;'), 'Mint buttons in Light Mode must have color: #070B14 !important');
  });
});
