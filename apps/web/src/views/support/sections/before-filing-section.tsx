export function BeforeFilingSection() {
  return (
    <section className="mt-16">
      <h2 className="text-xl font-medium">Before you file an issue</h2>
      <ul className="mt-4 space-y-2 leading-7 text-muted-foreground">
        <li>Reproduce the problem and note the exact steps.</li>
        <li>Include your OS version and where you installed the app.</li>
        <li>Check existing issues before opening a new one.</li>
      </ul>
    </section>
  );
}
