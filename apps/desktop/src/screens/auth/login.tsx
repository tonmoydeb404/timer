import { Button } from "@packages/ui/components/button";
import { Timer } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/app-context";
import { brand } from "@/lib/brand";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function LoginScreen() {
  const { auth, signingIn, signIn } = useApp();
  const [message, setMessage] = useState<string | null>(null);

  const configured = auth?.configured ?? true;
  const expired = auth?.status === "expired";

  async function handleSignIn() {
    setMessage(null);
    const result = await signIn();
    if (!result.ok && result.message) {
      setMessage(result.message);
    }
  }

  return (
    <main className="flex h-svh w-screen flex-col items-center justify-center gap-6 overflow-hidden px-6">
      <div className="grid justify-items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Timer size={24} />
        </span>
        <h1 className="text-xl font-[760] text-ink">
          Welcome to {brand.appName}
        </h1>
        <p className="max-w-xs text-[0.82rem] text-muted-foreground">
          {expired
            ? "Your session expired. Sign in again to keep tracking."
            : "Track work and breaks in one click. Sign in to get started."}
        </p>
      </div>

      {configured ? (
        <Button
          onClick={handleSignIn}
          disabled={signingIn}
          className="h-10 min-w-60"
        >
          <GoogleIcon />
          {signingIn ? "Waiting for browser sign-in…" : "Continue with Google"}
        </Button>
      ) : (
        <p className="max-w-sm rounded-lg bg-inset p-3 text-center text-[0.78rem] text-muted-foreground">
          Appwrite is not configured in this build. Set{" "}
          <code className="rounded bg-inset px-1 py-0.5">
            APPWRITE_ENDPOINT
          </code>{" "}
          and{" "}
          <code className="rounded bg-inset px-1 py-0.5">
            APPWRITE_PROJECT_ID
          </code>{" "}
          and rebuild.
        </p>
      )}

      {message && (
        <p className="max-w-sm text-center text-[0.78rem] text-danger">
          {message}
        </p>
      )}

      {signingIn && (
        <p className="text-[0.76rem] text-muted-foreground">
          Complete sign-in in your browser — you can close that tab
          afterwards.
        </p>
      )}
    </main>
  );
}
