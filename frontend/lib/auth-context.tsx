"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type AuthUser = {
  name: string;
  email: string;
  accessToken?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  setAuthenticatedUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "fatih_auth_user";
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && typeof parsed.name === "string" && typeof parsed.email === "string") {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to parse stored user", error);
  }
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  useEffect(() => {
    // Ensure we hydrate the context once the client is ready
    if (user === null) {
      const stored = readStoredUser();
      if (stored) {
        setUser(stored);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAuthenticatedUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    }
  }, []);

  const logout = useCallback(async () => {
    const accessToken = user?.accessToken;
    if (accessToken) {
      try {
        await fetch(`${backendUrl}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        console.error("Logout request failed", error);
      }
    }

    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      setAuthenticatedUser,
      logout,
    }),
    [user, setAuthenticatedUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
