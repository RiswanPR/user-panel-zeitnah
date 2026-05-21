import {
  createContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import api
from "../services/api";

interface AuthContextType {

  user: any;

  setUser: React.Dispatch<
    React.SetStateAction<any>
  >;

  loading: boolean;

  logout: () => void;

}

interface AuthProviderProps {

  children: ReactNode;

}

export const AuthContext =
  createContext<AuthContextType | null>(
    null
  );

export const AuthProvider = ({
  children,
}: AuthProviderProps) => {

  const [user, setUser] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  // AUTO LOGIN
  useEffect(() => {

    const loadUser =
      async () => {

        try {

          const token =
            localStorage.getItem(
              "token"
            );

          if (!token) {

            setLoading(false);

            return;

          }

          // TOKEN automatically
          // added by interceptor
          const res =
            await api.get(
              "/auth/me"
            );

          setUser(
            res.data.user
          );

        } catch (error) {

          localStorage.removeItem(
            "token"
          );

          setUser(null);

        } finally {

          setLoading(false);

        }

      };

    loadUser();

  }, []);

  // LOGOUT
  const logout = () => {

    localStorage.removeItem(
      "token"
    );

    setUser(null);

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