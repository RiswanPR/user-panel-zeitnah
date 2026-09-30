import {
  createContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "../services/api";
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
    // Fast synchronous initial hydration from JWT access token if available
    try {
      const token = storage.getAccessToken();
      if (!token) return null;
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
        const token = storage.getAccessToken();

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

  const updateUser = (fields: Record<string, any>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      if (updated.primaryRole) {
        updated.primaryRole = normalizeUserRole(updated);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
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