export function AccountSection() {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">Your account and what syncs</h2>
      <p className="mt-2 leading-7 text-muted-foreground">
        Signing in with Google creates an account that keeps your data in
        step between the desktop app and the web dashboard. Exactly three
        things are associated with it:
      </p>
      <ul className="mt-4 space-y-2 leading-7 text-muted-foreground">
        <li>Your profile — display name and timezone preferences.</li>
        <li>Your organizational data — projects and tasks.</li>
        <li>Your time entries — the sessions and breaks you track.</li>
      </ul>
      <p className="mt-4 leading-7 text-muted-foreground">
        Deleting your account removes that data from the sync service.
        Everything listed under &quot;What stays on your device&quot; never
        leaves your machine, whether you sign in or not.
      </p>
    </section>
  );
}
