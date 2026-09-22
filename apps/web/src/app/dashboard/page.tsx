"use client";

import { DashboardHomeView } from "@/views/dashboard/home";

// Phase 5 overview: real analytics derived from closed time entries.
// Midnight-split day totals come from @packages/domain; duration is always
// derived from timestamps (never stored).
export default function DashboardPage() {
  return <DashboardHomeView />;
}
