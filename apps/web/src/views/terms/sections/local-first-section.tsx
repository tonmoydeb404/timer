import { SITE_URL } from "@/content/homepage";

export function LocalFirstSection() {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">Your data</h2>
      <p className="mt-2 leading-7 text-muted-foreground">
        Tymar keeps settings and session state on your device. When you sign
        in, your projects, tasks, and time entries sync to your account.
        Exactly what leaves your device is described on the{" "}
        <a
          href={`${SITE_URL}/privacy`}
          className="font-medium text-primary underline underline-offset-4"
        >
          Privacy page
        </a>
        .
      </p>
    </section>
  );
}
