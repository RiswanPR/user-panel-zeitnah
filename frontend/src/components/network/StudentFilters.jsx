import { useState } from "react";
import { Filter, X, ArrowUpDown, ChevronDown, Check } from "lucide-react";

const SORT_OPTIONS = [
  { id: "recommended", label: "Recommended" },
  { id: "recent", label: "Recently Active" },
  { id: "name", label: "Name" },
];

/**
 * StudentFilters Component
 * Desktop compact toolbar + mobile bottom-sheet filter interface with active chips.
 *
 * @param {Object} props
 * @param {Object} props.filters - Active filters state { course, level, institution, interest, sort }
 * @param {function(Object): void} props.onFilterChange - Callback when filters change
 * @param {Object} [props.availableFilters] - Filter options { courses, interests, institutions, levels }
 */
export default function StudentFilters({
  filters,
  onFilterChange,
  availableFilters = { courses: [], interests: [], institutions: [], levels: [] },
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'course' | 'level' | 'sort' | null

  const { course = "", level = "", interest = "", institution = "", sort = "recommended" } = filters;

  const handleSelect = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: filters[key] === value ? "" : value,
    });
    setActiveDropdown(null);
  };

  const handleRemoveFilter = (key) => {
    onFilterChange({
      ...filters,
      [key]: "",
    });
  };

  const handleClearAll = () => {
    onFilterChange({
      ...filters,
      course: "",
      level: "",
      interest: "",
      institution: "",
      sort: "recommended",
    });
    setIsMobileOpen(false);
  };

  const activeFilterCount = [course, level, interest, institution].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* ── Desktop & Mobile Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mobile Filter Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="sm:hidden inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors focus-ring"
          >
            <Filter className="h-3.5 w-3.5 text-brand-mint" aria-hidden="true" />
            <span>Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}</span>
          </button>

          {/* Desktop Course Dropdown */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "course" ? null : "course")}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-ring ${
                course
                  ? "border-brand-mint/40 bg-brand-mint/10 text-white font-bold"
                  : "border-white/[0.08] bg-white/[0.03] text-text-secondary hover:border-white/[0.14] hover:text-white"
              }`}
            >
              <span>Course{course ? `: ${course}` : ""}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>

            {activeDropdown === "course" && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setActiveDropdown(null)}
                />
                <div className="absolute left-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-white/[0.1] bg-bg-surface/95 p-1.5 backdrop-blur-2xl shadow-xl space-y-0.5 max-h-60 overflow-y-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleSelect("course", "")}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                      !course ? "bg-brand-mint/15 text-brand-mint font-bold" : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span>All Courses</span>
                    {!course && <Check className="h-3.5 w-3.5" />}
                  </button>
                  {availableFilters.courses.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSelect("course", c)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                        course.toLowerCase() === c.toLowerCase()
                          ? "bg-brand-mint/15 text-brand-mint font-bold"
                          : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <span className="truncate">{c}</span>
                      {course.toLowerCase() === c.toLowerCase() && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop Level Dropdown */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "level" ? null : "level")}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-ring ${
                level
                  ? "border-brand-mint/40 bg-brand-mint/10 text-white font-bold"
                  : "border-white/[0.08] bg-white/[0.03] text-text-secondary hover:border-white/[0.14] hover:text-white"
              }`}
            >
              <span>Level{level ? `: ${level}` : ""}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>

            {activeDropdown === "level" && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setActiveDropdown(null)}
                />
                <div className="absolute left-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-white/[0.1] bg-bg-surface/95 p-1.5 backdrop-blur-2xl shadow-xl space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelect("level", "")}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                      !level ? "bg-brand-mint/15 text-brand-mint font-bold" : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span>All Levels</span>
                    {!level && <Check className="h-3.5 w-3.5" />}
                  </button>
                  {availableFilters.levels.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => handleSelect("level", l)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                        level.toLowerCase() === l.toLowerCase()
                          ? "bg-brand-mint/15 text-brand-mint font-bold"
                          : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <span>{l}</span>
                      {level.toLowerCase() === l.toLowerCase() && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop Interest Dropdown */}
          {availableFilters.interests && availableFilters.interests.length > 0 && (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "interest" ? null : "interest")}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-ring ${
                  interest
                    ? "border-brand-mint/40 bg-brand-mint/10 text-white font-bold"
                    : "border-white/[0.08] bg-white/[0.03] text-text-secondary hover:border-white/[0.14] hover:text-white"
                }`}
              >
                <span>Interest{interest ? `: ${interest}` : ""}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
              </button>

              {activeDropdown === "interest" && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setActiveDropdown(null)}
                  />
                  <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-white/[0.1] bg-bg-surface/95 p-1.5 backdrop-blur-2xl shadow-xl space-y-0.5 max-h-60 overflow-y-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => handleSelect("interest", "")}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                        !interest ? "bg-brand-mint/15 text-brand-mint font-bold" : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <span>All Interests</span>
                      {!interest && <Check className="h-3.5 w-3.5" />}
                    </button>
                    {availableFilters.interests.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleSelect("interest", item)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                          interest.toLowerCase() === item.toLowerCase()
                            ? "bg-brand-mint/15 text-brand-mint font-bold"
                            : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <span className="truncate">{item}</span>
                        {interest.toLowerCase() === item.toLowerCase() && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Desktop Institution Dropdown */}
          {availableFilters.institutions && availableFilters.institutions.length > 0 && (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "institution" ? null : "institution")}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-ring ${
                  institution
                    ? "border-brand-mint/40 bg-brand-mint/10 text-white font-bold"
                    : "border-white/[0.08] bg-white/[0.03] text-text-secondary hover:border-white/[0.14] hover:text-white"
                }`}
              >
                <span>Institution{institution ? `: ${institution}` : ""}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
              </button>

              {activeDropdown === "institution" && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setActiveDropdown(null)}
                  />
                  <div className="absolute left-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-white/[0.1] bg-bg-surface/95 p-1.5 backdrop-blur-2xl shadow-xl space-y-0.5 max-h-60 overflow-y-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => handleSelect("institution", "")}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                        !institution ? "bg-brand-mint/15 text-brand-mint font-bold" : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <span>All Institutions</span>
                      {!institution && <Check className="h-3.5 w-3.5" />}
                    </button>
                    {availableFilters.institutions.map((inst) => (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => handleSelect("institution", inst)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                          institution.toLowerCase() === inst.toLowerCase()
                            ? "bg-brand-mint/15 text-brand-mint font-bold"
                            : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <span className="truncate">{inst}</span>
                        {institution.toLowerCase() === inst.toLowerCase() && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Sort Selector */}
        <div className="relative flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-yellow/80" aria-hidden="true" />
            <span className="hidden sm:inline">Sort:</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white hover:border-white/[0.14] transition-colors focus-ring"
            >
              <span>
                {SORT_OPTIONS.find((s) => s.id === sort)?.label || "Recommended"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>

            {activeDropdown === "sort" && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setActiveDropdown(null)}
                />
                <div className="absolute right-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-white/[0.1] bg-bg-surface/95 p-1.5 backdrop-blur-2xl shadow-xl space-y-0.5">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelect("sort", opt.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                        sort === opt.id
                          ? "bg-brand-mint/15 text-brand-mint font-bold"
                          : "text-text-secondary hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sort === opt.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Active Filter Chips ── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Active filters">
          {course && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-mint/30 bg-brand-mint/10 px-2.5 py-1 text-xs font-medium text-brand-mint">
              <span>Course: {course}</span>
              <button
                type="button"
                onClick={() => handleRemoveFilter("course")}
                aria-label={`Remove course filter ${course}`}
                className="hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {level && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-mint/30 bg-brand-mint/10 px-2.5 py-1 text-xs font-medium text-brand-mint">
              <span>Level: {level}</span>
              <button
                type="button"
                onClick={() => handleRemoveFilter("level")}
                aria-label={`Remove level filter ${level}`}
                className="hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {interest && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-mint/30 bg-brand-mint/10 px-2.5 py-1 text-xs font-medium text-brand-mint">
              <span>Interest: {interest}</span>
              <button
                type="button"
                onClick={() => handleRemoveFilter("interest")}
                aria-label={`Remove interest filter ${interest}`}
                className="hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {institution && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-mint/30 bg-brand-mint/10 px-2.5 py-1 text-xs font-medium text-brand-mint">
              <span>Institution: {institution}</span>
              <button
                type="button"
                onClick={() => handleRemoveFilter("institution")}
                aria-label={`Remove institution filter ${institution}`}
                className="hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-text-muted hover:text-brand-yellow underline underline-offset-2 transition-colors ml-1 focus-ring rounded"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Mobile Filter Bottom Sheet Modal ── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/[0.1] bg-bg-surface p-6 pb-safe shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-mint" />
                <h3 className="text-base font-heading font-bold text-white">Filter Students</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close filters"
                className="rounded-full p-1 text-text-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Course Options */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-text-muted block">
                Course Track
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelect("course", "")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    !course
                      ? "bg-brand-mint text-bg-base font-bold"
                      : "border border-white/[0.08] bg-white/[0.03] text-text-secondary"
                  }`}
                >
                  All
                </button>
                {availableFilters.courses.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSelect("course", c)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      course.toLowerCase() === c.toLowerCase()
                        ? "bg-brand-mint text-bg-base font-bold"
                        : "border border-white/[0.08] bg-white/[0.03] text-text-secondary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Level Options */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-text-muted block">
                Learning Level
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelect("level", "")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    !level
                      ? "bg-brand-mint text-bg-base font-bold"
                      : "border border-white/[0.08] bg-white/[0.03] text-text-secondary"
                  }`}
                >
                  All
                </button>
                {availableFilters.levels.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleSelect("level", l)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      level.toLowerCase() === l.toLowerCase()
                        ? "bg-brand-mint text-bg-base font-bold"
                        : "border border-white/[0.08] bg-white/[0.03] text-text-secondary"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests Options (Mobile) */}
            {availableFilters.interests && availableFilters.interests.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-text-muted block">
                  Interests & Topics
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleSelect("interest", "")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      !interest
                        ? "bg-brand-mint text-bg-base font-bold"
                        : "border border-white/[0.08] bg-white/[0.03] text-text-secondary"
                    }`}
                  >
                    All
                  </button>
                  {availableFilters.interests.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSelect("interest", item)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                        interest.toLowerCase() === item.toLowerCase()
                          ? "bg-brand-mint text-bg-base font-bold"
                          : "border border-white/[0.08] bg-white/[0.03] text-text-secondary"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Institutions Options (Mobile) */}
            {availableFilters.institutions && availableFilters.institutions.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-text-muted block">
                  Institutions
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleSelect("institution", "")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      !institution
                        ? "bg-brand-mint text-bg-base font-bold"
                        : "border border-white/[0.08] bg-white/[0.03] text-text-secondary"
                    }`}
                  >
                    All
                  </button>
                  {availableFilters.institutions.map((inst) => (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => handleSelect("institution", inst)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                        institution.toLowerCase() === inst.toLowerCase()
                          ? "bg-brand-mint text-bg-base font-bold"
                          : "border border-white/[0.08] bg-white/[0.03] text-text-secondary"
                      }`}
                    >
                      {inst}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-xs font-semibold text-text-muted hover:text-white"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-brand-yellow text-bg-base text-xs font-bold shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
