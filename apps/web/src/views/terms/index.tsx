import { PageShell } from "@/components/page-shell";
import { ChangesSection } from "./sections/changes-section";
import { ContentSection } from "./sections/content-section";
import { LicenseSection } from "./sections/license-section";
import { LocalFirstSection } from "./sections/local-first-section";
import { NoWarrantySection } from "./sections/no-warranty-section";
import { TermsIntroSection } from "./sections/intro-section";

export function TermsView() {
  return (
    <PageShell>
      <TermsIntroSection />
      <LicenseSection />
      <NoWarrantySection />
      <ContentSection />
      <LocalFirstSection />
      <ChangesSection />
    </PageShell>
  );
}
