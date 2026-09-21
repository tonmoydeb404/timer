import type { Metadata } from "next";

import { SupportView } from "@/views/support";
import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";

export const metadata: Metadata = {
  title: `Support — ${APP_NAME}`,
  description:
    `Get help with ${APP_NAME}. Report bugs and request features on GitHub or read the docs.`,
  alternates: { canonical: sitePaths.support },
};

export default function SupportPage() {
  return <SupportView />;
}
