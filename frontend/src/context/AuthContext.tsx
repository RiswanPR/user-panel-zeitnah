import {
  createContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api, { getRefreshedToken } from "../services/api";
import storage from "../services/storage";
import queryClient from "../services/queryClient";
import nativeNotifications from "../native/notifications";
import LogoutConfirmModal from "../components/common/LogoutConfirmModal";
import { normalizeUserRole } from "../utils/roleNavigation";

export interface AuthUser {
  id?: string;
  userId?: string;
  name?: string;
  email: string;
  username?: string;
  usernameClaimed?: boolean;
  usernameChangedAt?: Date | string | null;
  primaryRole: string;
  role: string;
  deviceId?: string;
  userVerification?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  updateUser: (fields: Record<string, any>) => void;
  loading: boolean;
  logout: () => void;
  requestLogout: () => void;
  cancelLogout: () => void;
  confirmLogout: () => Promise<void>;
  isLogoutConfirmOpen: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextType | null>(null);

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Fast synchronous initial hydration from JWT access token if available and NOT expired
    try {
      const token = storage.getAccessToken();
      if (!token) return null;
      if (storage.isAccessTokenExpired()) return null;
      const payload = parseJwtPayload(token);
      if (!payload || !payload.userId) return null;
      const primaryRole = normalizeUserRole(payload.primaryRole || payload.role);
      return {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email || "",
        primaryRole,
        role: payload.role || "student",
        deviceId: payload.deviceId,
      };
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // AUTO LOGIN
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        let token = storage.getAccessToken();

        // If access token is missing or expired, attempt refresh if refresh token exists
        if ((!token || storage.isAccessTokenExpired()) && storage.getRefreshToken()) {
          try {
            token = await getRefreshedToken();
          } catch {
            // Refresh failed permanently
            token = null;
          }
        }

        if (!token) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Authoritative user profile hydration via /auth/me
        const res = await api.get("/auth/me");
        if (mounted) {
          const authUser = res.data?.user;
          if (authUser) {
            authUser.primaryRole = normalizeUserRole(authUser);
            // Enrich with authoritative profile data (signed avatar, name, username)
            try {
              const profileRes = await api.get("/profile/me");
              const profileUser = profileRes.data?.user || profileRes.data?.profile;
              if (profileUser) {
                if (profileUser.avatar) authUser.avatar = profileUser.avatar;
                else if (profileUser.profilePicture) authUser.avatar = profileUser.profilePicture;
                else if (profileUser.avatarUrl) authUser.avatar = profileUser.avatarUrl;
                if (profileUser.name && !authUser.name) authUser.name = profileUser.name;
                if (profileUser.username && !authUser.username) authUser.username = profileUser.username;
              }
            } catch {
              // Non-blocking: fallback to core authUser
            }
            setUser(authUser);
          } else {
            setUser(null);
          }
          // Sync push token with backend if device is registered
          nativeNotifications.registerForPushNotifications().catch(() => {});
        }
      } catch (error) {
        storage.clearAuth();
        queryClient.clear();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    // Listen to unified logout events across the application
    const handleAuthLogout = () => {
      nativeNotifications.removePushTokenFromBackend().catch(() => {});
      queryClient.clear();
      setUser(null);
    };

    window.addEventListener("zeitnah:auth:logout", handleAuthLogout);

    return () => {
      mounted = false;
      window.removeEventListener("zeitnah:auth:logout", handleAuthLogout);
    };
  }, []);

  // LOGOUT (Programmatic / Direct)
  const logout = async () => {
    try {
      // Unregister push token while access token is still authenticated
      await nativeNotifications.removePushTokenFromBackend().catch(() => {});
      await api.post("/auth/logout").catch(() => {});
    } catch {
      // Ignore background push token cleanup errors
    } finally {
      storage.clearAuth();
      queryClient.clear();
      setUser(null);
    }
  };

  // User-initiated logout workflow with confirmation
  const requestLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const cancelLogout = () => {
    if (isLoggingOut) return;
    setIsLogoutConfirmOpen(false);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
    }
  };

  const setAuthUser: React.Dispatch<React.SetStateAction<AuthUser | null>> = (value) => {
    setUser((prev) => {
      const next = typeof value === "function" ? (value as (prev: AuthUser | null) => AuthUser | null)(prev) : value;
      if (!next) return null;
      return {
        ...next,
        primaryRole: normalizeUserRole(next),
      };
    });
  };

  const updateUser = (fields: Record<string, any>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      if (updated.primaryRole || updated.role) {
        updated.primaryRole = normalizeUserRole(updated);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: setAuthUser,
        updateUser,
        loading,
        logout,
        requestLogout,
        cancelLogout,
        confirmLogout,
        isLogoutConfirmOpen,
      }}
    >
      {children}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        isLoggingOut={isLoggingOut}
        user={user}
      />
    </AuthContext.Provider>
  );
};