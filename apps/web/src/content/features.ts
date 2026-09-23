export type Feature = {
  slug: string;
  title: string;
  metaDescription: string;
};

export const features: Feature[] = [
  {
    slug: "one-click-tracking",
    title: "One-click tracking",
    metaDescription:
      "Start, stop, and switch work sessions from the system tray. Tymar keeps tracking while the window stays out of your way.",
  },
  {
    slug: "projects-and-tasks",
    title: "Projects and tasks",
    metaDescription:
      "Organize time under projects and tasks, switch context without losing the running session, and keep every entry attributed.",
  },
  {
    slug: "breaks",
    title: "Break tracking",
    metaDescription:
      "Take a break with one click. Tymar records break time separately from focus time so your day adds up honestly.",
  },
  {
    slug: "local-first",
    title: "Local-first with sync",
    metaDescription:
      "Session state and settings stay in a local SQLite database. Sign in to sync projects, tasks, and history across devices.",
  },
];
