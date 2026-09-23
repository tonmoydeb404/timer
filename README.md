# tauri-desktop-template

A production-ready GitHub template for cross-platform desktop apps:

- **Tauri 2** (Rust backend) + **React 19** + **TypeScript** + **Tailwind v4** (Vite)
- **pnpm + Turborepo** monorepo with a shared **shadcn-style UI kit** (`packages/ui`)
- **Optional Next.js marketing/docs site** (`apps/web`)
- **Single-source branding** — `brand.json` drives the app name, identifier,
  version, repo URLs, and more across ~25 consumer files via `pnpm sync-brand`
- **Release tooling** — 3-platform CI (macOS dmg / Linux deb / Windows msi+exe),
  built-in updater, Homebrew cask automation, curl|sh installers
- **Desktop app plumbing** — system tray, autostart, hide-to-tray, dark/light
  theme, welcome/update dialogs, SQLite + migrations skeleton

<!-- @brand:start badges -->

[![Release](https://img.shields.io/github/v/release/tonmoydeb404/tymar)](https://github.com/tonmoydeb404/tymar/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)](#download)

<!-- @brand:end badges -->

## Quick start

1. Click **"Use this template"** → create your new repository.
2. Clone it and scaffold your app's identity:

   ```sh
   pnpm install
   pnpm init-app        # asks name/owner/etc, rewrites brand.json + all consumers
   ```

3. Replace the placeholder icons with yours:

   ```sh
   pnpm --filter @apps/desktop tauri icon path/to/your-icon.png
   ```

4. Run it:

   ```sh
   pnpm dev:desktop
   ```

> Full walkthrough (updater keys, GitHub secrets, releasing, Homebrew):
> **[docs/TEMPLATE_GUIDE.md](docs/TEMPLATE_GUIDE.md)**

## What's inside

```
├── apps/
│   ├── desktop/        # Tauri 2 app (React frontend + Rust backend)
│   └── web/            # Next.js marketing site (optional — delete if unused)
├── packages/
│   ├── ui/             # Shared shadcn-style component kit
│   ├── eslint-config/
│   └── typescript-config/
├── scripts/
│   ├── sync-brand.mjs  # brand.json → every consumer file
│   ├── init-app.mjs    # one-time scaffolder after "Use this template"
│   └── release-tag-sync.mjs
├── brand.json          # ★ single source of truth for branding + version
├── Casks/              # Homebrew cask (auto-updated on release)
├── setup/              # curl|sh / irm|iex installers
└── .github/workflows/  # ci.yml + release.yml (3-platform + cask automation)
```

## Branding: edit one file

Change `brand.json`, then run `pnpm sync-brand` (the pre-commit hook does this
for you). It propagates to `tauri.conf.json`, `Cargo.toml`/`Cargo.lock`, crate
names in `main.rs`, package.json files, `index.html`, the generated
`brand.ts`/`brand.rs`, the Homebrew cask, setup scripts, and README badges.
CI fails (`pnpm sync-brand:check`) if anything drifts.

## Releasing

```sh
pnpm release:tag patch   # bumps brand.json, syncs, commits, tags, pushes
```

The tag push triggers the release workflow: dmg + deb + msi/exe with updater
artifacts, then updates the Homebrew cask with the new sha256.

<!-- @brand:start downloadLink -->

[Download the latest release &raquo;](https://github.com/tonmoydeb404/tymar/releases/latest)

<!-- @brand:end downloadLink -->

## License

MIT
