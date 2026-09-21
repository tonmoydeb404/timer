import type { Metadata } from "next";

import { DocsView } from "@/views/docs";
import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";

export const metadata: Metadata = {
  title: `Docs — ${APP_NAME}`,
  description:
    `Documentation for ${APP_NAME}.`,
  alternates: { canonical: sitePaths.docs.root },
};

export default function DocsPage() {
  return <DocsView />;
}
