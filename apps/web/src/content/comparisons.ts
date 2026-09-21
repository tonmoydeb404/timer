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

// Placeholder comparison ("alternatives") pages — an SEO pattern comparing
// your app with adjacent tools. Replace `app` column values with your app's
// real answers, or delete the /alternatives route entirely.
export const comparisons: Comparison[] = [
  {
    slug: "competitor-one",
    tool: "Competitor One",
    h1: "Your app vs Competitor One",
    metaTitle: "Your app vs Competitor One — which is right for you?",
    metaDescription:
      "A placeholder comparison page. Describe where your app wins and where the other tool is the better choice.",
    intro:
      "Describe what Competitor One is good at, fairly, before drawing the contrast.",
    appPitch:
      "Describe what your app does differently and for whom that difference matters.",
    bestForApp: "Summarize the user who should pick your app.",
    bestForTool: "Summarize the user who should pick the other tool.",
    table: [
      {
        capability: "Core capability",
        app: "Yes",
        other: "Yes",
      },
      {
        capability: "Differentiator",
        app: "Yes",
        other: "No",
      },
      {
        capability: "Platforms",
        app: "macOS, Windows, Linux",
        other: "Describe",
      },
      {
        capability: "Price",
        app: "Free, MIT",
        other: "Describe",
      },
    ],
    faq: [
      {
        question: "A common question about the comparison?",
        answer:
          "An honest, specific answer. Honest comparisons convert better than salesy ones.",
      },
    ],
  },
];
