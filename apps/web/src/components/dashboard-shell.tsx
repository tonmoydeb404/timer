"use client";

import { Button } from "@packages/ui/components/button";
import { Separator } from "@packages/ui/components/separator";
import { LogOut, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPaths } from "@/config/paths-config";
import { APP_NAME } from "@/content/homepage";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: appPaths.dashboard },
  { label: "Projects", href: appPaths.projects },
  { label: "Tasks", href: appPaths.tasks },
  { label: "Time", href: appPaths.time },
  { label: "Settings", href: appPaths.settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href={appPaths.dashboard} className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Timer size={15} />
              </span>
              <span className="font-medium">{APP_NAME}</span>
            </Link>
            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Product"
            >
              {navItems.map((item) => {
                const active =
                  item.href === appPaths.dashboard
                    ? pathname === appPaths.dashboard
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-1">
            {!loading && user && (
              <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:block">
                {user.name || user.email}
              </span>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut size={14} />
              Sign out
            </Button>
          </div>
        </div>
        <div className="container flex gap-1 overflow-x-auto pb-2 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
                pathname.startsWith(item.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      <Separator className="hidden" />
      <main className="container flex flex-1 flex-col py-8">{children}</main>
    </div>
  );
}
