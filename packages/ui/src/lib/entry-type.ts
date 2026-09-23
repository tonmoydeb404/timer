import { Briefcase, Coffee, type LucideIcon } from "lucide-react";

export type EntryTypeKind = "WORK" | "BREAK";

/** Shared icon/label/badge-variant registry for WORK/BREAK time entries. */
export const ENTRY_TYPE_REGISTRY: Record<
  EntryTypeKind,
  { label: string; icon: LucideIcon; badgeVariant: "secondary" | "default" }
> = {
  WORK: { label: "Work", icon: Briefcase, badgeVariant: "default" },
  BREAK: { label: "Break", icon: Coffee, badgeVariant: "secondary" },
};
