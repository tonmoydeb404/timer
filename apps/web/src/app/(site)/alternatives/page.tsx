import type { Metadata } from "next";

import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";
import { AlternativesView } from "@/views/alternatives";

export const metadata: Metadata = {
  title: `${APP_NAME} alternatives`,
  description:
    `See how ${APP_NAME} compares to related tools.`,
  alternates: { canonical: sitePaths.alternatives.root },
};

export default function AlternativesPage() {
  return <AlternativesView />;
}
