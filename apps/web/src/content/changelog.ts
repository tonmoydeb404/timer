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
    date: "2026-01-01",
    summary:
      "Placeholder entry. Describe the release in a sentence or two — what changed and why it matters.",
    highlights: [
      "Highlight the headline change of the release.",
      "List secondary changes users will notice.",
      "Note any breaking changes or migration steps.",
    ],
  },
];
