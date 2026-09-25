import { openUrl } from "@tauri-apps/plugin-opener";
import { brand } from "@/lib/brand";
import { Button } from "@packages/ui/components/button";
import { ResponsiveSheet } from "@packages/ui/components/responsive-sheet";
import { ExternalLink, Rocket } from "lucide-react";
import type { UpdateInfo } from "@/types";

type UpdateChangelogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateInfo: UpdateInfo;
  installing?: boolean;
  onInstall: () => void;
};

// Shown when an update is available (boot check or the manual settings
// check). ResponsiveSheet keeps it adaptive: bottom Drawer on mobile /
// narrow windows (the 420px desktop window), centered Dialog on wide.
export function UpdateChangelogDialog({
  open,
  onOpenChange,
  updateInfo,
  installing = false,
  onInstall,
}: UpdateChangelogDialogProps) {
  const hasNotes = updateInfo.body != null && updateInfo.body.trim().length > 0;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      variant="dialog"
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Rocket size={18} />
          </span>
          <span className="grid gap-0.5 text-left">
            <span>Update to v{updateInfo.version}</span>
            <span className="text-sm font-normal text-muted-foreground">
              You&apos;re on v{brand.version}.
            </span>
          </span>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          {!hasNotes && (
            <Button
              variant="ghost"
              onClick={() => openUrl(brand.downloadUrl).catch(() => {})}
            >
              <ExternalLink size={14} />
              GitHub
            </Button>
          )}
          <Button onClick={onInstall} disabled={installing}>
            <Rocket size={14} />
            {installing ? "Installing…" : "Install & restart"}
          </Button>
        </div>
      }
    >
      {hasNotes ? (
        <div className="max-h-[40vh] overflow-auto scrollbar-thin">
          <pre className="whitespace-pre-wrap break-words font-sans text-[0.82rem] leading-relaxed text-muted-foreground">
            {updateInfo.body}
          </pre>
        </div>
      ) : (
        <p className="text-[0.82rem] leading-relaxed text-muted-foreground">
          Release notes are not available for this version.
        </p>
      )}
    </ResponsiveSheet>
  );
}
