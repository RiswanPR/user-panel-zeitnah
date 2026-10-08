import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import useBusinessProfile from '../hooks/useBusinessProfile';
import { AuthContext } from './AuthContext';
import storage from '../services/storage';

export const ActiveProfileContext = createContext(null);

const STORAGE_KEY_PREFIX = 'zeitnah_active_profile_mode_';

/**
 * ActiveProfileProvider — Phase 2 Personal ↔ Business Profile Switcher Context
 *
 * Requirements:
 * 1. Default activeProfileMode is strictly 'personal'.
 * 2. Allows safe switching between 'personal' and 'business' identities for authenticated users with eligible businesses.
 * 3. Never permits switching to business if no eligible business exists or if business is suspended/rejected.
 * 4. Automatically falls back to 'personal' if business becomes unavailable or on logout.
 * 5. Reuses Phase 1 useBusinessProfile() and React Query cache without creating new requests.
 */
export function ActiveProfileProvider({ children }) {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const currentUserId = user?.id || user?.userId || user?._id;

  const {
    hasBusiness,
    isEligible,
    business,
    businessIdentity,
    businesses,
    isLoading,
    isError,
    error,
    refetch,
  } = useBusinessProfile();

  const storageKey = currentUserId ? `${STORAGE_KEY_PREFIX}${currentUserId}` : null;

  // Initial state: default strictly to 'personal'
  const [activeProfileMode, setActiveProfileMode] = useState('personal');

  // Sync / hydrate from storage on mount or when user changes
  useEffect(() => {
    if (!currentUserId || !storageKey) {
      setActiveProfileMode('personal');
      return;
    }

    try {
      const persisted = storage.getItem(storageKey);
      if (persisted === 'business' && hasBusiness && isEligible && business) {
        setActiveProfileMode('business');
      } else {
        setActiveProfileMode('personal');
      }
    } catch {
      setActiveProfileMode('personal');
    }
  }, [currentUserId, storageKey, hasBusiness, isEligible, business]);

  // Automatic safety fallback: If business is no longer eligible, revert to personal
  useEffect(() => {
    if (activeProfileMode === 'business') {
      if (!isLoading && (!hasBusiness || !isEligible || !business)) {
        setActiveProfileMode('personal');
        if (storageKey) {
          try {
            storage.setItem(storageKey, 'personal');
          } catch {}
        }
      }
    }
  }, [activeProfileMode, hasBusiness, isEligible, business, isLoading, storageKey]);

  // Handle cross-tab or global logout cleanup
  useEffect(() => {
    const handleLogout = () => {
      setActiveProfileMode('personal');
      if (storageKey) {
        try {
          storage.removeItem(storageKey);
        } catch {}
      }
    };

    window.addEventListener('zeitnah:auth:logout', handleLogout);
    return () => window.removeEventListener('zeitnah:auth:logout', handleLogout);
  }, [storageKey]);

  // Switch to business identity
  const switchToBusiness = useCallback(() => {
    if (!hasBusiness || !isEligible || !business) {
      return false;
    }
    setActiveProfileMode('business');
    if (storageKey) {
      try {
        storage.setItem(storageKey, 'business');
      } catch {}
    }
    return true;
  }, [hasBusiness, isEligible, business, storageKey]);

  // Switch to personal identity
  const switchToPersonal = useCallback(() => {
    setActiveProfileMode('personal');
    if (storageKey) {
      try {
        storage.setItem(storageKey, 'personal');
      } catch {}
    }
  }, [storageKey]);

  // Toggle helper
  const toggleProfileMode = useCallback(() => {
    if (activeProfileMode === 'personal') {
      return switchToBusiness();
    } else {
      switchToPersonal();
      return true;
    }
  }, [activeProfileMode, switchToBusiness, switchToPersonal]);

  const hasBusinessProfile = Boolean(hasBusiness && isEligible && business);

  const contextValue = useMemo(
    () => ({
      activeProfileMode,
      isPersonalMode: activeProfileMode === 'personal',
      isBusinessMode: activeProfileMode === 'business',
      hasBusinessProfile,
      hasBusiness,
      isEligible,
      business,
      businessIdentity,
      businesses,
      switchToPersonal,
      switchToBusiness,
      toggleProfileMode,
      isLoading,
      isError,
      error,
      refetchBusiness: refetch,
    }),
    [
      activeProfileMode,
      hasBusinessProfile,
      hasBusiness,
      isEligible,
      business,
      businessIdentity,
      businesses,
      switchToPersonal,
      switchToBusiness,
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
      activeProfileMode: 'personal',
      isPersonalMode: true,
      isBusinessMode: false,
      hasBusinessProfile: false,
      hasBusiness: false,
      isEligible: false,
      business: null,
      businessIdentity: null,
      businesses: [],
      switchToPersonal: () => {},
      switchToBusiness: () => false,
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
