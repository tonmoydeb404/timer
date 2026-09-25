"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@packages/ui/components/button";

type ThemeOption = "light" | "dark";

const config: Record<
  ThemeOption,
  { icon: typeof Sun; label: string; next: ThemeOption }
> = {
  light: { icon: Sun, label: "Light", next: "dark" },
  dark: { icon: Moon, label: "Dark", next: "light" },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current: ThemeOption = theme === "dark" ? "dark" : "light";
  const { icon: Icon, label, next } = config[current];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${label}. Click for ${config[next].label}. Press ⌘D to toggle dark mode.`}
      title={`Theme: ${label} — press ⌘D to toggle`}
      onClick={() => setTheme(next)}
    >
      {mounted ? <Icon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}
