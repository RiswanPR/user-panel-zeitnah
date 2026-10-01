import React, { useState, useEffect } from 'react';
import { X, Building2, Globe, Mail, Phone, Check, AlertCircle } from 'lucide-react';
import { organizationService } from '../../services/organizationService';
import {
  INFRASTRUCTURE_SPECIALIZATIONS,
  BUSINESS_TYPES,
} from '../../constants/infrastructureTaxonomy';
import { getErrorMessage } from '../../utils/errorMessage';

export default function EditBusinessModal({ isOpen, onClose, business, onSuccess }) {
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

  // Sync form data with current business
  useEffect(() => {
    if (isOpen && business) {
      setFormData({
        name: business.name || '',
        logo: business.logo || '',
        description: business.description || '',
        type: business.type || 'COMPANY',
        industry: business.industry || 'Construction & Infrastructure',
        infrastructureSpecializations: business.infrastructureSpecializations || [],
        website: business.website || '',
        businessEmail: business.businessEmail || '',
        businessPhone: business.businessPhone || '',
        country: business.country || 'India',
        state: business.state || '',
        city: business.city || '',
        officeLocation: business.officeLocation || '',
        companySize: business.companySize || '11-50',
        foundedYear: business.foundedYear ? String(business.foundedYear) : '',
        linkedin: business.linkedin || '',
      });
      setError('');
    }
  }, [isOpen, business]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !business) return null;

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

      const orgId = business._id || business.id;
      const payload = {
        name: formData.name.trim(),
        logo: formData.logo?.trim() || '',
        description: formData.description?.trim() || '',
        type: formData.type,
        industry: formData.industry?.trim() || 'Construction & Infrastructure',
        infrastructureSpecializations: formData.infrastructureSpecializations,
        website: formData.website?.trim() || '',
        businessEmail: formData.businessEmail?.trim() || '',
        businessPhone: formData.businessPhone?.trim() || '',
        country: formData.country?.trim() || '',
        state: formData.state?.trim() || '',
        city: formData.city?.trim() || '',
        officeLocation: formData.officeLocation?.trim() || '',
        location:
          [formData.city, formData.state, formData.country].filter(Boolean).join(', ') ||
          business.location ||
          '',
        companySize: formData.companySize || '',
        foundedYear: formData.foundedYear ? Number(formData.foundedYear) : null,
        linkedin: formData.linkedin?.trim() || '',
      };

      const updated = await organizationService.updateOrganization(orgId, payload);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update business profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-business-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-[#121217] border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center text-brand-mint">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 id="edit-business-modal-title" className="text-xl font-bold font-heading text-white">
                Edit Business Settings
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Update organization details for <span className="text-brand-mint font-semibold">{business.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
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
        <form id="edit-business-form" onSubmit={handleSubmit} className="overflow-y-auto pr-1 py-4 space-y-5 flex-1">
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
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Logo URL</label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Official Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3.5 top-3 text-white/30" />
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Business Description */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Company Overview & Capability
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your organization's infrastructure disciplines, major EPC contracts, BIM engineering services..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all resize-none"
            />
          </div>

          {/* Infrastructure Specializations */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Infrastructure Specializations <span className="text-brand-mint">*</span>
            </label>
            <p className="text-[11px] text-text-muted mb-2.5">
              Select key engineering capabilities for targeted talent matching.
            </p>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
              {INFRASTRUCTURE_SPECIALIZATIONS.map((spec) => {
                const isSelected = formData.infrastructureSpecializations.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialization(spec)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-mint text-black font-semibold shadow-md shadow-brand-mint/20'
                        : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {spec}
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
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-white/30" />
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                  placeholder="careers@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-white/30" />
                <input
                  type="tel"
                  value={formData.businessPhone}
                  onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Location & Headquarters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Mumbai"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Maharashtra"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g. India"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
              />
            </div>
          </div>

          {/* Company Size & Founded Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Company Size</label>
              <select
                value={formData.companySize}
                onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1a24] border border-white/[0.08] focus:border-brand-mint text-sm text-white outline-none"
              >
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1,000 employees</option>
                <option value="1000+">1,000+ employees</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Founded Year</label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.foundedYear}
                onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                placeholder="e.g. 2018"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">LinkedIn Profile</label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/company/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-brand-mint text-sm text-white placeholder-white/30 outline-none transition-all"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-business-form"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-mint text-black font-bold text-xs shadow-lg shadow-brand-mint/20 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? 'Saving Changes...' : 'Save Business Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
