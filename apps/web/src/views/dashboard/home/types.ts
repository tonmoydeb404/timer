import type { DayTotal, ProjectTotal, TimeEntry } from "@packages/domain/index";

export type DashboardAnalytics = {
  timeZone: string;
  today: string;
  todayTotal: DayTotal;
  week: { workMs: number; breakMs: number; totalMs: number };
  all: { workMs: number; breakMs: number; totalMs: number };
  last7Totals: DayTotal[];
  maxDay: number;
  byProject: ProjectTotal[];
  projectName: (id: string) => string;
  taskName: (id: string) => string;
  recent: TimeEntry[];
  entryCount: number;
};
