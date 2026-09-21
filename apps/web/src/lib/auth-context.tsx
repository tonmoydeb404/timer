"use client";

import type { Models } from "appwrite";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { appPaths } from "@/config/paths-config";
import { getAccount, signInWithGoogle } from "./appwrite";

type AuthContextValue = {
  loading: boolean;
  user: Models.User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Models.User | null>(null);

  const refresh = useCallback(async () => {
    const account = getAccount();
    if (!account) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await account.get());
    } catch {
      setUser(null);
      // Session is gone but the routing marker may remain — clear it so the
      // next navigation bounces to /login instead of looping here.
      try {
        await fetch("/api/auth/session", { method: "DELETE" });
      } catch {
        // Best-effort only.
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    const account = getAccount();
    if (account) {
      try {
        await account.deleteSession("current");
      } catch {
        // Session already gone server-side — still clear local state.
      }
    }
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // Marker clear is best-effort; proxy falls back to client redirect.
    }
    setUser(null);
    router.push(appPaths.login);
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ loading, user, signIn, signOut, refresh }),
    [loading, user, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
