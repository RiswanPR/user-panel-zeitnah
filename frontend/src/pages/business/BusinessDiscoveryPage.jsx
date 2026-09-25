import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Search,
  MapPin,
  Briefcase,
  Users,
  ChevronRight,
  X,
} from 'lucide-react';
import { organizationService } from '../../services/organizationService';
import {
  INFRASTRUCTURE_SPECIALIZATIONS,
} from '../../constants/infrastructureTaxonomy';

export default function BusinessDiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const {
    data: orgsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'public-businesses',
      { q: searchQuery, specialization: selectedSpecialization, location: selectedLocation },
    ],
    queryFn: () =>
      organizationService.getOrganizations({
        q: searchQuery,
        specialization: selectedSpecialization,
        location: selectedLocation,
      }),
  });

  const organizations = orgsData?.data || [];

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialization('');
    setSelectedLocation('');
  };

  const hasFilters = searchQuery || selectedSpecialization || selectedLocation;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-mint/15 text-brand-mint border border-brand-mint/30">
              Verified Network
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white mt-2 tracking-tight">
            Infrastructure Organizations & Businesses
          </h1>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Discover verified engineering consultancies, general contractors, EPC developers, and specialized infrastructure technology firms.
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search bar */}
          <div className="relative sm:col-span-2">
            <Search className="w-5 h-5 text-white/30 absolute left-4 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name, sector, or keywords..."
              className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/30 outline-none focus:border-brand-mint"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Specialization Filter */}
          <select
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#161620] border border-white/[0.08] text-xs text-white outline-none focus:border-brand-mint"
          >
            <option value="">All Specializations</option>
            {INFRASTRUCTURE_SPECIALIZATIONS.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-text-muted">
              Filtering verified infrastructure businesses
            </span>
            <button
              onClick={clearFilters}
              className="text-xs text-brand-mint hover:underline font-semibold"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ── Business Cards Grid ── */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-mint/20 border-t-brand-mint rounded-full animate-spin" />
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Loading businesses...
          </p>
        </div>
      ) : organizations.length === 0 ? (
        <div className="py-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-white/20" />
          <h3 className="text-base font-bold text-white">No businesses found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            No verified businesses match your filter criteria. Try searching for broader terms.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {organizations.map((org) => {
            const isVerified = org.isVerified || org.verificationStatus === 'VERIFIED';
            return (
              <div
                key={org._id || org.id}
                className="p-6 rounded-3xl bg-[#111116] border border-white/[0.07] hover:border-brand-mint/30 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                      {org.logo ? (
                        <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-7 h-7 text-brand-mint" />
                      )}
                    </div>

                    {isVerified && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Industry */}
                  <div>
                    <h3 className="font-heading font-bold text-lg text-white group-hover:text-brand-mint transition-colors line-clamp-1">
                      {org.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      {org.type?.replace(/_/g, ' ') || 'Company'} • {org.industry || 'Infrastructure'}
                    </p>
                  </div>

                  {/* Specializations */}
                  {org.infrastructureSpecializations?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {org.infrastructureSpecializations.slice(0, 3).map((spec) => (
                        <span
                          key={spec}
                          className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-semibold text-brand-mint border border-brand-mint/20"
                        >
                          {spec}
                        </span>
                      ))}
                      {org.infrastructureSpecializations.length > 3 && (
                        <span className="text-[10px] text-white/40 self-center">
                          +{org.infrastructureSpecializations.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description snippet */}
                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                    {org.description || 'Specialized infrastructure engineering and development partner.'}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Briefcase className="w-3.5 h-3.5 text-brand-mint" />
                    <span className="font-semibold text-white">
                      {org.activeJobCount || 0} active {org.activeJobCount === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>

                  <Link
                    to={`/businesses/${org.slug}`}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/[0.05] group-hover:bg-brand-mint text-white group-hover:text-black font-bold text-xs transition-all"
                  >
                    <span>View Business</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
