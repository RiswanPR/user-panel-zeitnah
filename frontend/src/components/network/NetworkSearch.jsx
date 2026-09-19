import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

/**
 * NetworkSearch Component
 * Large premium search input with focus animation, debounced callbacks, and clear button.
 *
 * @param {Object} props
 * @param {string} [props.value=''] - Controlled search query
 * @param {function(string): void} props.onChange - Debounced callback providing current search query
 * @param {number} [props.debounceMs=250] - Debounce delay in milliseconds
 * @param {string} [props.placeholder='Search students, usernames, interests...'] - Input placeholder
 * @param {string} [props.className=''] - Additional container classes
 */
export default function NetworkSearch({
  value = "",
  onChange,
  debounceMs = 250,
  placeholder = "Search students, usernames, interests...",
  className = "",
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Synchronize internal state when outer value changes externally (React recommended pattern)
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
  }

  // Debounce propagation to onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange?.(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange]);

  const handleClear = () => {
    setLocalValue("");
    onChange?.("");
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
          isFocused
            ? "border-brand-mint/40 bg-bg-surface/90 shadow-[0_0_24px_rgba(159,213,178,0.12)] ring-1 ring-brand-mint/20"
            : "border-white/[0.08] bg-bg-surface/50 hover:border-white/[0.14] hover:bg-bg-surface/70"
        } backdrop-blur-xl`}
      >
        {/* Leading Search Icon */}
        <div className="pointer-events-none pl-4 pr-2 text-text-muted transition-colors">
          <Search
            className={`h-5 w-5 transition-colors duration-200 ${
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
          aria-label={placeholder}
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full bg-transparent py-3.5 pr-10 text-sm sm:text-base text-white placeholder:text-text-muted/60 focus:outline-none"
        />

        {/* Clear Button */}
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search query"
            className="absolute right-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-text-muted hover:bg-white/[0.15] hover:text-white transition-all focus-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
