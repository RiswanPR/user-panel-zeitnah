import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";

/**
 * NetworkSearch Component
 * Unified, world-class search input for the Zeitnah Network.
 * Standardizes height, icon alignment, keyboard shortcuts, debouncing, and loading indicators.
 *
 * @param {Object} props
 * @param {string} [props.value=''] - Search value
 * @param {function(string): void} props.onChange - Debounced or direct callback with new search string
 * @param {number} [props.debounceMs=250] - Delay in ms before notifying onChange
 * @param {string} [props.placeholder='Search people, skills, organizations...'] - Input placeholder
 * @param {boolean} [props.isLoading=false] - Whether search is in a loading state
 * @param {string} [props.className=''] - Extra classes for outer container
 * @param {boolean} [props.autoFocus=false]
 * @param {string} [props.size='default'] - 'default' (h-12) or 'sm' (h-10)
 */
export default function NetworkSearch({
  value = "",
  onChange,
  debounceMs = 250,
  placeholder = "Search people, skills, organizations...",
  isLoading = false,
  className = "",
  autoFocus = false,
  size = "default",
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const isMac =
    typeof window !== "undefined" &&
    navigator?.platform?.toUpperCase().indexOf("MAC") >= 0;

  // Keep internal state aligned if parent updates value directly
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Global ⌘K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce notification
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange?.(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setLocalValue("");
    onChange?.("");
    inputRef.current?.focus();
  };

  const heightClass = size === "sm" ? "min-h-[40px] h-10" : "min-h-[46px] h-11 sm:h-12";

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className={`relative flex items-center ${heightClass} rounded-2xl border transition-all duration-200 ${
          isFocused
            ? "border-brand-mint/50 bg-[#0A0F14] shadow-[0_0_24px_rgba(159,213,178,0.12)] ring-1 ring-brand-mint/25"
            : "border-white/[0.08] bg-[#070B14]/80 hover:border-white/[0.14] hover:bg-[#0A0F14]"
        } backdrop-blur-xl`}
      >
        {/* Leading Search Icon */}
        <div className="pointer-events-none pl-3.5 sm:pl-4 pr-2 text-text-muted transition-colors shrink-0">
          <Search
            className={`h-4 w-4 transition-colors duration-200 ${
              isFocused ? "text-brand-mint" : "text-text-muted"
            }`}
            aria-hidden="true"
          />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          autoFocus={autoFocus}
          aria-label={placeholder}
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full bg-transparent py-2.5 pr-14 text-xs sm:text-sm text-white placeholder:text-text-muted/60 focus:outline-none"
        />

        {/* Right Action: Loading Spinner or ⌘K Hint or Clear Button */}
        <div className="absolute right-3 sm:right-3.5 flex items-center gap-1.5 shrink-0">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand-mint" aria-label="Loading..." />
          ) : localValue ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-text-muted hover:bg-white/[0.15] hover:text-white transition-all cursor-pointer focus-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <div
              className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-muted select-none pointer-events-none"
              aria-hidden="true"
            >
              <span>{isMac ? "⌘" : "Ctrl"}</span>
              <span>K</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
