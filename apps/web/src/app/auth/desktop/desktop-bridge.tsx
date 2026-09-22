"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { appPaths } from "@/config/paths-config";

// Bridge for desktop OAuth: Appwrite only redirects to registered https
// origins, so the desktop flow lands here first and hops to the app's
// `timer://` scheme, which the OS routes back to the desktop client.
const DESKTOP_SCHEME_URL = "timer://auth";

export function DesktopBridge() {
  const searchParams = useSearchParams();
  const [forwarded, setForwarded] = useState(false);

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
    <div className="grid max-w-sm gap-3 text-center">
      <p className="text-sm text-muted-foreground">
        Signed in — returning you to the Timer app…
      </p>
      <a
        href={deepLink}
        className="text-sm text-primary hover:underline"
      >
        Click here if the app doesn&apos;t open
      </a>
    </div>
  );
}
