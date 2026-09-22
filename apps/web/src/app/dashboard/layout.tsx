import { DashboardShell } from "@/components/dashboard-shell";
import { AppDataProvider } from "@/contexts/app/app-context";
import { SetupModal } from "@/views/dashboard/modals";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppDataProvider>
      <DashboardShell>{children}</DashboardShell>
      <SetupModal />
    </AppDataProvider>
  );
}
