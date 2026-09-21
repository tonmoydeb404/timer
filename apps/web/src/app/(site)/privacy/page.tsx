import type { Metadata } from "next";

import { PrivacyView } from "@/views/privacy";
import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";

export const metadata: Metadata = {
  title: `Privacy — ${APP_NAME}`,
  description:
    `A placeholder privacy summary for ${APP_NAME}. Replace it to match what your app actually does.`,
  alternates: { canonical: sitePaths.privacy },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
