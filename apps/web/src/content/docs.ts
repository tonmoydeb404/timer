export type DocPage = {
  slug: string;
  title: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  body: { heading: string; text: string }[];
  shortcuts?: { keys: string; action: string }[];
};

export const getDoc = (slug: string) => docs.find((d) => d.slug === slug);

// Placeholder docs pages — replace with your app's real documentation.
export const docs: DocPage[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    h1: "Getting started",
    metaTitle: "Getting Started — Docs",
    metaDescription:
      "Install the app, walk through the basics, and finish your first workflow in a few minutes.",
    intro:
      "A short intro telling the reader what they will accomplish on this page.",
    body: [
      {
        heading: "1. Install the app",
        text: "Describe how to download and install on each supported platform, and where the app lives (tray, dock, menu).",
      },
      {
        heading: "2. Do the core thing",
        text: "Walk through the primary workflow step by step. Keep sentences short and concrete.",
      },
      {
        heading: "3. Go further",
        text: "Point at the next docs pages or features worth discovering after the first run.",
      },
    ],
    shortcuts: [
      { keys: "⌘K / Ctrl K", action: "Open the command palette" },
      { keys: "D", action: "Toggle dark/light theme" },
    ],
  },
  {
    slug: "concepts",
    title: "Concepts",
    h1: "Core concepts",
    metaTitle: "Concepts — Docs",
    metaDescription:
      "The mental model of the app: the main objects, how they relate, and where your data lives.",
    intro:
      "Explain the two or three concepts a new user needs to form a mental model of the app.",
    body: [
      {
        heading: "Concept A",
        text: "Describe the first core concept and where the user meets it in the UI.",
      },
      {
        heading: "Concept B",
        text: "Describe the second core concept and how it relates to concept A.",
      },
      {
        heading: "Where data lives",
        text: "Describe storage, privacy, and (if relevant) how to back things up.",
      },
    ],
  },
];
