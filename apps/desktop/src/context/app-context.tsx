import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { api, onUpdateAvailable } from "../lib/api";
import { signInWithGoogle } from "../lib/oauth";
import type { AuthState, UpdateInfo } from "../types";

type SignInResult = { ok: true } | { ok: false; message: string };

type AppContextValue = {
  loading: boolean;
  error: string | null;

  auth: AuthState | null;
  signingIn: boolean;
  signIn: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;

  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => Promise<void>;

  updateInfo: UpdateInfo | null;
  isInstallingUpdate: boolean;
  dismissUpdate: () => void;
  installUpdate: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);

  // ---- Data loading ----

  const refreshAuth = useCallback(async () => {
    try {
      setAuth(await api.getAuthState());
    } catch {
      setAuth({ configured: true, status: "unknown", user: null });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const backendSettings = await api.getSettings();
        if (cancelled) return;
        setSettings(backendSettings);
        await refreshAuth();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshAuth]);

  // ---- Event listeners ----

  useEffect(() => {
    const unlistenUpdatePromise = onUpdateAvailable((payload) => {
      setUpdateInfo(payload);
    });

    return () => {
      unlistenUpdatePromise.then((fn) => fn());
    };
  }, []);

  // ---- Auth ----

  const signIn = useCallback(async (): Promise<SignInResult> => {
    setSigningIn(true);
    try {
      const outcome = await signInWithGoogle();
      if (outcome.kind !== "success") {
        // "closed" is not an error worth alarming the user about.
        if (outcome.kind === "closed") return { ok: false, message: "" };
        return { ok: false, message: outcome.message };
      }
      await api.setSession(outcome.userId, outcome.secret);
      await refreshAuth();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    } finally {
      setSigningIn(false);
    }
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } catch (err) {
      toast.error("Failed to sign out", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      await refreshAuth();
    }
  }, [refreshAuth]);

  // ---- Settings ----

  const updateSetting = useCallback(async (key: string, value: string) => {
    await api.setSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ---- Updater ----

  const dismissUpdate = useCallback(() => setUpdateInfo(null), []);

  const installUpdate = useCallback(async () => {
    setIsInstallingUpdate(true);
    try {
      await api.installUpdate();
    } catch (err) {
      toast.error("Failed to install update", {
        description: err instanceof Error ? err.message : String(err),
      });
      setIsInstallingUpdate(false);
    }
  }, []);

  const value: AppContextValue = {
    loading,
    error,
    auth,
    signingIn,
    signIn,
    signOut,
    refreshAuth,
    settings,
    updateSetting,
    updateInfo,
    isInstallingUpdate,
    dismissUpdate,
    installUpdate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (context === null) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
}
