import { useState } from "react";
import { Plus, X, Briefcase, DollarSign, MapPin, ShieldCheck, Lock, Eye, Check } from "lucide-react";
import {
  INFRASTRUCTURE_SECTORS,
  WORK_MODES,
  EMPLOYMENT_TYPES,
  AVAILABILITY_OPTIONS,
} from "../../constants/infrastructureTaxonomy";

export default function CareerPreferencesSection({
  careerPreferences = {
    openToOpportunities: false,
    preferredRoles: [],
    preferredInfrastructureSectors: [],
    preferredLocations: [],
    preferredWorkMode: "Hybrid",
    preferredEmploymentType: "Full-time",
    expectedSalaryRange: { min: 0, max: 0, currency: "USD" },
    availability: "Immediate",
  },
  setCareerPreferences,
  privacySettings = {
    experienceVisibility: "PUBLIC",
    educationVisibility: "PUBLIC",
    projectsVisibility: "PUBLIC",
    certificationsVisibility: "PUBLIC",
    careerPreferencesVisibility: "PRIVATE",
    contactInfoVisibility: "PRIVATE",
  },
  setPrivacySettings,
  discoverableToRecruiters = false,
  setDiscoverableToRecruiters,
  profileVisibility = "PUBLIC",
  setProfileVisibility,
  onChangeDirty,
}) {
  const [roleInput, setRoleInput] = useState("");
  const [locInput, setLocInput] = useState("");

  const updatePref = (key, val) => {
    const updated = {
      ...careerPreferences,
      [key]: val,
    };
    if (key === "preferredInfrastructureSectors") {
      updated.preferredSectors = val;
    } else if (key === "preferredSectors") {
      updated.preferredInfrastructureSectors = val;
    } else if (key === "preferredRoles") {
      updated.targetRoles = val;
    } else if (key === "targetRoles") {
      updated.preferredRoles = val;
    }
    setCareerPreferences(updated);
    if (onChangeDirty) onChangeDirty();
  };

  const updatePrivacy = (key, val) => {
    const updated = {
      ...privacySettings,
      [key]: val,
    };
    if (key === "experienceVisibility" || key === "experience") {
      updated.experience = val;
      updated.experienceVisibility = val;
    } else if (key === "educationVisibility" || key === "education") {
      updated.education = val;
      updated.educationVisibility = val;
    } else if (key === "projectsVisibility" || key === "projects") {
      updated.projects = val;
      updated.projectsVisibility = val;
    } else if (key === "certificationsVisibility" || key === "certifications") {
      updated.certifications = val;
      updated.certificationsVisibility = val;
    } else if (key === "careerPreferencesVisibility" || key === "careerPreferences") {
      updated.careerPreferences = val;
      updated.careerPreferencesVisibility = val;
    } else if (key === "contactInfoVisibility" || key === "contactInfo") {
      updated.contactInfo = val;
      updated.contactInfoVisibility = val;
    }
    setPrivacySettings(updated);
    if (onChangeDirty) onChangeDirty();
  };

  const handleAddRole = (role) => {
    const val = (role || roleInput).trim();
    if (!val) return;
    const current = careerPreferences.preferredRoles || careerPreferences.targetRoles || [];
    if (current.some((r) => r.toLowerCase() === val.toLowerCase())) return;
    updatePref("preferredRoles", [...current, val]);
    setRoleInput("");
  };

  const handleRemoveRole = (roleToRemove) => {
    const current = careerPreferences.preferredRoles || careerPreferences.targetRoles || [];
    updatePref("preferredRoles", current.filter((r) => r !== roleToRemove));
  };

  const handleToggleSector = (sector) => {
    const current =
      careerPreferences.preferredSectors ||
      careerPreferences.preferredInfrastructureSectors ||
      [];
    if (current.includes(sector)) {
      updatePref("preferredSectors", current.filter((s) => s !== sector));
    } else {
      updatePref("preferredSectors", [...current, sector]);
    }
  };


  const handleAddLocation = (loc) => {
    const val = (loc || locInput).trim();
    if (!val) return;
    const current = careerPreferences.preferredLocations || [];
    if (current.some((l) => l.toLowerCase() === val.toLowerCase())) return;
    updatePref("preferredLocations", [...current, val]);
    setLocInput("");
  };

  const handleRemoveLocation = (locToRemove) => {
    const current = careerPreferences.preferredLocations || [];
    updatePref("preferredLocations", current.filter((l) => l !== locToRemove));
  };

  return (
    <div className="space-y-8">
      {/* ── Career Opportunities Toggle ── */}
      <div className="p-5 rounded-2xl bg-surface-elevated/70 border border-border space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand-mint" />
              Open to Career Opportunities
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Signal to infrastructure companies and mentors that you are seeking new roles or projects.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={careerPreferences.openToOpportunities || false}
              onChange={(e) => updatePref("openToOpportunities", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-mint" />
          </label>
        </div>
      </div>

      {/* ── Preferred Roles ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            Preferred Job Titles / Roles
          </label>
          <span className="text-[11px] text-text-muted">
            {careerPreferences.preferredRoles?.length || 0} roles
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddRole();
              }
            }}
            placeholder="Add title (e.g. Structural Design Engineer, BIM Coordinator, Site Supervisor)..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-elevated/70 border border-border focus:border-brand-mint focus:outline-none text-sm text-text-primary transition-colors"
          />
          <button
            type="button"
            onClick={() => handleAddRole()}
            className="btn-primary text-xs uppercase tracking-wider px-4 py-2.5 flex items-center gap-1 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {careerPreferences.preferredRoles?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {careerPreferences.preferredRoles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-mint/10 border border-brand-mint/25 text-xs font-semibold text-brand-mint"
              >
                <span>{role}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRole(role)}
                  className="text-brand-mint/70 hover:text-danger cursor-pointer p-0.5"
                  title={`Remove ${role}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Preferred Sectors ── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
          Target Infrastructure Sectors
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          {INFRASTRUCTURE_SECTORS.map((sector) => {
            const isSelected = (careerPreferences.preferredInfrastructureSectors || []).includes(sector);
            return (
              <button
                key={sector}
                type="button"
                onClick={() => handleToggleSector(sector)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  isSelected
                    ? "bg-brand-mint/15 border border-brand-mint text-brand-mint shadow-sm"
                    : "bg-surface-elevated/50 border border-border text-text-muted hover:text-text-primary"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-mint" />}
                <span>{sector}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Work Mode, Employment Type, Availability ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Work Mode
          </label>
          <select
            value={careerPreferences.preferredWorkMode || "Hybrid"}
            onChange={(e) => updatePref("preferredWorkMode", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated/70 border border-border focus:border-brand-mint focus:outline-none text-sm text-text-primary transition-colors cursor-pointer"
          >
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Employment Type
          </label>
          <select
            value={careerPreferences.preferredEmploymentType || "Full-time"}
            onChange={(e) => updatePref("preferredEmploymentType", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated/70 border border-border focus:border-brand-mint focus:outline-none text-sm text-text-primary transition-colors cursor-pointer"
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Availability
          </label>
          <select
            value={careerPreferences.availability || "Immediate"}
            onChange={(e) => updatePref("availability", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated/70 border border-border focus:border-brand-mint focus:outline-none text-sm text-text-primary transition-colors cursor-pointer"
          >
            {AVAILABILITY_OPTIONS.map((avail) => (
              <option key={avail} value={avail}>
                {avail}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Expected Salary Range ── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
          Expected Annual Salary (USD Equivalent)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[11px] text-text-muted block mb-1">Minimum</span>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-text-faint">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={careerPreferences.expectedSalaryRange?.min || ""}
                onChange={(e) =>
                  updatePref("expectedSalaryRange", {
                    ...careerPreferences.expectedSalaryRange,
                    min: Number(e.target.value),
                  })
                }
                placeholder="40,000"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-surface-elevated/70 border border-border focus:border-brand-mint focus:outline-none text-sm text-text-primary"
              />
            </div>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block mb-1">Maximum</span>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-text-faint">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={careerPreferences.expectedSalaryRange?.max || ""}
                onChange={(e) =>
                  updatePref("expectedSalaryRange", {
                    ...careerPreferences.expectedSalaryRange,
                    max: Number(e.target.value),
                  })
                }
                placeholder="80,000"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-surface-elevated/70 border border-border focus:border-brand-mint focus:outline-none text-sm text-text-primary"
              />
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[11px] text-text-muted block mb-1">Currency</span>
            <input
              type="text"
              value={careerPreferences.expectedSalaryRange?.currency || "USD"}
              onChange={(e) =>
                updatePref("expectedSalaryRange", {
                  ...careerPreferences.expectedSalaryRange,
                  currency: e.target.value.toUpperCase(),
                })
              }
              className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated/70 border border-border focus:border-brand-mint focus:outline-none text-sm text-text-primary uppercase font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── Privacy Settings (Section 16) ── */}
      <div className="pt-6 border-t border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-mint" />
              Granular Profile Visibility Controls
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Control what peers, employers, and visitors can see on your public profile.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-primary block">Experience Visibility</span>
              <span className="text-[11px] text-text-muted">Work & project timeline</span>
            </div>
            <select
              value={privacySettings.experience || privacySettings.experienceVisibility || "PUBLIC"}
              onChange={(e) => updatePrivacy("experience", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-surface-card border border-border text-xs text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-primary block">Education Visibility</span>
              <span className="text-[11px] text-text-muted">Degrees & institutions</span>
            </div>
            <select
              value={privacySettings.education || privacySettings.educationVisibility || "PUBLIC"}
              onChange={(e) => updatePrivacy("education", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-surface-card border border-border text-xs text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-primary block">Projects Visibility</span>
              <span className="text-[11px] text-text-muted">Infrastructure projects</span>
            </div>
            <select
              value={privacySettings.projects || privacySettings.projectsVisibility || "PUBLIC"}
              onChange={(e) => updatePrivacy("projects", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-surface-card border border-border text-xs text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-primary block">Certifications Visibility</span>
              <span className="text-[11px] text-text-muted">Licenses and credentials</span>
            </div>
            <select
              value={privacySettings.certifications || privacySettings.certificationsVisibility || "PUBLIC"}
              onChange={(e) => updatePrivacy("certifications", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-surface-card border border-border text-xs text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-primary block">Career Preferences</span>
              <span className="text-[11px] text-text-muted">Salary & target roles</span>
            </div>
            <select
              value={privacySettings.careerPreferences || privacySettings.careerPreferencesVisibility || "PRIVATE"}
              onChange={(e) => updatePrivacy("careerPreferences", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-surface-card border border-border text-xs text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="PRIVATE">Private Only</option>
              <option value="VERIFIED_RECRUITERS">Recruiters Only</option>
              <option value="PUBLIC">Public</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-primary block">Contact Information</span>
              <span className="text-[11px] text-text-muted">Email and direct links</span>
            </div>
            <select
              value={privacySettings.contactInfo || privacySettings.contactInfoVisibility || "PRIVATE"}
              onChange={(e) => updatePrivacy("contactInfo", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-surface-card border border-border text-xs text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="PRIVATE">Private Only</option>
              <option value="VERIFIED_RECRUITERS">Recruiters Only</option>
              <option value="PUBLIC">Public</option>
            </select>
          </div>
        </div>

        {/* Recruiter discovery checkbox */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-elevated/60 border border-border">
          <input
            type="checkbox"
            id="discoverableRecruitersToggle"
            checked={discoverableToRecruiters}
            onChange={(e) => {
              setDiscoverableToRecruiters(e.target.checked);
              if (onChangeDirty) onChangeDirty();
            }}
            className="w-4 h-4 rounded border-border text-brand-mint focus:ring-brand-mint bg-surface-elevated cursor-pointer"
          />
          <label htmlFor="discoverableRecruitersToggle" className="text-xs text-text-secondary cursor-pointer select-none">
            <span className="font-semibold text-text-primary">Recruiter Talent Discovery:</span> Allow verified infrastructure partner companies, EPC contractors, and consultancies to discover my profile for hiring.
          </label>
        </div>
      </div>
    </div>
  );
}
