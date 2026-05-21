import {
  createContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import api from "../services/api";

interface AuthContextType {
  user: any;
  setUser: React.Dispatch<
    React.SetStateAction<any>
  >;
  loading: boolean;
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

  useEffect(() => {

    const token =
      localStorage.getItem("token");

    if (token) {

      api.get("/auth/me", {

        headers: {
          Authorization:
            `Bearer ${token}`,
        },

      })

      .then((res) => {
        setUser(res.data.user);
      })

      .catch(() => {
        localStorage.removeItem("token");
      })

      .finally(() => {
        setLoading(false);
      });

    } else {

      setLoading(false);

    }

  }, []);

  return (

    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
      }}
    >

      {children}

    </AuthContext.Provider>

  );

};