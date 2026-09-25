import { useState, useEffect } from "react";
import { X, Plus, Building, Hammer, Calendar, MapPin, Cpu, Code2 } from "lucide-react";
import { INFRASTRUCTURE_SECTORS, INFRASTRUCTURE_SOFTWARE } from "../../constants/infrastructureTaxonomy";

export default function ProjectEditorModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  isPending = false,
}) {
  const [form, setForm] = useState({
    title: "",
    projectType: "Infrastructure",
    infrastructureSector: "Highways",
    role: "",
    location: "",
    startDate: "",
    endDate: "",
    currentlyActive: false,
    description: "",
    responsibilities: "",
    skills: [],
    softwareUsed: [],
  });

  const [skillInput, setSkillInput] = useState("");
  const [softwareInput, setSoftwareInput] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || "",
        projectType: initialData.projectType || "Infrastructure",
        infrastructureSector: initialData.infrastructureSector || "Highways",
        role: initialData.role || "",
        location: initialData.location || "",
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : "",
        endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : "",
        currentlyActive: !initialData.endDate,
        description: initialData.description || "",
        responsibilities: initialData.responsibilities || "",
        skills: Array.isArray(initialData.skills) ? initialData.skills : [],
        softwareUsed: Array.isArray(initialData.softwareUsed) ? initialData.softwareUsed : [],
      });
    } else {
      setForm({
        title: "",
        projectType: "Infrastructure",
        infrastructureSector: "Highways",
        role: "",
        location: "",
        startDate: "",
        endDate: "",
        currentlyActive: false,
        description: "",
        responsibilities: "",
        skills: [],
        softwareUsed: [],
      });
    }
    setSkillInput("");
    setSoftwareInput("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddSkill = (val) => {
    const s = (val || skillInput).trim();
    if (!s) return;
    if (form.skills.some((item) => item.toLowerCase() === s.toLowerCase())) return;
    setForm({ ...form, skills: [...form.skills, s] });
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skillToRemove) });
  };

  const handleAddSoftware = (val) => {
    const s = (val || softwareInput).trim();
    if (!s) return;
    if (form.softwareUsed.some((item) => item.toLowerCase() === s.toLowerCase())) return;
    setForm({ ...form, softwareUsed: [...form.softwareUsed, s] });
    setSoftwareInput("");
  };

  const handleRemoveSoftware = (swToRemove) => {
    setForm({ ...form, softwareUsed: form.softwareUsed.filter((s) => s !== swToRemove) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload = {
      title: form.title.trim(),
      projectType: form.projectType,
      infrastructureSector: form.infrastructureSector,
      role: form.role.trim(),
      location: form.location.trim(),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.currentlyActive || !form.endDate ? undefined : new Date(form.endDate).toISOString(),
      description: form.description.trim(),
      responsibilities: form.responsibilities.trim(),
      skills: form.skills,
      softwareUsed: form.softwareUsed,
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl border border-border-default bg-bg-card p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-mint/15 border border-brand-mint/25 flex items-center justify-center text-brand-mint">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-extrabold text-white">
                {initialData ? "Edit Infrastructure Project" : "Add Infrastructure Project"}
              </h3>
              <p className="text-xs text-text-muted">
                Document real-world engineering, construction, and design projects
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-muted hover:text-white cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Project Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
              Project Name <span className="text-brand-mint">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Al Maktoum International Airport Expansion Phase 2"
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
            />
          </div>

          {/* Project Type & Sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Project Type
              </label>
              <select
                value={form.projectType}
                onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none cursor-pointer"
              >
                <option value="Infrastructure">Infrastructure</option>
                <option value="Commercial">Commercial</option>
                <option value="Residential">Residential</option>
                <option value="Industrial">Industrial</option>
                <option value="Transportation">Transportation</option>
                <option value="Environmental">Environmental</option>
                <option value="Energy">Energy</option>
                <option value="Research & Development">Research & Development</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Infrastructure Sector <span className="text-brand-mint">*</span>
              </label>
              <select
                value={form.infrastructureSector}
                onChange={(e) => setForm({ ...form, infrastructureSector: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none cursor-pointer"
              >
                {INFRASTRUCTURE_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Your Role on Project
              </label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. Lead Structural Designer, BIM Modeler"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Dubai, UAE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                End Date
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                disabled={form.currentlyActive}
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none disabled:opacity-40"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="projCurrentlyActive"
              checked={form.currentlyActive}
              onChange={(e) => setForm({ ...form, currentlyActive: e.target.checked })}
              className="rounded border-border-default text-brand-mint focus:ring-0 cursor-pointer"
            />
            <label htmlFor="projCurrentlyActive" className="text-xs text-text-secondary cursor-pointer">
              Currently ongoing / active project
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
              Project Overview / Scope
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="High-level description of the project scope, scale, budget, or key challenges..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none resize-none"
            />
          </div>

          {/* Key Responsibilities */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
              Key Responsibilities & Deliverables
            </label>
            <textarea
              rows={2}
              value={form.responsibilities}
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
              placeholder="Your specific responsibilities, site audits, calculation reports, 3D modeling tasks..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-default text-sm text-white focus:border-brand-mint focus:outline-none resize-none"
            />
          </div>

          {/* Software Used */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Software & Tools Used
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={softwareInput}
                onChange={(e) => setSoftwareInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSoftware();
                  }
                }}
                placeholder="e.g. Revit, Civil 3D, Primavera P6, Navisworks..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-default text-xs text-white focus:border-brand-mint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddSoftware()}
                className="btn-secondary text-xs px-3 py-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Quick software chips */}
            <div className="flex flex-wrap gap-1">
              {INFRASTRUCTURE_SOFTWARE.slice(0, 8)
                .filter((sw) => !form.softwareUsed.includes(sw))
                .map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() => handleAddSoftware(sw)}
                    className="text-[10px] px-2 py-0.5 rounded bg-white/[0.02] border border-white/[0.06] text-text-muted hover:text-white cursor-pointer"
                  >
                    + {sw}
                  </button>
                ))}
            </div>
            {form.softwareUsed.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.softwareUsed.map((sw) => (
                  <span
                    key={sw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-mint/10 border border-brand-mint/25 text-xs text-brand-mint font-medium"
                  >
                    {sw}
                    <button
                      type="button"
                      onClick={() => handleRemoveSoftware(sw)}
                      className="hover:text-danger cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Skills Used */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Technical & Engineering Skills Used
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="e.g. Quantity Surveying, Geotechnical Analysis, Clash Detection..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-default text-xs text-white focus:border-brand-mint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddSkill()}
                className="btn-secondary text-xs px-3 py-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-danger cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-3 px-5 min-h-[44px] w-full sm:w-auto cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary text-xs py-3 px-6 min-h-[44px] w-full sm:w-auto cursor-pointer"
            >
              {isPending ? "Saving..." : initialData ? "Save Changes" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
