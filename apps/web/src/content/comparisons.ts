export type ComparisonRow = {
  capability: string;
  app: string;
  other: string;
};

export type Comparison = {
  slug: string;
  tool: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  appPitch: string;
  bestForApp: string;
  bestForTool: string;
  table: ComparisonRow[];
  faq: { question: string; answer: string }[];
};

export const getComparison = (slug: string) =>
  comparisons.find((c) => c.slug === slug);

// Comparison ("alternatives") pages — an SEO pattern comparing Tymar with
// adjacent tools. Keep the answers honest: where the other tool wins, say so.
export const comparisons: Comparison[] = [
  {
    slug: "toggl-track",
    tool: "Toggl Track",
    h1: "Tymar vs Toggl Track",
    metaTitle: "Tymar vs Toggl Track — which is right for you?",
    metaDescription:
      "Toggl Track is a full team time-tracking platform; Tymar is a minimal, local-first tracker that lives in your tray. Compare both honestly.",
    intro:
      "Toggl Track is one of the most polished time trackers around, with deep team features, billing integrations, and reporting. That breadth is exactly the difference: Toggl is built for teams and billables, Tymar is built for one person who wants their day accounted for without managing another workspace.",
    appPitch:
      "Tymar strips time tracking down to the loop that matters: pick a task, start the timer from the tray, take breaks without thinking, and read your history at the end of the day. There's no workspace to set up, no plan to pick, and the source is fully open.",
    bestForApp:
      "You track your own focus time, want it out of the way in the system tray, and prefer a free, open-source app over a hosted platform.",
    bestForTool:
      "You need team timesheets, client billing, rich reports, or integrations with project-management tools — Toggl's platform features are genuinely worth paying for.",
    table: [
      {
        capability: "Price",
        app: "Free, MIT",
        other: "Free tier; paid plans for features",
      },
      {
        capability: "Source code",
        app: "Open source (MIT)",
        other: "Proprietary",
      },
      {
        capability: "Data storage",
        app: "Local-first with account sync",
        other: "Cloud-hosted",
      },
      {
        capability: "Tray-first tracking",
        app: "Yes — core design",
        other: "Supported via apps and extensions",
      },
      {
        capability: "Team timesheets & billing",
        app: "No",
        other: "Yes",
      },
      {
        capability: "Platforms",
        app: "macOS, Windows, Linux",
        other: "macOS, Windows, Linux, iOS, Android, web",
      },
    ],
    faq: [
      {
        question: "Can I migrate from Toggl Track to Tymar?",
        answer:
          "There's no one-click importer today. Most of Tymar's value is built up going forward — create your projects and tasks once, and future sessions are attributed automatically.",
      },
      {
        question: "Does Tymar replace Toggl for teams?",
        answer:
          "No. Tymar deliberately has no team workspaces, approvals, or billing. If you track time for invoicing across a team, Toggl is the better tool for that job.",
      },
    ],
  },
];
