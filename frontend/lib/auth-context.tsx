"use client";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "./api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  accessToken: string;
  homeAddress?: string | null;
};

type AuthUserInput = {
  id?: number | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  homeAddress?: string | null;
  accessToken: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  initialized: boolean;
  setAuthenticatedUser: (user: AuthUserInput) => void;
  logout: () => Promise<void>;
};

type StoredAuthUser = Partial<AuthUser> & { accessToken?: string };

const STORAGE_KEY = "fatih_auth_user";
const TOKEN_KEY = "token";
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const decodeToken = (
  token: string,
): { userId?: number; email?: string; role?: string } | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(
      typeof atob === "function"
        ? atob(payload)
        : Buffer.from(payload, "base64").toString("utf8"),
    ) as { sub?: number; email?: string; role?: string };
    return { userId: decoded.sub, email: decoded.email, role: decoded.role };
  } catch (error) {
    console.warn("Failed to decode auth token", error);
    return null;
  }
};

const normalizeUser = (candidate: StoredAuthUser | null): AuthUser | null => {
  if (!candidate?.accessToken) return null;
  const decoded = decodeToken(candidate.accessToken);
  const id = candidate.id ?? decoded?.userId;
  const email = candidate.email ?? decoded?.email ?? "";
  if (!id || !email) return null;
  const role = candidate.role ?? decoded?.role ?? "customer";
  return {
    id,
    email,
    name: candidate.name ?? email,
    role,
    accessToken: candidate.accessToken,
  };
};

const readStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuthUser;
    return normalizeUser(parsed);
  } catch (error) {
    console.warn("Failed to parse stored user", error);
    return null;
  }
};

const persistUser = (nextUser: AuthUser | null) => {
  if (typeof window === "undefined") return;
  if (!nextUser) {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  window.localStorage.setItem(TOKEN_KEY, nextUser.accessToken);
};

const resolveUser = (input: AuthUserInput): AuthUser => {
  const decoded = input.accessToken ? decodeToken(input.accessToken) : null;
  const id = input.id ?? decoded?.userId;
  const email = input.email ?? decoded?.email ?? "";
  if (!input.accessToken || !id || !email) {
    throw new Error("Invalid authentication payload");
  }
  const role = input.role ?? decoded?.role ?? "customer";
  return {
    id,
    email,
    name: input.name ?? email,
    role,
    accessToken: input.accessToken,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = readStoredUser();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(stored);
    }
    setInitialized(true);
  }, []);

  const setAuthenticatedUser = useCallback((nextUser: AuthUserInput) => {
    const resolved = resolveUser(nextUser);
    setUser(resolved);
    persistUser(resolved);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (user.name && user.name !== user.email) return;
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const profile = await api.get<{ name?: string; email?: string; homeAddress?: string | null }>(
          `/users/${user.id}`,
        );
        if (cancelled) return;
        const next: AuthUser = {
          ...user,
          name: profile.name ?? user.name,
          email: profile.email ?? user.email,
          homeAddress: profile.homeAddress ?? user.homeAddress,
        };
        setUser(next);
        persistUser(next);
      } catch (error) {
        console.warn("Failed to load user profile", error);
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
    persistUser(null);
    
    // Redirect to home page after logout
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      initialized,
      setAuthenticatedUser,
      logout,
    }),
    [user, initialized, setAuthenticatedUser, logout],
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
