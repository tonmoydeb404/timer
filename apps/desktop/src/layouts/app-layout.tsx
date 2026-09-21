import { Settings } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ErrorAlertDialog } from "@/components/error-alert-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { StartupModals } from "@/components/startup-modals";
import { useModal } from "@/context/modal-context";
import { brand } from "@/lib/brand";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@packages/ui/components/sidebar";
import { Outlet } from "react-router-dom";

// Below md widths (including the 420px popup window) the sidebar lives in
// an overlay sheet, so a compact bar keeps nav + settings reachable.
function NarrowTopBar() {
  const { settings } = useModal();

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2 md:hidden"
    >
      <SidebarTrigger />
      <span className="text-[0.8rem] font-semibold text-ink">
        {brand.appName}
      </span>
      <span className="flex-1" />
      <button
        type="button"
        aria-label="Settings"
        onClick={() => settings.open()}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Settings size={15} />
      </button>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <NarrowTopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>

      {/* Route-driven overlays (each opens when its route is active) */}
      <ErrorAlertDialog />
      <SettingsDialog />
      <CommandPalette />
      <StartupModals />
    </SidebarProvider>
  );
}
