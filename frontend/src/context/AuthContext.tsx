import {
  createContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "../services/api";
import storage from "../services/storage";
import nativeNotifications from "../native/notifications";

interface AuthContextType {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  loading: boolean;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      setUser(null);
    };

    window.addEventListener("zeitnah:auth:logout", handleAuthLogout);

    return () => {
      mounted = false;
      window.removeEventListener("zeitnah:auth:logout", handleAuthLogout);
    };
  }, []);

  // LOGOUT
  const logout = async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
      await nativeNotifications.removePushTokenFromBackend().catch(() => {});
    } catch {
      // Ignore background push token cleanup errors
    } finally {
      storage.clearAuth();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};