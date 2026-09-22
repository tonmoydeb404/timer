import { Button } from "@packages/ui/components/button";
import { Plus } from "lucide-react";

type Props = {
  onNew: () => void;
};

export function TimeHeaderSection({ onNew }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 py-10">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Time</h1>
        <p className="text-sm text-muted-foreground">
          Every tracked session across all projects.
        </p>
      </div>
      <Button size="sm" onClick={onNew}>
        <Plus size={14} />
        Log time
      </Button>
    </div>
  );
}
