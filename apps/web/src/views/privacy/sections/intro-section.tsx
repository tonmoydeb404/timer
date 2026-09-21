import { BreadcrumbBuilder } from "@/components/builders";
import { sitePaths } from "@/config/paths-config";

export function PrivacyIntroSection() {
  return (
    <>
      <BreadcrumbBuilder
        items={[
          { label: "Home", href: sitePaths.home },
          { label: "Privacy", href: sitePaths.privacy },
        ]}
      />
      <h1 className="mt-6 text-3xl font-medium tracking-tight md:text-4xl">
        Your data stays on your machine
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
        This app is local-first: it stores everything on your device. Adjust
        this placeholder to describe exactly what leaves the device, if
        anything (e.g. signed update checks).
      </p>
    </>
  );
}
