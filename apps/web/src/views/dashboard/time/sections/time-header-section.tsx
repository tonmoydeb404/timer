import { Button } from "@packages/ui/components/button";
import {
  DateRangePicker,
  type DateRangeValue,
} from "@packages/ui/components/date-range-picker";
import { Plus } from "lucide-react";

type Props = {
  range: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
  onNew: () => void;
};

export function TimeHeaderSection({ range, onRangeChange, onNew }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 py-10">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Time</h1>
        <p className="text-sm text-muted-foreground">
          Every tracked session across all projects.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <DateRangePicker value={range} onChange={onRangeChange} />
        <Button size="sm" onClick={onNew}>
          <Plus size={14} />
          Log time
        </Button>
      </div>
    </div>
  );
}
