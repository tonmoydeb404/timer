import { DataState } from "@packages/ui/components/data-state";

// History tab: real entries + editing arrive with Phase 5 (web) once the
// timer (Phase 3) starts producing time entries.
export function HistoryScreen() {
  return (
    <section className="mx-auto grid h-full w-full max-w-[420px] content-start gap-3 overflow-y-auto scrollbar-thin px-3.5 pt-2 pb-4">
      <h1 className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        History
      </h1>
      <DataState
        loading={false}
        error={null}
        data={[]}
        emptyTitle="No history yet"
        emptyHint="Tracked sessions will appear here once the timer arrives in Phase 3. Full history lives on the web dashboard."
      >
        {() => null}
      </DataState>
    </section>
  );
}
