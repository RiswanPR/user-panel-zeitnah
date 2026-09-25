import { useState } from 'react';
import {
  Filter,
  X,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Briefcase,
  Layers,
  Wrench,
  Clock,
  MapPin,
} from 'lucide-react';
import {
  INFRASTRUCTURE_DISCIPLINES,
  INFRASTRUCTURE_SECTORS,
  INFRASTRUCTURE_SOFTWARE,
  PROFILE_ROLES,
  DISCIPLINE_SPECIALIZATIONS,
} from '../../constants/infrastructureTaxonomy';

const EXPERIENCE_OPTIONS = [
  '0–1 years',
  '1–3 years',
  '3–5 years',
  '5–10 years',
  '10+ years',
];

export default function InfrastructurePeopleFilters({
  filters = {},
  onFilterChange,
  availableFilters,
}) {
  const [activeDropdown, setActiveDropdown] = useState(null); // 'discipline' | 'sector' | 'software' | 'experience' | null
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const {
    role = 'all',
    discipline = '',
    specialization = '',
    sector = '',
    software = '',
    experience = '',
    location = '',
  } = filters;

  const handleUpdate = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: filters[key] === value ? '' : value,
    });
    setActiveDropdown(null);
  };

  const handleClearAll = () => {
    onFilterChange({
      role: 'all',
      discipline: '',
      specialization: '',
      sector: '',
      software: '',
      experience: '',
      location: '',
      q: '',
    });
    setIsMobileDrawerOpen(false);
  };

  const activeCount = [
    role !== 'all' && role,
    discipline,
    specialization,
    sector,
    software,
    experience,
    location,
  ].filter(Boolean).length;

  const currentSpecializations = discipline && DISCIPLINE_SPECIALIZATIONS[discipline]
    ? DISCIPLINE_SPECIALIZATIONS[discipline]
    : [];

  return (
    <div className="space-y-4">
      {/* ── Top Role Filter Pills ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.02] border border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => handleUpdate('role', 'all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              role === 'all'
                ? 'bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15'
                : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            All Roles
          </button>
          {PROFILE_ROLES.map((r) => {
            const isSelected = role.toLowerCase() === r.value.toLowerCase();
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => handleUpdate('role', r.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-brand-mint text-black font-bold shadow-md shadow-brand-mint/15'
                    : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
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
          className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white cursor-pointer shrink-0"
        >
          <Filter className="w-3.5 h-3.5 text-brand-mint" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-brand-mint text-black text-[9px] font-bold font-mono flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Desktop Filter Bar ── */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {/* Discipline Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setActiveDropdown(activeDropdown === 'discipline' ? null : 'discipline')
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              discipline
                ? 'border-brand-mint/40 bg-brand-mint/10 text-white font-bold'
                : 'border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:border-white/[0.14]'
            }`}
          >
            <Briefcase className="w-3 h-3 text-brand-mint/80" />
            <span>{discipline || 'Discipline'}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {activeDropdown === 'discipline' && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setActiveDropdown(null)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-60 rounded-2xl border border-white/[0.1] bg-[#101827]/98 p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleUpdate('discipline', '')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
                >
                  All Disciplines
                </button>
                {INFRASTRUCTURE_DISCIPLINES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleUpdate('discipline', d)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      discipline === d
                        ? 'bg-brand-mint/15 text-brand-mint font-bold'
                        : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Specialization (if discipline selected) */}
        {currentSpecializations.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(
                  activeDropdown === 'specialization' ? null : 'specialization',
                )
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                specialization
                  ? 'border-brand-mint/40 bg-brand-mint/10 text-white font-bold'
                  : 'border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:border-white/[0.14]'
              }`}
            >
              <span>{specialization || 'Specialization'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {activeDropdown === 'specialization' && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setActiveDropdown(null)}
                />
                <div className="absolute left-0 top-full mt-1.5 w-60 rounded-2xl border border-white/[0.1] bg-[#101827]/98 p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleUpdate('specialization', '')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
                  >
                    All Specializations
                  </button>
                  {currentSpecializations.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleUpdate('specialization', s)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        specialization === s
                          ? 'bg-brand-mint/15 text-brand-mint font-bold'
                          : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Infrastructure Sector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setActiveDropdown(activeDropdown === 'sector' ? null : 'sector')
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              sector
                ? 'border-brand-mint/40 bg-brand-mint/10 text-white font-bold'
                : 'border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:border-white/[0.14]'
            }`}
          >
            <Layers className="w-3 h-3 text-brand-mint/80" />
            <span>{sector || 'Sector'}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {activeDropdown === 'sector' && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setActiveDropdown(null)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl border border-white/[0.1] bg-[#101827]/98 p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleUpdate('sector', '')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
                >
                  All Sectors
                </button>
                {INFRASTRUCTURE_SECTORS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleUpdate('sector', sec)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      sector === sec
                        ? 'bg-brand-mint/15 text-brand-mint font-bold'
                        : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Software Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setActiveDropdown(activeDropdown === 'software' ? null : 'software')
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              software
                ? 'border-brand-mint/40 bg-brand-mint/10 text-white font-bold'
                : 'border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:border-white/[0.14]'
            }`}
          >
            <Wrench className="w-3 h-3 text-brand-mint/80" />
            <span>{software || 'Software'}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {activeDropdown === 'software' && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setActiveDropdown(null)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl border border-white/[0.1] bg-[#101827]/98 p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleUpdate('software', '')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
                >
                  All Software
                </button>
                {INFRASTRUCTURE_SOFTWARE.map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() => handleUpdate('software', sw)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      software === sw
                        ? 'bg-brand-mint/15 text-brand-mint font-bold'
                        : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {sw}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Experience Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setActiveDropdown(
                activeDropdown === 'experience' ? null : 'experience',
              )
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              experience
                ? 'border-brand-mint/40 bg-brand-mint/10 text-white font-bold'
                : 'border-white/[0.08] bg-white/[0.02] text-text-muted hover:text-white hover:border-white/[0.14]'
            }`}
          >
            <Clock className="w-3 h-3 text-brand-mint/80" />
            <span>{experience || 'Experience'}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {activeDropdown === 'experience' && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setActiveDropdown(null)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl border border-white/[0.1] bg-[#101827]/98 p-1.5 shadow-2xl backdrop-blur-2xl z-40 max-h-64 overflow-y-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => handleUpdate('experience', '')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-white/[0.06] hover:text-white"
                >
                  Any Experience
                </button>
                {EXPERIENCE_OPTIONS.map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => handleUpdate('experience', exp)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      experience === exp
                        ? 'bg-brand-mint/15 text-brand-mint font-bold'
                        : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Clear All Button */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-white transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ── Active Filter Badges ── */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-text-faint mr-1">Active:</span>
          {role !== 'all' && role && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-brand-mint/10 text-brand-mint border border-brand-mint/20">
              <span>Role: {role}</span>
              <button
                type="button"
                onClick={() => handleUpdate('role', 'all')}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {discipline && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{discipline}</span>
              <button
                type="button"
                onClick={() => handleUpdate('discipline', '')}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {specialization && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{specialization}</span>
              <button
                type="button"
                onClick={() => handleUpdate('specialization', '')}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {sector && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{sector}</span>
              <button
                type="button"
                onClick={() => handleUpdate('sector', '')}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {software && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{software}</span>
              <button
                type="button"
                onClick={() => handleUpdate('software', '')}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {experience && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{experience}</span>
              <button
                type="button"
                onClick={() => handleUpdate('experience', '')}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-white/[0.06] text-white border border-white/[0.1]">
              <span>{location}</span>
              <button
                type="button"
                onClick={() => handleUpdate('location', '')}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Mobile Filter Bottom Sheet / Modal ── */}
      {isMobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="w-full sm:max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-white/[0.1] bg-[#0E1524] p-6 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-mint" />
                <h3 className="font-heading font-bold text-white text-base">
                  Filter Professionals
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white"
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
                  onChange={(e) => handleUpdate('discipline', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40"
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
                  onChange={(e) => handleUpdate('sector', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40"
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
                  onChange={(e) => handleUpdate('software', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40"
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
                  Experience
                </label>
                <select
                  value={experience}
                  onChange={(e) => handleUpdate('experience', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-brand-mint/40"
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
                className="text-xs font-semibold text-text-muted hover:text-white"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-mint text-black"
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
