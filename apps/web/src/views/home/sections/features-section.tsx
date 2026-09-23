import { FeatureSection } from "@/components/feature-section";
import { SectionHeading } from "@/components/section-heading";
import { features } from "@/content/homepage";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-8 container py-24"
      aria-labelledby="features-title"
    >
      <SectionHeading
        id="features-title"
        title="Everything a tracked day needs"
        description="From the tray click to the end-of-day history, each feature keeps your time accounted for without asking for attention."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {features.map((feature) => (
          <FeatureSection key={feature.id} {...feature} />
        ))}
      </div>
    </section>
  );
}
