export type ChangelogEntry = {
  version: string;
  date: string;
  summary: string;
  highlights: string[];
};

// Each shipped version appends an entry here; release downloads always live on
// GitHub Releases. Entries are newest-first.
export const changelog: ChangelogEntry[] = [
  {
    version: "v0.1.0 — First release",
    date: "2026-09-23",
    summary:
      "Tymar's first public release: tray-first time tracking with projects, tasks, breaks, and a synced history.",
    highlights: [
      "Start, stop, switch, and take breaks from the system tray with a live elapsed-time readout.",
      "Projects and tasks with quick search and a command palette (⌘/Ctrl K).",
      "Local-first storage: session state and settings in SQLite on your device.",
      "Optional sign-in to sync projects, tasks, and entries with the web dashboard.",
      "Built-in auto-updates on macOS, Windows, and Linux.",
    ],
  },
];
