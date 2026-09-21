import { Button } from "@packages/ui/components/button";
import { LogOut, Timer } from "lucide-react";
import { useApp } from "@/context/app-context";

// Phase 1 placeholder: proves auth + shell work. Real timer UI lands in
// Phase 3; projects/tasks lists land in Phase 2.
export function HomeScreen() {
  const { auth, signOut } = useApp();
  const user = auth?.user;
  const offline = auth?.status === "unknown";

  return (
    <section className="min-h-0 flex-1 overflow-auto scrollbar-thin p-6">
      <div className="mx-auto grid max-w-lg gap-6">
        <div className="grid gap-1 text-center">
          <h1 className="text-xl font-[760] text-ink">Today</h1>
          <p className="text-[0.82rem] text-muted-foreground">
            {user ? `Tracking as ${user.name || user.email}` : "Today's work"}
          </p>
        </div>

        {offline && (
          <p className="rounded-lg bg-inset p-3 text-center text-[0.78rem] text-muted-foreground">
            Couldn&apos;t reach Appwrite — showing the last known session.
          </p>
        )}

        <div className="grid justify-items-center gap-3 rounded-xl border border-border bg-surface p-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-inset text-muted-foreground">
            <Timer size={22} />
          </span>
          <p className="text-[0.84rem] font-medium text-ink">No timer yet</p>
          <p className="max-w-xs text-[0.78rem] text-muted-foreground">
            Time tracking arrives in Phase 3. Projects and tasks arrive in
            Phase 2.
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={signOut}
          className="mx-auto h-8 text-muted-foreground"
        >
          <LogOut size={14} />
          Sign out
        </Button>
      </div>
    </section>
  );
}
