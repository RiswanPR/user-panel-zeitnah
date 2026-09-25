import { useState } from "react";
import { Plus, X, Building, Layers, MapPin, Calendar, Check, Sparkles } from "lucide-react";
import {
  INFRASTRUCTURE_DISCIPLINES,
  INFRASTRUCTURE_SECTORS,
  DISCIPLINE_SPECIALIZATIONS,
} from "../../constants/infrastructureTaxonomy";

export default function InfrastructureExpertiseSection({
  primaryDiscipline = "",
  setPrimaryDiscipline,
  specializations = [],
  setSpecializations,
  infrastructureSectors = [],
  setInfrastructureSectors,
  yearsOfExperience = 0,
  setYearsOfExperience,
  preferredLocations = [],
  setPreferredLocations,
  onChangeDirty,
}) {
  const [newSpecInput, setNewSpecInput] = useState("");
  const [newLocInput, setNewLocInput] = useState("");

  const suggestedSpecs =
    (primaryDiscipline && DISCIPLINE_SPECIALIZATIONS[primaryDiscipline]) || [];

  const handleAddSpec = (spec) => {
    const val = (spec || newSpecInput).trim();
    if (!val) return;
    if (specializations.some((s) => s.toLowerCase() === val.toLowerCase())) return;
    setSpecializations([...specializations, val]);
    setNewSpecInput("");
    if (onChangeDirty) onChangeDirty();
  };

  const handleRemoveSpec = (specToRemove) => {
    setSpecializations(specializations.filter((s) => s !== specToRemove));
    if (onChangeDirty) onChangeDirty();
  };

  const handleToggleSector = (sector) => {
    if (infrastructureSectors.includes(sector)) {
      setInfrastructureSectors(infrastructureSectors.filter((s) => s !== sector));
    } else {
      setInfrastructureSectors([...infrastructureSectors, sector]);
    }
    if (onChangeDirty) onChangeDirty();
  };

  const handleAddLocation = (loc) => {
    const val = (loc || newLocInput).trim();
    if (!val) return;
    if (preferredLocations.some((l) => l.toLowerCase() === val.toLowerCase())) return;
    setPreferredLocations([...preferredLocations, val]);
    setNewLocInput("");
    if (onChangeDirty) onChangeDirty();
  };

  const handleRemoveLocation = (locToRemove) => {
    setPreferredLocations(preferredLocations.filter((l) => l !== locToRemove));
    if (onChangeDirty) onChangeDirty();
  };

  return (
    <div className="space-y-6">
      {/* ── Primary Discipline & Years of Experience ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Primary Discipline <span className="text-brand-mint">*</span>
          </label>
          <select
            value={primaryDiscipline}
            onChange={(e) => {
              setPrimaryDiscipline(e.target.value);
              if (onChangeDirty) onChangeDirty();
            }}
            className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors cursor-pointer"
          >
            <option value="">Select your infrastructure discipline...</option>
            {INFRASTRUCTURE_DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-text-muted mt-1 block">
            Your primary domain within civil, structural, and infrastructure engineering.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Years of Experience
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="60"
              step="1"
              value={yearsOfExperience || ""}
              onChange={(e) => {
                setYearsOfExperience(Number(e.target.value));
                if (onChangeDirty) onChangeDirty();
              }}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
            />
            <span className="absolute right-4 top-3.5 text-xs text-text-faint pointer-events-none">
              Years
            </span>
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">
            0 for students / graduates.
          </span>
        </div>
      </div>

      {/* ── Infrastructure Sectors ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Infrastructure Sectors
          </label>
          <span className="text-[11px] text-text-muted font-mono">
            {infrastructureSectors.length} selected
          </span>
        </div>
        <p className="text-xs text-text-muted">
          Select the sectors you specialize in or aspire to work on.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {INFRASTRUCTURE_SECTORS.map((sector) => {
            const isSelected = infrastructureSectors.includes(sector);
            return (
              <button
                key={sector}
                type="button"
                onClick={() => handleToggleSector(sector)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  isSelected
                    ? "bg-brand-mint/15 border border-brand-mint text-brand-mint shadow-[0_0_12px_rgba(159,213,178,0.15)]"
                    : "bg-white/[0.02] border border-white/[0.08] text-text-muted hover:text-white hover:border-white/20"
                }`}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-brand-mint" />
                ) : (
                  <Building className="w-3.5 h-3.5 text-text-faint" />
                )}
                <span>{sector}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Specializations ── */}
      <div className="space-y-3 pt-2 border-t border-border-default/50">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Specializations & Sub-Disciplines
          </label>
          <span className="text-[11px] text-text-muted">
            {specializations.length} active
          </span>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newSpecInput}
            onChange={(e) => setNewSpecInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSpec();
              }
            }}
            placeholder="Add specialization (e.g. Bridge Design, 4D BIM, Geotechnical Investigation)..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
          />
          <button
            type="button"
            onClick={() => handleAddSpec()}
            className="btn-primary text-xs uppercase tracking-wider px-4 py-2.5 flex items-center gap-1 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Suggested chips based on discipline */}
        {suggestedSpecs.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-yellow" />
              Suggested for {primaryDiscipline}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestedSpecs
                .filter((s) => !specializations.includes(s))
                .map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => handleAddSpec(spec)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-brand-mint/30 text-text-muted hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-brand-mint" />
                    <span>{spec}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Selected Specialization Chips */}
        {specializations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {specializations.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-mint/10 border border-brand-mint/25 text-xs font-semibold text-brand-mint group"
              >
                <span>{spec}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSpec(spec)}
                  className="text-brand-mint/70 hover:text-danger cursor-pointer p-0.5"
                  title={`Remove ${spec}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Preferred Locations ── */}
      <div className="space-y-3 pt-2 border-t border-border-default/50">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Preferred Work / Project Locations
          </label>
          <span className="text-[11px] text-text-muted">
            {preferredLocations.length} locations
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newLocInput}
            onChange={(e) => setNewLocInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddLocation();
              }
            }}
            placeholder="Add location (e.g. Dubai, UAE, Riyadh, KSA, London, UK, Remote)..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-default focus:border-brand-mint focus:outline-none text-sm text-white transition-colors"
          />
          <button
            type="button"
            onClick={() => handleAddLocation()}
            className="btn-primary text-xs uppercase tracking-wider px-4 py-2.5 flex items-center gap-1 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {preferredLocations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {preferredLocations.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white"
              >
                <MapPin className="w-3 h-3 text-brand-mint" />
                <span>{loc}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveLocation(loc)}
                  className="text-text-muted hover:text-danger cursor-pointer p-0.5"
                  title={`Remove ${loc}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
