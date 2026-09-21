import { externalUrls } from "@/config/paths-config";

export const SITE_URL = externalUrls.site;
export const APP_NAME = externalUrls.appName;
export const REPOSITORY_URL = externalUrls.repository;

// Primary site navigation. Route-based so every page is reachable from the
// header on both the homepage and sub-pages (PageShell).
export const primaryNav = [
  { label: "Features", href: "/features" },
  { label: "Docs", href: "/docs" },
  { label: "Alternatives", href: "/alternatives" },
] as const;

// Which screenshot the hero shows. Wire this to your real product shots.
export const heroScreenshot = "commands" as const;

// ---- Placeholder marketing copy — replace with your product's story ----

export const capabilities = [
  {
    title: "Capability one",
    description: "One sentence describing a core capability of your app.",
    icon: "mouse",
  },
  {
    title: "Capability two",
    description: "One sentence describing a core capability of your app.",
    icon: "laptop",
  },
  {
    title: "Capability three",
    description: "One sentence describing a core capability of your app.",
    icon: "calendar",
  },
  {
    title: "Capability four",
    description: "One sentence describing a core capability of your app.",
    icon: "history",
  },
] as const;

export const features = [
  {
    id: "feature-one",
    title: "Feature one headline",
    description:
      "A short paragraph explaining the feature and why it matters to the person evaluating your app. Keep it concrete and benefit-driven.",
    visualTitle: "Feature one visual",
    visualDescription:
      "Reserved for a product screenshot of feature one.",
    visualView: "commands",
    tone: "rose",
    span: "wide",
  },
  {
    id: "feature-two",
    title: "Feature two headline",
    description:
      "A short paragraph explaining the second feature. Mention what the user no longer has to do by hand.",
    visualTitle: "Feature two visual",
    visualDescription:
      "Reserved for a product screenshot of feature two.",
    visualView: "commands",
    tone: "violet",
    span: "narrow",
  },
  {
    id: "feature-three",
    title: "Feature three headline",
    description:
      "A closing feature paragraph that ties the workflow together and leads toward the download call to action.",
    visualTitle: "Feature three visual",
    visualDescription:
      "Reserved for a final product composition.",
    visualView: "history",
    tone: "blue",
    span: "full",
  },
] as const;

export const workflow = [
  {
    title: "Step one",
    description: "Describe the first step of the happy path.",
  },
  {
    title: "Step two",
    description: "Describe what happens in the middle.",
  },
  {
    title: "Step three",
    description: "Describe the outcome the user gets.",
  },
] as const;

export const faqItems = [
  {
    question: "What is this app?",
    answer:
      "A placeholder answer describing what your app does and who it is for.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "Describe the platforms your app ships on and where downloads live.",
  },
  {
    question: "Is it free?",
    answer:
      "Describe your licensing and pricing model (the template ships as MIT).",
  },
  {
    question: "Where does my data live?",
    answer:
      "Describe your data story — the template's desktop app is local-first with SQLite storage.",
  },
] as const;

export const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Alternatives", href: "/alternatives" },
      { label: "Docs", href: "/docs" },
      { label: "Changelog", href: "/changelog" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Support", href: "/support" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: REPOSITORY_URL, external: true },
      {
        label: "Releases",
        href: externalUrls.download,
        external: true,
      },
      {
        label: "MIT License",
        href: `${REPOSITORY_URL}/blob/main/LICENSE`,
        external: true,
      },
    ],
  },
] as const;
