import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { api, onDeepLinkEvent, onUpdateAvailable } from "../lib/api";
import {
  OAUTH_CALLBACK_URL,
  getAccount,
  googleLoginUrl,
  isAppwriteConfigured,
} from "../lib/appwrite";
import type { AuthState, AuthUser, UpdateInfo } from "../types";

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

function toUser(data: { $id: string; name: string; email: string }): AuthUser {
  return { id: data.$id, name: data.name, email: data.email };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);

  // ---- Auth (Appwrite SDK session, per the official OAuth guide) ----

  const refreshAuth = useCallback(async () => {
    const account = getAccount();
    if (!account) {
      setAuth({ configured: false, status: "unknown", user: null });
      return;
    }
    try {
      const me = await account.get();
      setAuth({ configured: true, status: "active", user: toUser(me) });
    } catch (err) {
      const status = (err as { code?: number })?.code === 401 ? 401 : 0;
      setAuth({
        configured: true,
        status: status === 401 ? "expired" : "unknown",
        user: null,
      });
    }
  }, []);

  const handleAuthUrls = useCallback(
    async (urls: string[]) => {
      for (const raw of urls) {
        if (!raw.startsWith(OAUTH_CALLBACK_URL)) continue;
        let userId: string | null = null;
        let secret: string | null = null;
        try {
          const parsed = new URL(raw);
          userId = parsed.searchParams.get("userId");
          secret = parsed.searchParams.get("secret");
        } catch {
          continue;
        }
        if (!userId || !secret) {
          toast.error("Google sign-in failed or was cancelled.");
          setSigningIn(false);
          continue;
        }
        const account = getAccount();
        if (!account) {
          toast.error("Appwrite is not configured.");
          setSigningIn(false);
          continue;
        }
        try {
          await account.createSession({ userId, secret });
          await refreshAuth();
          toast.success("Signed in.");
        } catch (err) {
          toast.error("Couldn't finish sign-in.", {
            description: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setSigningIn(false);
        }
      }
    },
    [refreshAuth],
  );

  // ---- Data loading ----

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const backendSettings = await api.getSettings();
        if (cancelled) return;
        setSettings(backendSettings);
        await refreshAuth();
        // Cold start via deep link (app launched by the OAuth redirect).
        const current = await getCurrent().catch(() => null);
        if (!cancelled && current && current.length > 0) {
          await handleAuthUrls(current);
        }
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
  }, [refreshAuth, handleAuthUrls]);

  // ---- Event listeners ----

  useEffect(() => {
    const unlistenUpdatePromise = onUpdateAvailable((payload) => {
      setUpdateInfo(payload);
    });
    const unlistenUrlPromise = onOpenUrl((urls) => {
      void handleAuthUrls(urls);
    });
    const unlistenDeepLinkPromise = onDeepLinkEvent((urls) => {
      void handleAuthUrls(urls);
    });

    return () => {
      unlistenUpdatePromise.then((fn) => fn());
      unlistenUrlPromise.then((fn) => fn());
      unlistenDeepLinkPromise.then((fn) => fn());
    };
  }, [handleAuthUrls]);

  // ---- Auth actions ----

  const signIn = useCallback(async (): Promise<SignInResult> => {
    if (!isAppwriteConfigured()) {
      return { ok: false, message: "Appwrite is not configured." };
    }
    setSigningIn(true);
    try {
      await openUrl(googleLoginUrl());
      toast.info("Continue in your browser to finish sign-in.");
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSigningIn(false);
      return { ok: false, message };
    }
  }, []);

  const signOut = useCallback(async () => {
    const account = getAccount();
    try {
      if (account) await account.deleteSession("current");
    } catch (err) {
      toast.error("Failed to sign out", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSigningIn(false);
    }
    await refreshAuth();
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
