import { brand } from "@/lib/brand";
import { Button } from "@packages/ui/components/button";
import { ResponsiveSheet } from "@packages/ui/components/responsive-sheet";
import { CheckCircle2 } from "lucide-react";

type UpdateNoticeDialogProps = {
  open: boolean;
  previousVersion: string | null;
  onDismiss: () => void;
};

export function UpdateNoticeDialog({
  open,
  previousVersion,
  onDismiss,
}: UpdateNoticeDialogProps) {
  function handleOpenChange(o: boolean) {
    if (!o) onDismiss();
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={handleOpenChange}
      variant="dialog"
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 size={18} />
          </span>
          <span className="grid gap-0.5 text-left">
            <span>{brand.appName} is up to date</span>
            <span className="text-sm font-normal text-muted-foreground">
              {previousVersion
                ? `Updated from v${previousVersion} to v${brand.version}.`
                : `You're now on v${brand.version}.`}
            </span>
          </span>
        </div>
      }
      footer={<Button onClick={onDismiss}>Got it</Button>}
    >
      <p className="text-[0.82rem] leading-relaxed text-muted-foreground">
        Thanks for keeping {brand.appName} fresh. This version includes the
        latest improvements and fixes.
      </p>
    </ResponsiveSheet>
  );
}
