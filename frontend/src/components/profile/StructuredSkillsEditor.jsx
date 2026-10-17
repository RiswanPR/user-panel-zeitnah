import { useState } from "react";
import { Plus, X, Code2, Cpu, Shield, CheckCircle2, Sparkles } from "lucide-react";
import {
  DEFAULT_STRUCTURED_SKILLS,
} from "../../constants/infrastructureTaxonomy";

import { normalizeStructuredSkills } from "../../utils/profileNormalization";

export const CATEGORY_TABS = [
  {
    id: "softwareSkills",
    legacyKey: "software",
    altKey: "softwareTools",
    label: "Software Skills",
    icon: Cpu,
    desc: "Engineering, design, BIM, and productivity software",
  },
  {
    id: "technicalSkills",
    legacyKey: "technical",
    altKey: "technicalCalculations",
    label: "Technical Skills",
    icon: Code2,
    desc: "Technical engineering knowledge, calculations, design methods, and discipline-specific competencies",
  },
  {
    id: "professionalSkills",
    legacyKey: "professional",
    altKey: "professionalLeadership",
    label: "Professional Skills",
    icon: Shield,
    desc: "Communication, leadership, coordination, project management, and workplace competencies",
  },
];

export default function StructuredSkillsEditor({
  structuredSkills = {
    technicalSkills: [],
    softwareSkills: [],
    professionalSkills: [],
  },
  setStructuredSkills,
  flatSkills = [],
  setFlatSkills,
  onChangeDirty,
}) {
  const [activeTab, setActiveTab] = useState("softwareSkills");
  const [inputVal, setInputVal] = useState("");

  const currentTabMeta =
    CATEGORY_TABS.find((c) => c.id === activeTab) || CATEGORY_TABS[0];

  const currentCategoryList =
    structuredSkills[activeTab] ||
    structuredSkills[currentTabMeta.legacyKey] ||
    structuredSkills[currentTabMeta.altKey] ||
    [];

  const currentDefaults =
    DEFAULT_STRUCTURED_SKILLS[activeTab] ||
    DEFAULT_STRUCTURED_SKILLS[currentTabMeta.legacyKey] ||
    [];

  const handleAddSkill = (skillName) => {
    const trimmed = (skillName || inputVal).trim();
    if (!trimmed) return;

    if (currentCategoryList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const updatedCategory = [...currentCategoryList, trimmed];
    const newStructured = normalizeStructuredSkills({
      ...structuredSkills,
      [activeTab]: updatedCategory,
      [currentTabMeta.legacyKey]: updatedCategory,
      [currentTabMeta.altKey]: updatedCategory,
    });
    setStructuredSkills(newStructured);

    // Also sync to flat skills array without duplicates
    if (!flatSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setFlatSkills([...flatSkills, trimmed]);
    }

    setInputVal("");
    if (onChangeDirty) onChangeDirty();
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updatedCategory = currentCategoryList.filter((s) => s !== skillToRemove);
    const newStructured = normalizeStructuredSkills({
      ...structuredSkills,
      [activeTab]: updatedCategory,
      [currentTabMeta.legacyKey]: updatedCategory,
      [currentTabMeta.altKey]: updatedCategory,
    });
    setStructuredSkills(newStructured);

    // Also remove from flatSkills if no other category has it (including legacy industrySkills)
    const remainingAll = [
      ...(newStructured.softwareSkills || []),
      ...(newStructured.technicalSkills || []),
      ...(newStructured.professionalSkills || []),
      ...(newStructured.industrySkills || []),
    ];
    if (!remainingAll.some((s) => s.toLowerCase() === skillToRemove.toLowerCase())) {
      setFlatSkills(flatSkills.filter((s) => s !== skillToRemove));
    }

    if (onChangeDirty) onChangeDirty();
  };

  const totalSkillCount =
    (structuredSkills.softwareSkills?.length || structuredSkills.software?.length || 0) +
    (structuredSkills.technicalSkills?.length || structuredSkills.technical?.length || 0) +
    (structuredSkills.professionalSkills?.length || structuredSkills.professional?.length || 0);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {CATEGORY_TABS.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          const count = structuredSkills[cat.id]?.length || 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`p-2.5 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer min-h-[48px] flex flex-col justify-between ${
                isActive
                  ? "bg-brand-mint/15 border-brand-mint text-text-primary shadow-sm ring-1 ring-brand-mint/40"
                  : "bg-surface-elevated/40 border-border text-text-muted hover:text-text-primary hover:bg-surface-elevated"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-mint" : "text-text-faint"}`} />
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    count > 0 ? "bg-surface-elevated text-text-primary border border-border" : "text-text-faint"
                  }`}
                >
                  {count}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-text-muted">
        <p className="leading-relaxed">{CATEGORY_TABS.find((c) => c.id === activeTab)?.desc}</p>
        <span className="text-text-faint font-mono shrink-0">
          Total Skills: {totalSkillCount}
        </span>
      </div>

      {/* Input Box */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddSkill();
            }
          }}
          placeholder={`Add ${CATEGORY_TABS.find((c) => c.id === activeTab)?.label.toLowerCase()}...`}
          className="flex-1 px-4 py-2.5 rounded-xl bg-surface-elevated/50 border border-border focus:border-brand-mint focus:outline-none text-sm text-text-primary placeholder:text-text-faint transition-colors"
        />
        <button
          type="button"
          onClick={() => handleAddSkill()}
          className="btn-primary text-xs uppercase tracking-wider px-4 py-2.5 flex items-center gap-1 cursor-pointer min-h-[44px]"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Curated Suggested Chips */}
      {currentDefaults.filter((s) => !currentCategoryList.includes(s)).length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-yellow" />
            Curated AEC Suggestions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {currentDefaults
              .filter((s) => !currentCategoryList.includes(s))
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddSkill(s)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-surface-elevated/30 hover:bg-surface-elevated border border-border hover:border-brand-mint/30 text-text-muted hover:text-text-primary transition-all cursor-pointer inline-flex items-center gap-1 min-h-[32px]"
                >
                  <Plus className="w-3 h-3 text-brand-mint" />
                  <span>{s}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Active Category Chips */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-text-muted">
          <span>Active in {CATEGORY_TABS.find((c) => c.id === activeTab)?.label} ({currentCategoryList.length})</span>
          {totalSkillCount >= 3 ? (
            <span className="text-brand-mint font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 3+ Skills Milestone Met
            </span>
          ) : (
            <span className="text-brand-yellow">
              Add at least 3 skills across categories for profile strength
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {currentCategoryList.length > 0 ? (
            currentCategoryList.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated/50 border border-border text-xs font-semibold text-text-primary group hover:border-brand-mint/30 transition-all"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-text-muted hover:text-danger cursor-pointer p-0.5"
                  title={`Remove ${skill}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <p className="text-xs text-text-faint py-3 italic">
              No skills added under this category yet. Click a suggestion above or type your own.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
