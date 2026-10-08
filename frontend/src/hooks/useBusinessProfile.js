import { useQuery } from '@tanstack/react-query';
import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { organizationService } from '../services/organizationService';
import {
  normalizeBusinessProfile,
  normalizeBusinessIdentity,
  isBusinessProfileEligible,
} from '../utils/businessProfile';

/**
 * useBusinessProfile — Reusable hook to access the authenticated user's Business Profile.
 *
 * Rules:
 * 1. Uses existing organizationService.getMyOrganizations().
 * 2. Reuses TanStack React Query cache key ['my-businesses'] (shared with ManageBusiness.jsx)
 *    to prevent duplicate network requests.
 * 3. Only enabled when a valid authenticated user session exists.
 * 4. Yields safe, normalized business data and empty states when no business is available.
 */
export function useBusinessProfile({ enabled = true } = {}) {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const isAuthenticated = Boolean(user?.id || user?.userId || user?._id);

  const {
    data: rawBusinesses = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => organizationService.getMyOrganizations(),
    enabled: Boolean(enabled && isAuthenticated),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  const businesses = useMemo(() => {
    if (!Array.isArray(rawBusinesses)) return [];
    return rawBusinesses
      .map(normalizeBusinessProfile)
      .filter(Boolean);
  }, [rawBusinesses]);

  const activeRawBusiness = Array.isArray(rawBusinesses) && rawBusinesses.length > 0 ? rawBusinesses[0] : null;
  const business = useMemo(() => normalizeBusinessProfile(activeRawBusiness), [activeRawBusiness]);
  const businessIdentity = useMemo(() => normalizeBusinessIdentity(activeRawBusiness), [activeRawBusiness]);
  const isEligible = useMemo(() => isBusinessProfileEligible(activeRawBusiness), [activeRawBusiness]);

  const hasBusiness = Boolean(business && business.id);

  return {
    hasBusiness,
    isEligible,
    business,
    businessIdentity,
    businesses,
    rawBusiness: activeRawBusiness,
    rawBusinesses,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}

export default useBusinessProfile;
