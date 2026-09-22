import { DateRangePicker, type DateRangeValue } from "@packages/ui/components/date-range-picker";

type Props = {
  name?: string | null;
  range: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
};

export function GreetingSection({ name, range, onRangeChange }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 py-10">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {name ? `Good to see you, ${name.split(" ")[0]}` : "Overview"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your time at a glance — start tracking from the desktop app.
        </p>
      </div>
      <DateRangePicker value={range} onChange={onRangeChange} />
    </div>
  );
}
