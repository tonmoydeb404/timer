export function NoTransmissionSection() {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">What Tymar never does</h2>
      <ul className="mt-4 space-y-2 leading-7 text-muted-foreground">
        <li>No telemetry, analytics, or usage statistics.</li>
        <li>No error or crash reporting.</li>
        <li>No advertising or tracking.</li>
        <li>No selling or sharing data — there is no data to sell.</li>
        <li>No background network activity beyond account sync and the
          startup update check.</li>
      </ul>
    </section>
  );
}
