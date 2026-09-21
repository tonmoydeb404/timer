import { SiteFooter, SiteHeader } from "@/components/layout";

// Marketing site shell — header + footer. The authenticated product
// (/dashboard/…) and auth pages use their own layouts.
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}
