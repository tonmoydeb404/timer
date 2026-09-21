import { SITE_URL } from "@/content/homepage";

export function LocalFirstSection() {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-medium">Local-first</h2>
      <p className="mt-2 leading-7 text-muted-foreground">
        The app stores your data locally on your device. Adjust this
        placeholder to describe what your app actually stores. See the{" "}
        <a
          href={`${SITE_URL}/privacy`}
          className="font-medium text-primary underline underline-offset-4"
        >
          Privacy page
        </a>{" "}
        for details.
      </p>
    </section>
  );
}
