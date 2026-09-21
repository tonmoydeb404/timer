import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/app-header";
import { BottomTabs } from "@/components/bottom-tabs";
import { CommandPalette } from "@/components/command-palette";
import { ErrorAlertDialog } from "@/components/error-alert-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { StartupModals } from "@/components/startup-modals";

// Popup shell for the 420px window: header, scrollable tab content,
// bottom tabs. Overlays stay mounted for command-palette/settings flows.
export function TabLayout() {
  return (
    <div className="flex h-svh w-screen flex-col overflow-hidden bg-background">
      <AppHeader />
      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
      <BottomTabs />

      <ErrorAlertDialog />
      <SettingsDialog />
      <CommandPalette />
      <StartupModals />
    </div>
  );
}
