export const metadata = {
  title: "Settings",
};

// Phase 1: account basics live here; timezone/profile editing in Phase 2+.
export default function SettingsPage() {
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Profile and timezone settings arrive with Phase 2.
      </p>
    </div>
  );
}
