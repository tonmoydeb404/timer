"use client";

import { appPaths, sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signIn } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState<string | null>(
    searchParams.get("error") === "oauth"
      ? "Google sign-in failed. Please try again."
      : null,
  );

  useEffect(() => {
    if (loading || !user) return;
    // Self-heal: a valid SDK session without the routing marker (e.g. from
    // an interrupted sign-in) gets its marker re-issued before entering.
    fetch("/api/auth/session", { method: "POST" }).finally(() => {
      router.replace(appPaths.dashboard);
    });
  }, [loading, user, router]);

  async function handleSignIn() {
    setMessage(null);
    setSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sign-in failed.");
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Checking your session…</p>
    );
  }

  if (user) return null;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Image
            src="/logo.svg"
            alt={`${APP_NAME} logo`}
            width={28}
            height={28}
          />
        </span>
        <CardTitle>Welcome to {APP_NAME}</CardTitle>
        <CardDescription>
          Sign in with Google to manage projects and review your time.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isAppwriteConfigured() ? (
          <Button onClick={handleSignIn} disabled={signingIn} className="h-10">
            {signingIn ? "Redirecting to Google…" : "Continue with Google"}
          </Button>
        ) : (
          <p className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">
            Appwrite is not configured. Set <code>NEXT_PUBLIC_APPWRITE_*</code>{" "}
            and restart.
          </p>
        )}
        {message && (
          <p className="text-center text-sm text-destructive">{message}</p>
        )}
        <Link
          href={sitePaths.home}
          className="text-center text-sm text-muted-foreground hover:text-primary hover:underline"
        >
          Back to home
        </Link>
      </CardContent>
    </Card>
  );
}
