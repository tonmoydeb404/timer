import { Suspense } from "react";
import { DesktopBridge } from "./desktop-bridge";

export const metadata = {
  title: "Returning to the app",
};

export default function DesktopCallbackPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Signing in…</p>}
      >
        <DesktopBridge />
      </Suspense>
    </main>
  );
}
