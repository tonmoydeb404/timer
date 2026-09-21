import { History, List, Settings, Timer } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Today", icon: Timer, end: true },
  { to: "/tasks", label: "Tasks", icon: List, end: false },
  { to: "/history", label: "History", icon: History, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
] as const;

export function BottomTabs() {
  return (
    <nav
      aria-label="Primary"
      className="grid h-14 shrink-0 grid-cols-4 border-t border-border bg-card/95 px-3 backdrop-blur-md"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-0.5 transition-colors",
              isActive
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "font-medium text-muted-foreground hover:text-ink",
            )
          }
        >
          <tab.icon size={20} />
          <span className="font-mono text-[10px]">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
