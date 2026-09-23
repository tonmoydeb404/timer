import { Briefcase, Coffee, type LucideIcon } from "lucide-react";

export type EntryTypeKind = "WORK" | "BREAK";

/** Shared icon/label/badge-variant registry for WORK/BREAK time entries. */
export const ENTRY_TYPE_REGISTRY: Record<
  EntryTypeKind,
  { label: string; icon: LucideIcon; badgeVariant: "outline" | "default" }
> = {
  WORK: { label: "Work", icon: Briefcase, badgeVariant: "outline" },
  BREAK: { label: "Break", icon: Coffee, badgeVariant: "default" },
};
