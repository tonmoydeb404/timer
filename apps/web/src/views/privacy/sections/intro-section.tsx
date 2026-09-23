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
        Your time is your data
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Tymar is local-first. Your settings and the active session live on
        your device; when you sign in, your projects, tasks, and time entries
        sync to your account so the desktop app and web dashboard stay in
        step. The only other network call Tymar makes is a check for updates
        against GitHub Releases when the app starts — updates download only
        if you ask for them.
      </p>
    </>
  );
}
