"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { appPaths } from "@/config/paths-config";

// Bridge for desktop OAuth: Appwrite only redirects to registered https
// origins, so the desktop flow lands here first and hops to the app's
// `tymar://` scheme, which the OS routes back to the desktop client.
const DESKTOP_SCHEME_URL = "tymar://auth";

export function DesktopBridge() {
  const searchParams = useSearchParams();
  const [forwarded, setForwarded] = useState(false);
  const [copied, setCopied] = useState(false);

  const deepLink = useMemo(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");
    if (!userId || !secret) return null;
    const url = new URL(DESKTOP_SCHEME_URL);
    url.searchParams.set("userId", userId);
    url.searchParams.set("secret", secret);
    return url.toString();
  }, [searchParams]);

  useEffect(() => {
    if (!deepLink || forwarded) return;
    setForwarded(true);
    window.location.href = deepLink;
  }, [deepLink, forwarded]);

  async function copyLink() {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!deepLink) {
    return (
      <div className="grid max-w-sm gap-3 text-center">
        <p className="text-sm font-medium">Sign-in didn&apos;t complete</p>
        <p className="text-sm text-muted-foreground">
          The sign-in was cancelled or arrived without credentials.
        </p>
        <Link
          href={appPaths.login}
          className="text-sm text-primary hover:underline"
        >
          Back to sign-in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid max-w-md gap-3 text-center">
      <p className="text-sm text-muted-foreground">
        Signed in — returning you to the Timer app…
      </p>
      <a
        href={deepLink}
        className="text-sm text-primary hover:underline"
      >
        Click here if the app doesn&apos;t open
      </a>
      <div className="grid gap-2 rounded-lg border border-border p-3 text-left">
        <p className="text-xs text-muted-foreground">
          Testing a dev build that can&apos;t receive the link? Copy it and
          paste it into the desktop sign-in screen.
        </p>
        <input
          value={deepLink}
          readOnly
          onFocus={(e) => e.target.select()}
          aria-label="Desktop sign-in link"
          className="h-9 w-full rounded-md border border-input bg-muted px-3 font-mono text-[11px] text-foreground"
        />
        <button
          type="button"
          onClick={copyLink}
          className="justify-self-start text-sm text-primary hover:underline"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
