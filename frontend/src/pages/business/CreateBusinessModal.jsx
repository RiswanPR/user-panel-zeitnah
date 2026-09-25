import React, { useState } from 'react';
import { X, Building2, Globe, Mail, Phone, MapPin, Sparkles, Check, AlertCircle } from 'lucide-react';
import { organizationService } from '../../services/organizationService';
import {
  INFRASTRUCTURE_SPECIALIZATIONS,
  BUSINESS_TYPES,
} from '../../constants/infrastructureTaxonomy';

export default function CreateBusinessModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    description: '',
    type: 'COMPANY',
    industry: 'Construction & Infrastructure',
    infrastructureSpecializations: [],
    website: '',
    businessEmail: '',
    businessPhone: '',
    country: 'India',
    state: '',
    city: '',
    officeLocation: '',
    companySize: '11-50',
    foundedYear: '',
    linkedin: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleSpecialization = (spec) => {
    setFormData((prev) => {
      const exists = prev.infrastructureSpecializations.includes(spec);
      return {
        ...prev,
        infrastructureSpecializations: exists
          ? prev.infrastructureSpecializations.filter((s) => s !== spec)
          : [...prev.infrastructureSpecializations, spec],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Business name is required.');
      return;
    }
    if (formData.infrastructureSpecializations.length === 0) {
      setError('Please select at least one infrastructure specialization.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const created = await organizationService.createOrganization({
        ...formData,
        foundedYear: formData.foundedYear ? Number(formData.foundedYear) : null,
      });
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create business profile.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121217] border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-brand-mint">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white">Create Infrastructure Business</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Register your business for employer operations & verified talent discovery.
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

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form id="create-business-form" onSubmit={handleSubmit} className="overflow-y-auto pr-1 py-4 space-y-5 flex-1">
          {/* Business Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Business Name <span className="text-brand-mint">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Larsen Infra Engineering"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Business Type <span className="text-brand-mint">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1a24] border border-white/[0.08] focus:border-brand-mint text-sm text-white outline-none"
              >
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>
                    {bt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Logo URL & Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Company Logo URL
              </label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                placeholder="https://.../logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://exampleinfra.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Business Overview & Mission
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your organization's core projects, infrastructure expertise, and capabilities..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none resize-none"
            />
          </div>

          {/* Infrastructure Specializations Taxonomy (Multi-select) */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Infrastructure Specializations <span className="text-brand-mint">*</span>
              <span className="text-text-muted font-normal ml-1">
                ({formData.infrastructureSpecializations.length} selected)
              </span>
            </label>
            <p className="text-[11px] text-text-muted mb-2">
              Select all specialized sectors your business operates in:
            </p>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              {INFRASTRUCTURE_SPECIALIZATIONS.map((spec) => {
                const selected = formData.infrastructureSpecializations.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialization(spec)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selected
                        ? 'bg-brand-mint text-black font-semibold shadow-md shadow-brand-mint/20'
                        : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/[0.04]'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{spec}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Official Business Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                  placeholder="careers@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={formData.businessPhone}
                  onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Kochi"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Kerala"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g. India"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Office Address */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Headquarters / Office Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
              <input
                type="text"
                value={formData.officeLocation}
                onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                placeholder="Tech Park, Infopark Phase II, Kochi"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none"
              />
            </div>
          </div>

          {/* Company Size & Founded Year & LinkedIn */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Company Size</label>
              <select
                value={formData.companySize}
                onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#1a1a24] border border-white/[0.08] text-sm text-white outline-none"
              >
                <option value="1-10">1-10 Employees</option>
                <option value="11-50">11-50 Employees</option>
                <option value="51-200">51-200 Employees</option>
                <option value="201-500">201-500 Employees</option>
                <option value="500+">500+ Employees</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Founded Year</label>
              <input
                type="number"
                min="1900"
                max="2030"
                value={formData.foundedYear}
                onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                placeholder="e.g. 2018"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">LinkedIn Profile</label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/company/..."
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
          <p className="text-[11px] text-text-muted">
            Submitted businesses are verified by platform admins before public job publishing.
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
              type="submit"
              form="create-business-form"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
