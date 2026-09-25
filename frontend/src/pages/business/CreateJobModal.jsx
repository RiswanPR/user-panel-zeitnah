import React, { useState } from 'react';
import { X, Briefcase, Sparkles, AlertCircle, Plus, Trash2, Check } from 'lucide-react';
import { opportunityService } from '../../services/opportunityService';
import {
  INFRASTRUCTURE_DISCIPLINES,
  INFRASTRUCTURE_SECTORS,
  INFRASTRUCTURE_SOFTWARE,
  JOB_TYPES,
  WORK_MODES,
} from '../../constants/infrastructureTaxonomy';

export default function CreateJobModal({ isOpen, onClose, business, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    jobType: 'Full-time',
    employmentType: 'Full-time',
    workMode: 'On-site',
    discipline: INFRASTRUCTURE_DISCIPLINES[0] || 'Civil Engineering',
    specialization: '',
    infrastructureSector: INFRASTRUCTURE_SECTORS[0] || 'Highways',
    minYearsExperience: 2,
    maxYearsExperience: 5,
    requiredSkills: [],
    preferredSkills: [],
    requiredSoftware: [],
    preferredSoftware: [],
    requiredEducation: 'B.Tech / B.E in Civil Engineering or related field',
    preferredEducation: '',
    requiredCertifications: [],
    preferredCertifications: [],
    location: business?.location || '',
    salaryMin: '',
    salaryMax: '',
    currency: 'INR',
    responsibilities: '',
    requirements: '',
    benefits: '',
    applicationDeadline: '',
  });

  const [skillInput, setSkillInput] = useState('');
  const [prefSkillInput, setPrefSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isApproved = business?.status === 'APPROVED' || business?.isVerified;

  const handleAddSkill = (isPreferred = false) => {
    const input = isPreferred ? prefSkillInput : skillInput;
    if (!input.trim()) return;
    const key = isPreferred ? 'preferredSkills' : 'requiredSkills';
    if (!formData[key].includes(input.trim())) {
      setFormData({ ...formData, [key]: [...formData[key], input.trim()] });
    }
    if (isPreferred) setPrefSkillInput('');
    else setSkillInput('');
  };

  const handleRemoveSkill = (skill, isPreferred = false) => {
    const key = isPreferred ? 'preferredSkills' : 'requiredSkills';
    setFormData({ ...formData, [key]: formData[key].filter((s) => s !== skill) });
  };

  const toggleSoftware = (sw, isPreferred = false) => {
    const key = isPreferred ? 'preferredSoftware' : 'requiredSoftware';
    const exists = formData[key].includes(sw);
    setFormData({
      ...formData,
      [key]: exists ? formData[key].filter((s) => s !== sw) : [...formData[key], sw],
    });
  };

  const handleAddCert = () => {
    if (!certInput.trim()) return;
    if (!formData.requiredCertifications.includes(certInput.trim())) {
      setFormData({
        ...formData,
        requiredCertifications: [...formData.requiredCertifications, certInput.trim()],
      });
    }
    setCertInput('');
  };

  const handleRemoveCert = (cert) => {
    setFormData({
      ...formData,
      requiredCertifications: formData.requiredCertifications.filter((c) => c !== cert),
    });
  };

  const handleSubmit = async (publish = true) => {
    try {
      setSaving(true);
      setError('');

      if (!formData.title.trim()) {
        setError('Job title is required');
        setSaving(false);
        return;
      }

      if (publish) {
        if (!isApproved) {
          setError(
            'Your business must be approved by admin before publishing live jobs. You can save as a Draft in the meantime.',
          );
          setSaving(false);
          return;
        }
        if (formData.requiredSkills.length === 0) {
          setError('At least one required skill is required to publish.');
          setSaving(false);
          return;
        }
        if (!formData.responsibilities.trim() && !formData.requirements.trim()) {
          setError('Please provide job responsibilities or requirements.');
          setSaving(false);
          return;
        }
      }

      const payload = {
        ...formData,
        organizationId: business?._id || business?.id,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        minYearsExperience: Number(formData.minYearsExperience) || 0,
        maxYearsExperience: Number(formData.maxYearsExperience) || 0,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax) : null,
        description:
          formData.responsibilities ||
          formData.requirements ||
          `${formData.title} at ${business?.name}`,
      };

      const res = await opportunityService.createOpportunity(payload);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to save job opportunity.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#121217] border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white">Create Infrastructure Job</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Posting for <span className="text-brand-mint font-semibold">{business?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Warning if unapproved */}
        {!isApproved && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              This business is currently under verification review. You can create and save this job as a{' '}
              <strong>Draft</strong>. It can be published once business approval is complete.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto pr-1 py-4 space-y-6 flex-1">
          {/* Section 1: Core Role Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              1. Role Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Job Title <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior BIM Coordinator, Bridge Project Lead"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-cyan-400 text-sm text-white placeholder-white/30 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">Job Type</label>
                <select
                  value={formData.jobType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      jobType: e.target.value,
                      employmentType: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1a24] border border-white/[0.08] text-sm text-white outline-none"
                >
                  {JOB_TYPES.map((jt) => (
                    <option key={jt} value={jt}>
                      {jt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">Work Mode</label>
                <select
                  value={formData.workMode}
                  onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1a24] border border-white/[0.08] text-sm text-white outline-none"
                >
                  {WORK_MODES.map((wm) => (
                    <option key={wm} value={wm}>
                      {wm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Infrastructure Taxonomy */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              2. Infrastructure Taxonomy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Discipline <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={formData.discipline}
                  onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1a24] border border-white/[0.08] text-sm text-white outline-none"
                >
                  {INFRASTRUCTURE_DISCIPLINES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Infrastructure Sector <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={formData.infrastructureSector}
                  onChange={(e) =>
                    setFormData({ ...formData, infrastructureSector: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1a24] border border-white/[0.08] text-sm text-white outline-none"
                >
                  {INFRASTRUCTURE_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">Specialization</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g. 4D Simulation, Pre-stressed Concrete"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/30 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Experience & Location */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              3. Experience & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Min Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={formData.minYearsExperience}
                  onChange={(e) =>
                    setFormData({ ...formData, minYearsExperience: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Max Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={formData.maxYearsExperience}
                  onChange={(e) =>
                    setFormData({ ...formData, maxYearsExperience: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Work Location <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Kochi, Kerala or Site HQ"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Software Requirements (Required vs Preferred) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              4. Structured Software Requirements
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Required Software Tools (Must-have)
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {INFRASTRUCTURE_SOFTWARE.map((sw) => {
                    const selected = formData.requiredSoftware.includes(sw);
                    return (
                      <button
                        key={sw}
                        type="button"
                        onClick={() => toggleSoftware(sw, false)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          selected
                            ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                            : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{sw}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Preferred Software Tools (Good-to-have)
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {INFRASTRUCTURE_SOFTWARE.map((sw) => {
                    const selected = formData.preferredSoftware.includes(sw);
                    return (
                      <button
                        key={sw}
                        type="button"
                        onClick={() => toggleSoftware(sw, true)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          selected
                            ? 'bg-violet-500 text-white font-bold shadow-md shadow-violet-500/20'
                            : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{sw}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Skills (Required vs Preferred) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              5. Skills Taxonomy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Required Skills <span className="text-cyan-400">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(false);
                      }
                    }}
                    placeholder="Type skill & press Add..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {formData.requiredSkills.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    >
                      <span>{s}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-white"
                        onClick={() => handleRemoveSkill(s, false)}
                      />
                    </span>
                  ))}
                  {formData.requiredSkills.length === 0 && (
                    <span className="text-[11px] text-white/30">No required skills added yet.</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Preferred Skills
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={prefSkillInput}
                    onChange={(e) => setPrefSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(true);
                      }
                    }}
                    placeholder="Type preferred skill..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {formData.preferredSkills.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30"
                    >
                      <span>{s}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-white"
                        onClick={() => handleRemoveSkill(s, true)}
                      />
                    </span>
                  ))}
                  {formData.preferredSkills.length === 0 && (
                    <span className="text-[11px] text-white/30">No preferred skills added.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Education & Certifications */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              6. Qualifications & Certifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Required Education
                </label>
                <input
                  type="text"
                  value={formData.requiredEducation}
                  onChange={(e) => setFormData({ ...formData, requiredEducation: e.target.value })}
                  placeholder="e.g. B.Tech in Civil Engineering"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Required Certifications
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCert();
                      }
                    }}
                    placeholder="e.g. PMP, LEED AP, OSHA 30..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCert}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {formData.requiredCertifications.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    >
                      <span>{c}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-white"
                        onClick={() => handleRemoveCert(c)}
                      />
                    </span>
                  ))}
                  {formData.requiredCertifications.length === 0 && (
                    <span className="text-[11px] text-white/30">None added</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Compensation & Deadline */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
              7. Compensation & Timeline
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">Min Salary</label>
                <input
                  type="number"
                  placeholder="e.g. 600000"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">Max Salary</label>
                <input
                  type="number"
                  placeholder="e.g. 1200000"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1a24] border border-white/[0.08] text-sm text-white outline-none"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="AED">AED</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 8: Responsibilities & Requirements */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              8. Job Details & Responsibilities
            </h3>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Key Responsibilities <span className="text-cyan-400">*</span>
              </label>
              <textarea
                rows={3}
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                placeholder="• Prepare monthly baseline programs in Primavera P6&#10;• Coordinate 4D BIM clash detection with MEP contractors&#10;• Oversee site quantity takeoffs and BOQ verifications"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-cyan-400 text-sm text-white placeholder-white/30 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Requirements & Experience
              </label>
              <textarea
                rows={3}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="• 3+ years handling metro or highway infrastructure projects&#10;• Hands-on proficiency with Civil 3D and Revit Structures&#10;• Working knowledge of FIDIC Red Book contractual terms"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-cyan-400 text-sm text-white placeholder-white/30 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Benefits & Perks
              </label>
              <textarea
                rows={2}
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="Site accommodation allowances, annual performance bonus, professional chartership support..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-cyan-400 text-sm text-white placeholder-white/30 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
          <p className="text-[11px] text-text-muted">
            {isApproved
              ? 'Published jobs are immediately discoverable on the Zeitnah network.'
              : 'Save as draft until business is approved.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving || !isApproved}
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-brand-mint text-black font-bold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? 'Publishing...' : 'Publish Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
