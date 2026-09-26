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

interface AuthContextType {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any>(null);
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
          if (mounted) setLoading(false);
          return;
        }

        // TOKEN automatically added by interceptor
        const res = await api.get("/auth/me");
        if (mounted) {
          setUser(res.data.user);
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
    setUser((prev: any) => (prev ? { ...prev, ...fields } : prev));
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