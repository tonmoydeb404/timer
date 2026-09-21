import { Suspense } from "react";
import { CallbackHandler } from "./callback-handler";

export const metadata = {
  title: "Finishing sign-in",
};

export default function AuthCallbackPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Signing in…</p>}
      >
        <CallbackHandler />
      </Suspense>
    </main>
  );
}
