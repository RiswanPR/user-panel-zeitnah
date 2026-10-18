import React, { useRef, useState } from 'react';
import { Sun, Moon, Monitor, CheckCircle2, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { THEME_PREFERENCES, THEME_OPTIONS } from '../../utils/themeEngine';

export { THEME_OPTIONS };

const OPTION_ICONS = {
  [THEME_PREFERENCES.SYSTEM]: Monitor,
  [THEME_PREFERENCES.LIGHT]: Sun,
  [THEME_PREFERENCES.DARK]: Moon,
};

/**
 * Zeitnah World-Class Theme Selector.
 * Provides accessible, immediate, and responsive System / Light / Dark theme controls.
 *
 * Requirements Met:
 * - 3 choices: System (default), Light, Dark.
 * - Live update across the entire app without page reload.
 * - Accessible radiogroup with keyboard navigation (Arrows / Space / Enter).
 * - Persists preference only (not resolved theme) via Phase 2 engine.
 * - Graceful degradation on storage failure with non-intrusive feedback.
 */
export default function ThemeSelector({ className = '', showHeader = true }) {
  const { preference, effectiveTheme, setPreference } = useTheme();
  const [persistenceWarning, setPersistenceWarning] = useState(false);
  const optionsRef = useRef([]);

  const handleSelect = (optionValue) => {
    const success = setPreference(optionValue);
    if (success === false) {
      setPersistenceWarning(true);
    } else {
      setPersistenceWarning(false);
    }
  };

  const handleKeyDown = (e, index) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % THEME_OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = THEME_OPTIONS.length - 1;
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleSelect(THEME_OPTIONS[index].value);
      return;
    } else {
      return;
    }

    const nextOption = THEME_OPTIONS[nextIndex];
    if (nextOption) {
      handleSelect(nextOption.value);
      optionsRef.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      className={`relative rounded-3xl border border-border bg-surface-card p-6 sm:p-8 space-y-6 shadow-xl transition-all ${className}`}
    >
      {/* Subtle top ambient mint gradient line */}
      <div
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-mint/35 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Header section */}
      {showHeader && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint/10 border border-brand-mint/20 text-brand-mint text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Interface Theme
            </div>
            <span className="text-[11px] font-mono text-text-muted">
              Current: <strong className="text-text-primary capitalize">{effectiveTheme}</strong>
              {preference === THEME_PREFERENCES.SYSTEM && ' (Auto)'}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-heading font-black text-text-primary tracking-tight">
            Theme Preference
          </h3>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-2xl">
            Choose your preferred color theme or synchronize automatically with your device settings.
            Your choice is applied immediately across all panels.
          </p>
        </div>
      )}

      {/* Persistence failure advisory (if storage is unavailable/quota exceeded) */}
      {persistenceWarning && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2.5"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
          <span>Theme applied to this session. Browser storage is unavailable or restricted.</span>
        </div>
      )}

      {/* Interactive 3-way Option Radiogroup */}
      <div
        role="radiogroup"
        aria-label="Theme preference"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4"
      >
        {THEME_OPTIONS.map((opt, index) => {
          const isSelected = preference === opt.value;
          const Icon = OPTION_ICONS[opt.value] || Monitor;

          return (
            <button
              key={opt.id}
              ref={(el) => (optionsRef.current[index] = el)}
              type="button"
              role="radio"
              aria-label={opt.label}
              data-theme-option={opt.value}
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleSelect(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`group relative text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[148px] focus-ring select-none ${
                isSelected
                  ? 'border-brand-mint/60 bg-gradient-to-b from-brand-mint/[0.12] via-brand-mint/[0.04] to-transparent shadow-[0_0_24px_rgba(159,213,178,0.12)]'
                  : 'border-border bg-surface-elevated/40 hover:bg-surface-elevated hover:border-border-accent'
              }`}
            >
              {/* Top Row: Icon + Badge + Selection Indicator */}
              <div className="flex items-start justify-between w-full mb-3">
                <div
                  className={`p-2.5 rounded-xl transition-colors ${
                    isSelected
                      ? 'bg-brand-mint/20 text-brand-mint shadow-inner'
                      : 'bg-surface-elevated text-text-faint group-hover:text-text-secondary'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wider font-semibold transition-colors ${
                      isSelected
                        ? 'bg-brand-mint/20 text-brand-mint border border-brand-mint/30'
                        : 'bg-surface-elevated text-text-muted border border-border'
                    }`}
                  >
                    {opt.badge}
                  </span>

                  {/* Radio checkmark circle */}
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-brand-mint bg-brand-mint text-bg-base'
                        : 'border-border bg-transparent group-hover:border-border-accent'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#070B14] fill-current" />
                    )}
                  </div>
                </div>
              </div>

              {/* Title and System Active indicator */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4
                    className={`text-base font-bold transition-colors ${
                      isSelected ? 'text-text-primary font-extrabold' : 'text-text-secondary group-hover:text-text-primary'
                    }`}
                  >
                    {opt.label}
                  </h4>

                  {opt.value === THEME_PREFERENCES.SYSTEM && isSelected && (
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-surface-elevated text-brand-yellow font-semibold">
                      {effectiveTheme === 'dark' ? 'Active: Dark' : 'Active: Light'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-muted leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
