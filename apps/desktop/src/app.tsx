import { AppSidebar } from "@/components/app-sidebar";
import { ListSkeleton } from "@/components/list-skeleton";
import { AppLayout } from "@/layouts/app-layout";
import { SidebarInset, SidebarProvider } from "@packages/ui/components/sidebar";
import { Toaster } from "@packages/ui/components/sonner";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ModalProvider } from "./context/modal-context";
import { AppProvider, useApp } from "./context/app-context";
import { LoginScreen } from "./screens/auth/login";
import { HomeScreen } from "./screens/home";

function LoadingShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <div
          data-tauri-drag-region
          className="h-9 shrink-0 border-b border-border"
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <section className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4">
            <ListSkeleton />
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ErrorShell({ error }: { error: string }) {
  return (
    <main className="flex h-svh w-screen flex-col items-center justify-center gap-2 overflow-hidden px-6 text-center">
      <strong className="text-[0.88rem] text-danger">
        Something went wrong
      </strong>
      <span className="text-[0.76rem] text-muted-foreground">{error}</span>
    </main>
  );
}

function AppRoutes() {
  const { loading, error, auth } = useApp();

  if (loading || auth === null) return <LoadingShell />;
  if (error) return <ErrorShell error={error} />;

  // "unknown" means Appwrite was unreachable at boot — let the user into the
  // shell (stored session may still be valid) instead of forcing a login.
  const signedIn = auth.status === "active" || auth.status === "unknown";
  if (!signedIn) return <LoginScreen />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomeScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ModalProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
        <Toaster position="bottom-right" />
      </ModalProvider>
    </AppProvider>
  );
}
