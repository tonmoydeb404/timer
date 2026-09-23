export function LocalDataSection() {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">What stays on your device</h2>
      <p className="mt-2 leading-7 text-muted-foreground">
        Tymar keeps a small local footprint in your operating
        system&apos;s standard application data directory:
      </p>
      <ul className="mt-4 space-y-2 leading-7 text-muted-foreground">
        <li>App settings, stored in a local SQLite database.</li>
        <li>
          The active session snapshot, so a running timer survives a restart
          or crash.
        </li>
        <li>Local logs used for troubleshooting.</li>
      </ul>
    </section>
  );
}
