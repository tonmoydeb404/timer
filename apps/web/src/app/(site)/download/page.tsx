import type { Metadata } from "next";

import { sitePaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";
import { DownloadView } from "@/views/download";

export const metadata: Metadata = {
  title: `Download ${APP_NAME}`,
  description:
    `Download ${APP_NAME} for macOS, Windows, or Linux. Free and open source under the MIT License, or build it from source.`,
  alternates: { canonical: sitePaths.download },
};

export default function DownloadPage() {
  return <DownloadView />;
}
