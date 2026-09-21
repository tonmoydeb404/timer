import type { Metadata } from "next";

import { ChangelogView } from "@/views/changelog";
import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";

export const metadata: Metadata = {
  title: `Changelog — ${APP_NAME}`,
  description:
    `What's new in each build of ${APP_NAME}.`,
  alternates: { canonical: sitePaths.changelog },
};

export default function ChangelogPage() {
  return <ChangelogView />;
}
