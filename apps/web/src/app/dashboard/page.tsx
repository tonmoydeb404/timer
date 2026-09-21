"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { appPaths } from "@/config/paths-config";
import { useAuth } from "@/lib/auth-context";

// Phase 1 overview: proves auth + layout. Analytics arrive in Phase 5,
// projects/tasks management in Phase 2.
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(appPaths.login);
    }
  }, [loading, user, router]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!user) return null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.name ? `Good to see you, ${user.name.split(" ")[0]}` : "Overview"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your time at a glance — start tracking from the desktop app.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <CardDescription>Work vs break</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">—</p>
            <p className="text-xs text-muted-foreground">
              Analytics arrive in Phase 5.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <CardDescription>Containers for your work</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={appPaths.projects}
              className="text-sm text-primary hover:underline"
            >
              Manage projects →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">History</CardTitle>
            <CardDescription>Every tracked session</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={appPaths.time}
              className="text-sm text-primary hover:underline"
            >
              Review time →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
