import type { Metadata } from "next";

import { TermsView } from "@/views/terms";
import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";

export const metadata: Metadata = {
  title: `Terms — ${APP_NAME}`,
  description:
    `The terms for using ${APP_NAME}.`,
  alternates: { canonical: sitePaths.terms },
};

export default function TermsPage() {
  return <TermsView />;
}
