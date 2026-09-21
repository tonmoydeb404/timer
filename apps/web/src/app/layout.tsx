import { SiteFooter, SiteHeader } from "@/components/layout";
import { ThemeProvider } from "@/components/theme-provider";
import { sitePaths } from "@/config/paths-config";
import { SITE_URL, APP_NAME } from "@/content/homepage";
import { externalUrls } from "@/config/paths-config";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fontSans = Chakra_Petch({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500", "600", "700"],
});

const title = `${APP_NAME} — ${externalUrls.descriptionShort}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description: externalUrls.descriptionShort,
  alternates: {
    canonical: sitePaths.home,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: APP_NAME,
    title,
    description: externalUrls.descriptionShort,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: externalUrls.descriptionShort,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        fontSans.variable,
        fontMono.variable,
        "min-h-screen antialiased font-sans",
      )}
    >
      {process.env.NODE_ENV === "development" && (
        <head>
          <script
            async
            crossOrigin="anonymous"
            src="https://tweakcn.com/live-preview.min.js"
          />
        </head>
      )}
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
