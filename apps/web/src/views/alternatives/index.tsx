import { BreadcrumbBuilder } from "@/components/builders";
import { LinkCard } from "@/components/cards";
import { PageShell } from "@/components/page-shell";
import { sitePaths } from "@/config/paths-config";
import { comparisons } from "@/content/comparisons";
import { APP_NAME } from "@/content/homepage";

export function AlternativesView() {
  return (
    <PageShell>
      <BreadcrumbBuilder
        items={[
          { label: "Home", href: sitePaths.home },
          { label: "Alternatives", href: sitePaths.alternatives.root },
        ]}
      />
      <h1 className="mt-6 text-3xl font-medium tracking-tight md:text-4xl">
        How {APP_NAME} compares
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
        {APP_NAME} compared to the adjacent tools your audience might use
        today. Comparison pages are defined in src/content/comparisons.ts.
      </p>

      <ul className="mt-10 space-y-4">
        {comparisons.map((comparison) => (
          <li key={comparison.slug}>
            <LinkCard
              title={comparison.tool}
              description={comparison.metaDescription}
              href={sitePaths.alternatives.details(comparison.slug)}
            />
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
