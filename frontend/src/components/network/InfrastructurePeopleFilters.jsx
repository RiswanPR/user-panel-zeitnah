import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Filter,
  X,
  ChevronDown,
  RotateCcw,
  Briefcase,
  Layers,
  Wrench,
  Clock,
  MapPin,
  Sparkles,
  Check,
} from "lucide-react";
import {
  INFRASTRUCTURE_DISCIPLINES,
  INFRASTRUCTURE_SECTORS,
  INFRASTRUCTURE_SOFTWARE,
  PROFILE_ROLES,
  DISCIPLINE_SPECIALIZATIONS,
} from "../../constants/infrastructureTaxonomy";

const EXPERIENCE_OPTIONS = [
  "0–1 years",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
];

/**
 * InfrastructurePeopleFilters Component
 * World-class filter controls for civil & infrastructure engineers.
 *
 * Requirements Met:
 * - Solves prop mismatch: Supports BOTH `onChange` AND `onFilterChange`.
 * - Solves `onReset` prop integration.
 * - ARIA accessibility: `aria-haspopup`, `aria-expanded`, `aria-controls`.
 * - Outside click listener using ref (no blocking invisible full-screen div).
 * - Mobile bottom-sheet drawer with spring motion.
 */
export default function InfrastructurePeopleFilters({
  filters = {},
  onFilterChange,
  onChange,
  onReset,
  availableFilters,
}) {
  const shouldReduceMotion = useReducedMotion();
  const [activeDropdown, setActiveDropdown] = useState(null); // 'discipline' | 'specialization' | 'sector' | 'software' | 'experience'
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const containerRef = useRef(null);

  const {
    role = "all",
    discipline = "",
    specialization = "",
    sector = "",
    software = "",
    experience = "",
    location = "",
  } = filters;

  // Ref-based outside-click detection so adjacent dropdowns open directly on 1-click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Safe updater calling both prop signatures to prevent runtime errors
  const handleUpdate = (key, value) => {
    const nextFilters = {
      ...filters,
      [key]: filters[key] === value ? "" : value,
    };
    // If discipline was reset, clear specialization
    if (key === "discipline" && filters[key] !== value) {
      nextFilters.specialization = "";
    }
    onFilterChange?.(nextFilters);
    onChange?.(nextFilters);
    setActiveDropdown(null);
  };

  const handleClearAll = () => {
    const cleared = {
      role: "all",
      discipline: "",
      specialization: "",
      sector: "",
      software: "",
      skill: "",
      experience: "",
      location: "",
      institution: "",
      company: "",
      q: "",
    };
    if (onReset) {
      onReset();
    } else {
      onFilterChange?.(cleared);
      onChange?.(cleared);
    }
    setIsMobileDrawerOpen(false);
    setActiveDropdown(null);
  };

  const activeCount = [
    role !== "all" && role,
    discipline,
    specialization,
    sector,
    software,
    experience,
    location,
  ].filter(Boolean).length;

  const currentSpecializations =
    discipline && DISCIPLINE_SPECIALIZATIONS[discipline]
      ? DISCIPLINE_SPECIALIZATIONS[discipline]
      : [];

  return (
    <div ref={containerRef} className="space-y-3 relative">
      {/* ── Filter Bar Header: Role Selector + Secondary Dropdowns ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Role Pills (Primary Persona) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#0A0F14] border border-white/[0.08] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleUpdate("role", "all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              role === "all"
                ? "bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15"
                : "text-text-muted hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            All Ecosystem
          </button>
          {PROFILE_ROLES.map((r) => {
            const isSelected = role.toLowerCase() === r.value.toLowerCase();
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => handleUpdate("role", r.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15"
                    : "text-text-muted hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Mobile Filter Button */}
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open filter drawer"
          className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white hover:border-brand-mint/30 transition-all cursor-pointer shrink-0"
        >
          <Filter className="w-3.5 h-3.5 text-brand-mint" aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-brand-mint text-black text-[9px] font-bold font-mono flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {/* Clear All Action (Desktop) */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="hidden lg:inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3 h-3 text-text-muted" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* ── Desktop Filter Dropdown Strip ── */}
      <div className="hidden lg:flex flex-wrap items-center gap-2">
        {/* 1. Discipline Dropdown */}
        <div className="relative">
          <button
            type="button"
            id="discipline-filter-btn"
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === "discipline"}
            aria-controls="discipline-filter-menu"
            onClick={() =>
              setActiveDropdown(activeDropdown === "discipline" ? null : "discipline")
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              discipline
                ? "border-brand-mint/50 bg-brand-mint/10 text-white font-bold"
                : "border-white/[0.08] bg-[#0A0F14] text-text-muted hover:text-white hover:border-white/[0.14]"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-brand-mint/80 shrink-0" />
            <span className="truncate max-w-[140px]">{discipline || "Discipline"}</span>
            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${activeDropdown === "discipline" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "discipline" && (
            <div
              id="discipline-filter-menu"
              role="listbox"
              aria-labelledby="discipline-filter-btn"
              className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-white/[0.1] bg-[#0C121D] p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-72 overflow-y-auto no-scrollbar"
            >
              <button
                type="button"
                onClick={() => handleUpdate("discipline", "")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                All Disciplines
              </button>
              {INFRASTRUCTURE_DISCIPLINES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleUpdate("discipline", d)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    discipline === d
                      ? "bg-brand-mint/15 text-brand-mint font-bold"
                      : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span>{d}</span>
                  {discipline === d && <Check className="w-3.5 h-3.5 text-brand-mint" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Specialization (if discipline selected) */}
        {currentSpecializations.length > 0 && (
          <div className="relative">
            <button
              type="button"
              id="spec-filter-btn"
              aria-haspopup="listbox"
              aria-expanded={activeDropdown === "specialization"}
              aria-controls="spec-filter-menu"
              onClick={() =>
                setActiveDropdown(activeDropdown === "specialization" ? null : "specialization")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                specialization
                  ? "border-brand-mint/50 bg-brand-mint/10 text-white font-bold"
                  : "border-white/[0.08] bg-[#0A0F14] text-text-muted hover:text-white hover:border-white/[0.14]"
              }`}
            >
              <span className="truncate max-w-[140px]">{specialization || "Specialization"}</span>
              <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${activeDropdown === "specialization" ? "rotate-180" : ""}`} />
            </button>

            {activeDropdown === "specialization" && (
              <div
                id="spec-filter-menu"
                role="listbox"
                aria-labelledby="spec-filter-btn"
                className="absolute left-0 top-full mt-1.5 w-60 rounded-2xl border border-white/[0.1] bg-[#0C121D] p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar"
              >
                <button
                  type="button"
                  onClick={() => handleUpdate("specialization", "")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
                >
                  All Specializations
                </button>
                {currentSpecializations.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleUpdate("specialization", s)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      specialization === s
                        ? "bg-brand-mint/15 text-brand-mint font-bold"
                        : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span>{s}</span>
                    {specialization === s && <Check className="w-3.5 h-3.5 text-brand-mint" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Infrastructure Sector Dropdown */}
        <div className="relative">
          <button
            type="button"
            id="sector-filter-btn"
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === "sector"}
            aria-controls="sector-filter-menu"
            onClick={() =>
              setActiveDropdown(activeDropdown === "sector" ? null : "sector")
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              sector
                ? "border-brand-mint/50 bg-brand-mint/10 text-white font-bold"
                : "border-white/[0.08] bg-[#0A0F14] text-text-muted hover:text-white hover:border-white/[0.14]"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-brand-mint/80 shrink-0" />
            <span className="truncate max-w-[140px]">{sector || "Sector"}</span>
            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${activeDropdown === "sector" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "sector" && (
            <div
              id="sector-filter-menu"
              role="listbox"
              aria-labelledby="sector-filter-btn"
              className="absolute left-0 top-full mt-1.5 w-60 rounded-2xl border border-white/[0.1] bg-[#0C121D] p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar"
            >
              <button
                type="button"
                onClick={() => handleUpdate("sector", "")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
              >
                All Sectors
              </button>
              {INFRASTRUCTURE_SECTORS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleUpdate("sector", sec)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    sector === sec
                      ? "bg-brand-mint/15 text-brand-mint font-bold"
                      : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span>{sec}</span>
                  {sector === sec && <Check className="w-3.5 h-3.5 text-brand-mint" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Software Dropdown */}
        <div className="relative">
          <button
            type="button"
            id="software-filter-btn"
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === "software"}
            aria-controls="software-filter-menu"
            onClick={() =>
              setActiveDropdown(activeDropdown === "software" ? null : "software")
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              software
                ? "border-brand-mint/50 bg-brand-mint/10 text-white font-bold"
                : "border-white/[0.08] bg-[#0A0F14] text-text-muted hover:text-white hover:border-white/[0.14]"
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-brand-mint/80 shrink-0" />
            <span className="truncate max-w-[140px]">{software || "Software"}</span>
            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${activeDropdown === "software" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "software" && (
            <div
              id="software-filter-menu"
              role="listbox"
              aria-labelledby="software-filter-btn"
              className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl border border-white/[0.1] bg-[#0C121D] p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar"
            >
              <button
                type="button"
                onClick={() => handleUpdate("software", "")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
              >
                All Software
              </button>
              {INFRASTRUCTURE_SOFTWARE.map((sw) => (
                <button
                  key={sw}
                  type="button"
                  onClick={() => handleUpdate("software", sw)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    software === sw
                      ? "bg-brand-mint/15 text-brand-mint font-bold"
                      : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span>{sw}</span>
                  {software === sw && <Check className="w-3.5 h-3.5 text-brand-mint" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Experience Dropdown */}
        <div className="relative">
          <button
            type="button"
            id="exp-filter-btn"
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === "experience"}
            aria-controls="exp-filter-menu"
            onClick={() =>
              setActiveDropdown(activeDropdown === "experience" ? null : "experience")
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              experience
                ? "border-brand-mint/50 bg-brand-mint/10 text-white font-bold"
                : "border-white/[0.08] bg-[#0A0F14] text-text-muted hover:text-white hover:border-white/[0.14]"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-brand-mint/80 shrink-0" />
            <span>{experience || "Experience"}</span>
            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${activeDropdown === "experience" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "experience" && (
            <div
              id="exp-filter-menu"
              role="listbox"
              aria-labelledby="exp-filter-btn"
              className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl border border-white/[0.1] bg-[#0C121D] p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar"
            >
              <button
                type="button"
                onClick={() => handleUpdate("experience", "")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
              >
                Any Experience
              </button>
              {EXPERIENCE_OPTIONS.map((exp) => (
                <button
                  key={exp}
                  type="button"
                  onClick={() => handleUpdate("experience", exp)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    experience === exp
                      ? "bg-brand-mint/15 text-brand-mint font-bold"
                      : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span>{exp}</span>
                  {experience === exp && <Check className="w-3.5 h-3.5 text-brand-mint" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Active Filter Badges Ribbon ── */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-text-muted mr-1">Active filters:</span>
          {discipline && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-brand-mint/10 text-brand-mint border border-brand-mint/20">
              <span>{discipline}</span>
              <button type="button" onClick={() => handleUpdate("discipline", "")} aria-label="Remove discipline filter">
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}
          {specialization && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-brand-mint/10 text-brand-mint border border-brand-mint/20">
              <span>{specialization}</span>
              <button type="button" onClick={() => handleUpdate("specialization", "")} aria-label="Remove specialization filter">
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}
          {sector && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{sector}</span>
              <button type="button" onClick={() => handleUpdate("sector", "")} aria-label="Remove sector filter">
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}
          {software && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{software}</span>
              <button type="button" onClick={() => handleUpdate("software", "")} aria-label="Remove software filter">
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}
          {experience && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{experience}</span>
              <button type="button" onClick={() => handleUpdate("experience", "")} aria-label="Remove experience filter">
                <X className="w-3 h-3 hover:text-white" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Mobile Filter Bottom Sheet / Modal ── */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            <motion.div
              initial={shouldReduceMotion ? false : { y: "100%" }}
              animate={{ y: 0 }}
              exit={shouldReduceMotion ? false : { y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="w-full sm:max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-white/[0.1] bg-[#0A0F14] p-6 shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand-mint" />
                  <h3 id="mobile-filter-title" className="font-heading font-bold text-white text-base">
                    Filter Professionals
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-text-muted hover:text-white cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                {/* Discipline */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                    Discipline
                  </label>
                  <select
                    value={discipline}
                    onChange={(e) => handleUpdate("discipline", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40"
                  >
                    <option value="" className="bg-[#121B2B]">All Disciplines</option>
                    {INFRASTRUCTURE_DISCIPLINES.map((d) => (
                      <option key={d} value={d} className="bg-[#121B2B]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sector */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                    Infrastructure Sector
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => handleUpdate("sector", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40"
                  >
                    <option value="" className="bg-[#121B2B]">All Sectors</option>
                    {INFRASTRUCTURE_SECTORS.map((s) => (
                      <option key={s} value={s} className="bg-[#121B2B]">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Software */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                    Software
                  </label>
                  <select
                    value={software}
                    onChange={(e) => handleUpdate("software", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40"
                  >
                    <option value="" className="bg-[#121B2B]">All Software</option>
                    {INFRASTRUCTURE_SOFTWARE.map((sw) => (
                      <option key={sw} value={sw} className="bg-[#121B2B]">
                        {sw}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
                    Experience Level
                  </label>
                  <select
                    value={experience}
                    onChange={(e) => handleUpdate("experience", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40"
                  >
                    <option value="" className="bg-[#121B2B]">Any Experience</option>
                    {EXPERIENCE_OPTIONS.map((exp) => (
                      <option key={exp} value={exp} className="bg-[#121B2B]">
                        {exp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-text-muted hover:text-white cursor-pointer"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-mint text-black cursor-pointer shadow-md shadow-brand-mint/20"
                >
                  Apply Filters ({activeCount})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
