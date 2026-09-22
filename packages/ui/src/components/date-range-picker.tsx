"use client";

import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@packages/ui/components/button";
import { Calendar } from "@packages/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@packages/ui/components/popover";
import { cn } from "@packages/ui/lib/utils";

export type DateRangeValue = { from?: string; to?: string };

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatLabel(value: string | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** From/to date range picker backed by "YYYY-MM-DD" strings, for URL-driven filters. */
function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRangeValue>(value);

  const selected: DateRange | undefined = React.useMemo(
    () => ({ from: parseDate(draft.from), to: parseDate(draft.to) }),
    [draft.from, draft.to],
  );

  const label =
    value.from || value.to
      ? `${formatLabel(value.from) || "…"} – ${formatLabel(value.to) || "…"}`
      : "Pick a date range";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("justify-start gap-2 font-normal", className)}
          />
        }
      >
        <CalendarIcon size={14} />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          defaultMonth={selected?.from}
          onSelect={(range) => {
            setDraft({
              from: range?.from ? formatDate(range.from) : undefined,
              to: range?.to ? formatDate(range.to) : undefined,
            });
          }}
        />
        <div className="flex items-center justify-end gap-2 border-t border-border p-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(value);
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!draft.from || !draft.to}
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DateRangePicker };
