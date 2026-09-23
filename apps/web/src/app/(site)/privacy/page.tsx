import type { Metadata } from "next";

import { PrivacyView } from "@/views/privacy";
import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";

export const metadata: Metadata = {
  title: `Privacy — ${APP_NAME}`,
  description: `${APP_NAME} is local-first: settings and session state stay on your device, and only your projects, tasks, and time entries sync to your account.`,
  alternates: { canonical: sitePaths.privacy },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
