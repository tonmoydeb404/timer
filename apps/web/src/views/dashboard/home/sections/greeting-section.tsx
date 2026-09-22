type Props = {
  name?: string | null;
};

export function GreetingSection({ name }: Props) {
  return (
    <div className="grid gap-1 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {name ? `Good to see you, ${name.split(" ")[0]}` : "Overview"}
      </h1>
      <p className="text-sm text-muted-foreground">
        Your time at a glance — start tracking from the desktop app.
      </p>
    </div>
  );
}
