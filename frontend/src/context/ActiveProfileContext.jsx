import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import useBusinessProfile from '../hooks/useBusinessProfile';
import { AuthContext } from './AuthContext';
import storage from '../services/storage';
import {
  findBusinessById,
  isBusinessProfileEligible,
  normalizeBusinessIdentity,
} from '../utils/businessProfile';

export const ActiveProfileContext = createContext(null);

const STORAGE_KEY_PREFIX = 'zeitnah_active_profile_';
const LEGACY_STORAGE_KEY_PREFIX = 'zeitnah_active_profile_mode_';

/**
 * ActiveProfileProvider — Phase 2.5 Multi-Business Profile Active Context
 *
 * Requirements:
 * 1. Exactly ONE active profile at a time (Personal OR specific Business).
 * 2. Active profile state represented by activeProfileType ('personal' | 'business')
 *    and activeBusinessId (null | string).
 * 3. Supports explicit switching between Personal and any eligible business owned/managed by user.
 * 4. Only organizations verified as eligible and present in authorized endpoint can become active.
 * 5. Automatic safety fallback to Personal if active business is suspended, rejected, or removed.
 * 6. User-namespaced persistence ensures no identity leaks between user sessions.
 */
export function ActiveProfileProvider({ children }) {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const currentUserId = user?.id || user?.userId || user?._id;

  const {
    businesses: allNormalizedBusinesses,
    primaryBusiness,
    isLoading,
    isError,
    error,
    refetch,
  } = useBusinessProfile();

  // All eligible businesses available for profile switching
  const businesses = useMemo(() => {
    if (!Array.isArray(allNormalizedBusinesses)) return [];
    return allNormalizedBusinesses.filter(isBusinessProfileEligible);
  }, [allNormalizedBusinesses]);

  const hasBusinessProfile = businesses.length > 0;

  const storageKey = currentUserId ? `${STORAGE_KEY_PREFIX}${currentUserId}` : null;
  const legacyStorageKey = currentUserId ? `${LEGACY_STORAGE_KEY_PREFIX}${currentUserId}` : null;

  // Active state: exactly one profile active
  const [activeProfileType, setActiveProfileType] = useState('personal');
  const [activeBusinessId, setActiveBusinessId] = useState(null);

  // Sync / hydrate from storage on mount or when user/businesses change
  useEffect(() => {
    if (!currentUserId || !storageKey) {
      setActiveProfileType('personal');
      setActiveBusinessId(null);
      return;
    }

    try {
      let persisted = storage.getItem(storageKey);

      // Fallback check for legacy storage key from Phase 2
      if (!persisted && legacyStorageKey) {
        const legacyVal = storage.getItem(legacyStorageKey);
        if (legacyVal === 'business' && hasBusinessProfile) {
          persisted = { type: 'business', businessId: businesses[0]?.id };
        }
      }

      if (typeof persisted === 'string') {
        try {
          persisted = JSON.parse(persisted);
        } catch {
          // If stored as plain string 'business' or 'personal'
          if (persisted === 'business' && hasBusinessProfile) {
            persisted = { type: 'business', businessId: businesses[0]?.id };
          } else {
            persisted = { type: 'personal', businessId: null };
          }
        }
      }

      if (persisted?.type === 'business' && persisted?.businessId) {
        const matchingBiz = findBusinessById(businesses, persisted.businessId);
        if (matchingBiz) {
          setActiveProfileType('business');
          setActiveBusinessId(matchingBiz.id);
          return;
        }
        // If persisted businessId does NOT match any eligible business, fall back safely to personal!
        setActiveProfileType('personal');
        setActiveBusinessId(null);
        try {
          storage.setItem(storageKey, JSON.stringify({ type: 'personal', businessId: null }));
        } catch {}
      } else {
        setActiveProfileType('personal');
        setActiveBusinessId(null);
      }
    } catch {
      setActiveProfileType('personal');
      setActiveBusinessId(null);
    }
  }, [currentUserId, storageKey, legacyStorageKey, businesses, hasBusinessProfile]);

  // Automatic safety fallback: If currently in business mode, but active business is no longer available/eligible
  useEffect(() => {
    if (activeProfileType === 'business') {
      if (!isLoading) {
        if (!activeBusinessId || !findBusinessById(businesses, activeBusinessId)) {
          setActiveProfileType('personal');
          setActiveBusinessId(null);
          if (storageKey) {
            try {
              storage.setItem(storageKey, JSON.stringify({ type: 'personal', businessId: null }));
            } catch {}
          }
        }
      }
    }
  }, [activeProfileType, activeBusinessId, businesses, isLoading, storageKey]);

  // Handle cross-tab or global logout cleanup
  useEffect(() => {
    const handleLogout = () => {
      setActiveProfileType('personal');
      setActiveBusinessId(null);
      if (storageKey) {
        try {
          storage.removeItem(storageKey);
        } catch {}
      }
      if (legacyStorageKey) {
        try {
          storage.removeItem(legacyStorageKey);
        } catch {}
      }
    };

    window.addEventListener('zeitnah:auth:logout', handleLogout);
    return () => window.removeEventListener('zeitnah:auth:logout', handleLogout);
  }, [storageKey, legacyStorageKey]);

  // Switch to a specific business by ID (or primary if not specified)
  const switchToBusiness = useCallback(
    (requestedBusinessId) => {
      if (!hasBusinessProfile || businesses.length === 0) {
        return false;
      }

      // If specific ID requested, validate it exists in eligible businesses
      let targetBiz = null;
      if (requestedBusinessId) {
        targetBiz = findBusinessById(businesses, requestedBusinessId);
      } else {
        // Fallback for backward compatibility (pick currently selected or primary)
        targetBiz = (activeBusinessId && findBusinessById(businesses, activeBusinessId)) || businesses[0];
      }

      if (!targetBiz) {
        return false;
      }

      setActiveProfileType('business');
      setActiveBusinessId(targetBiz.id);

      if (storageKey) {
        try {
          storage.setItem(
            storageKey,
            JSON.stringify({ type: 'business', businessId: targetBiz.id })
          );
        } catch {}
      }
      return true;
    },
    [businesses, hasBusinessProfile, activeBusinessId, storageKey]
  );

  // Switch to personal identity
  const switchToPersonal = useCallback(() => {
    setActiveProfileType('personal');
    setActiveBusinessId(null);

    if (storageKey) {
      try {
        storage.setItem(
          storageKey,
          JSON.stringify({ type: 'personal', businessId: null })
        );
      } catch {}
    }
    return true;
  }, [storageKey]);

  // Generalized switchProfile
  const switchProfile = useCallback(
    (profile) => {
      if (!profile || profile === 'personal' || profile?.type === 'personal') {
        return switchToPersonal();
      }
      const bId = typeof profile === 'string' ? profile : (profile?.businessId || profile?.id);
      return switchToBusiness(bId);
    },
    [switchToPersonal, switchToBusiness]
  );

  // Toggle helper
  const toggleProfileMode = useCallback(() => {
    if (activeProfileType === 'personal') {
      return switchToBusiness();
    } else {
      return switchToPersonal();
    }
  }, [activeProfileType, switchToBusiness, switchToPersonal]);

  // Currently active business object
  const activeBusiness = useMemo(() => {
    if (activeProfileType !== 'business' || !activeBusinessId) {
      return null;
    }
    return findBusinessById(businesses, activeBusinessId);
  }, [activeProfileType, activeBusinessId, businesses]);

  // Currently active business identity
  const businessIdentity = useMemo(() => {
    if (!activeBusiness) return null;
    return normalizeBusinessIdentity(activeBusiness);
  }, [activeBusiness]);

  const contextValue = useMemo(
    () => ({
      // Profile Model
      activeProfileType,
      activeProfileMode: activeProfileType, // Backward-compat alias
      activeBusinessId,
      isPersonalMode: activeProfileType === 'personal',
      isBusinessMode: activeProfileType === 'business',

      // Business Entities
      business: activeBusiness,
      businessIdentity,
      businesses, // all eligible businesses
      allBusinesses: allNormalizedBusinesses || [],
      primaryBusiness: primaryBusiness || businesses[0] || null,
      hasBusinessProfile,
      hasBusiness: hasBusinessProfile, // Backward-compat alias
      isEligible: Boolean(activeBusiness && isBusinessProfileEligible(activeBusiness)),

      // Switching Actions
      switchToPersonal,
      switchToBusiness,
      switchProfile,
      toggleProfileMode,

      // Async Query State
      isLoading,
      isError,
      error,
      refetchBusiness: refetch,
    }),
    [
      activeProfileType,
      activeBusinessId,
      activeBusiness,
      businessIdentity,
      businesses,
      allNormalizedBusinesses,
      primaryBusiness,
      hasBusinessProfile,
      switchToPersonal,
      switchToBusiness,
      switchProfile,
      toggleProfileMode,
      isLoading,
      isError,
      error,
      refetch,
    ]
  );

  return (
    <ActiveProfileContext.Provider value={contextValue}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

/**
 * Custom hook to safely consume ActiveProfileContext.
 */
export function useActiveProfile() {
  const context = useContext(ActiveProfileContext);
  if (!context) {
    // Graceful fallback for isolated test environments
    return {
      activeProfileType: 'personal',
      activeProfileMode: 'personal',
      activeBusinessId: null,
      isPersonalMode: true,
      isBusinessMode: false,
      hasBusinessProfile: false,
      hasBusiness: false,
      isEligible: false,
      business: null,
      businessIdentity: null,
      businesses: [],
      allBusinesses: [],
      primaryBusiness: null,
      switchToPersonal: () => true,
      switchToBusiness: () => false,
      switchProfile: () => false,
      toggleProfileMode: () => false,
      isLoading: false,
      isError: false,
      error: null,
      refetchBusiness: () => Promise.resolve(),
    };
  }
  return context;
}

export default ActiveProfileContext;
