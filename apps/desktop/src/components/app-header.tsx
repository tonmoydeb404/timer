import { Download, Loader2 } from "lucide-react";
import { useApp } from "@/context/app-context";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Slim popup header: logo + sync status on the left, update + account on
// the right. Window dragging is enabled across the bar.
export function AppHeader() {
  const { auth, updateInfo, installUpdate, isInstallingUpdate } = useApp();
  const user = auth?.user;
  const online = auth?.status === "active";
  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header
      data-tauri-drag-region
      className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-md"
    >
      <div className="flex min-w-0 items-center gap-2">
        <img
          src="/logo.svg"
          alt={`${brand.appName} logo`}
          className="h-7 w-7 rounded-lg border border-border"
        />
        <div className="grid leading-tight">
          <span className="font-mono text-xs font-semibold tracking-tight text-ink">
            {brand.appName}
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px] font-medium text-muted-foreground">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                online ? "animate-pulse bg-emerald-500" : "bg-amber-500",
              )}
            />
            {online ? "Online & Synced" : "Offline"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {updateInfo && (
          <button
            type="button"
            title={`v${updateInfo.version} ready — install & restart`}
            aria-label="Install update"
            onClick={() => void installUpdate()}
            disabled={isInstallingUpdate}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
          >
            {isInstallingUpdate ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
          </button>
        )}
        <span
          title={user?.email ?? ""}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-600/30 bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
        >
          {initial}
        </span>
      </div>
    </header>
  );
}
