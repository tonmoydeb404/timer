import { Button } from "@packages/ui/components/button";
import { Plus } from "lucide-react";

type Props = {
  onNew: () => void;
};

export function ProjectsHeaderSection({ onNew }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 py-10">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Containers for related work.
        </p>
      </div>
      <Button onClick={onNew}>
        <Plus size={14} />
        New project
      </Button>
    </div>
  );
}
