"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { appPaths } from "@/config/paths-config";
import { useAuth } from "@/lib/auth-context";
import { getAccount } from "@/lib/appwrite";

// Handles both flows:
// - Web login: Appwrite already set the session cookie on redirect; the
//   `account.get()` below succeeds and we forward to /dashboard.
// - Desktop OAuth window: the window URL (with userId+secret) is intercepted
//   by the Tauri app itself; this page is just a friendly landing.
export function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [message, setMessage] = useState("Finishing sign-in…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function finish() {
      const account = getAccount();
      if (!account) {
        setMessage("Appwrite is not configured.");
        return;
      }

      const userId = searchParams.get("userId");
      const secret = searchParams.get("secret");
      if (userId && secret) {
        try {
          await account.createSession({ userId, secret });
        } catch {
          // Session may already exist (cookie flow) — fall through to get().
        }
      }

      try {
        await account.get();
        await refresh();
        // Mark this browser as authenticated for proxy.ts, then enter.
        await fetch("/api/auth/session", { method: "POST" });
        router.replace(appPaths.dashboard);
      } catch {
        setMessage("Sign-in didn't complete. Please try again.");
      }
    }

    void finish();
  }, [router, searchParams, refresh]);

  return (
    <div className="grid max-w-sm gap-3 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href={appPaths.login}
        className="text-sm text-primary hover:underline"
      >
        Back to sign-in
      </Link>
    </div>
  );
}
