import type { Metadata } from "next";

import { FeaturesView } from "@/views/features";
import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";

export const metadata: Metadata = {
  title: `Features — ${APP_NAME}`,
  description:
    "One-click tracking from the tray, projects and tasks, break tracking, and a searchable history. Everything a tracked day needs.",
  alternates: { canonical: sitePaths.features },
};

export default function FeaturesPage() {
  return <FeaturesView />;
}
