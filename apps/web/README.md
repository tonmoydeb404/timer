# <!-- @brand:appName -->Tymar<!-- /@brand:appName --> Web

The marketing/docs site for [the desktop app](../../README.md). This package (`apps/web`) is a Next.js (App Router) site: landing page, feature highlights, docs, changelog, download CTA, pricing, privacy/terms.

All copy lives in `src/content/*.ts` — placeholder content is in place; replace it with your product's copy.

---

## Tech stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind v4 (PostCSS)
- **UI:** shadcn/ui primitives and shared components from [`@packages/ui`](../../packages/ui)
- **Fonts:** wired in `src/app/layout.tsx`
- **Theming:** `next-themes`, dark-first via a no-FOUC inline script

## Run commands

Run from the **repository root** (this is a pnpm workspace):

```sh
pnpm install          # install all workspace dependencies
pnpm dev:web          # Next.js dev server at http://localhost:3010
pnpm build            # production build (turbo routes to this package)
```

Or run from within `apps/web`:

```sh
pnpm dev              # next dev -p 3010
pnpm build            # next build
pnpm start            # next start (serves the production build)
pnpm check-types      # tsc --noEmit
pnpm lint             # eslint --max-warnings 0
```

## Links

- Live site: <!-- @brand:website -->https://tonmoydeb.com<!-- /@brand:website -->
- Repository: <!-- @brand:repository -->https://github.com/tonmoydeb404/tymar<!-- /@brand:repository -->

## License

[MIT](../../LICENSE) — <!-- @brand:copyright -->Copyright (c) 2026 Tonmoy Deb<!-- /@brand:copyright -->
