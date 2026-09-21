# Template guide

Everything you need to go from "Use this template" to a shipping app.

## 1. Create your app

1. On GitHub, click **"Use this template"** → create `<owner>/<repo>`.
2. Clone locally, then:

   ```sh
   pnpm install
   pnpm init-app
   ```

   `init-app` asks for your app name, GitHub owner/repo, bundle identifier,
   etc., rewrites `brand.json`, and runs `pnpm sync-brand` to propagate the
   identity into every consumer file (configs, Rust, TS, cask, installers).

   Non-interactive variant:

   ```sh
   pnpm init-app --yes --app-name "Wave" --owner janedoe --repo wave
   ```

## 2. Icons

```sh
pnpm --filter @apps/desktop tauri icon path/to/your-icon.png
```

Generates every size under `apps/desktop/src-tauri/icons/`. Also replace
`apps/desktop/public/logo.svg` (used in the sidebar header) and
`apps/web/src/app/icon.svg` (website favicon).

## 3. Updater keys (required before your first release)

The `pubkey` committed in `tauri.conf.json` belongs to the template author and
exists only so dev builds compile. You **must** generate your own keypair:

```sh
pnpm --filter @apps/desktop tauri signer generate -w ~/.tauri/<my-app>.key
```

- Paste the printed **public key** into
  `apps/desktop/src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
- Add two repository secrets on GitHub:
  - `TAURI_SIGNING_PRIVATE_KEY` — contents of the key file (or the password
    you set, depending on the generator output; it prints explicit
    instructions)
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the key password (empty string if
    none)

Never commit the private key. `.keys/` is already gitignored.

## 4. Daily development

```sh
pnpm dev:desktop    # Tauri dev window (hot reload, isolated dev data dir)
pnpm dev:web        # marketing site only
pnpm lint           # eslint (all workspaces)
pnpm check-types    # tsc (all workspaces)
pnpm build          # production builds (all workspaces)
```

Rust-side checks (run inside `apps/desktop/src-tauri/`): `cargo check`,
`cargo clippy`, `cargo test`.

### Architecture map

| Thing | Where |
| --- | --- |
| IPC commands (Rust) | `apps/desktop/src-tauri/src/commands.rs` |
| IPC wrappers (TS) | `apps/desktop/src/lib/api.ts` |
| SQLite + migrations | `src-tauri/src/db.rs`, `src-tauri/src/migrations/sql/` |
| Global state (React) | `apps/desktop/src/context/app-context.tsx` |
| Screens + routes | `apps/desktop/src/screens/`, `src/app.tsx` |
| Shared UI kit | `packages/ui` (shadcn-style, add via `shadcn` CLI) |
| Brand constants | `src/lib/brand.ts`, `src-tauri/src/brand.rs` (generated) |

Dev builds use a separate identifier (`<identifier>.dev`) and a `dev/`
subdirectory for app data, so they never touch the installed app's data.

## 5. Branding changes after init

Edit `brand.json` → run `pnpm sync-brand`. The pre-commit hook runs it
automatically; CI runs `pnpm sync-brand:check` and fails on drift. The
propagated values include: app name, slug (crate/binary/db/cask names),
identifier, version, updater endpoint, repo URLs, descriptions, copyright,
Homebrew tap — everywhere they appear.

## 6. Releasing

```sh
pnpm release:tag patch   # or minor | major | x.y.z
```

This bumps `brand.json`, syncs all consumers, commits `chore(release): vX.Y.Z`,
creates the tag, and pushes. The tag push triggers `.github/workflows/release.yml`:

- **macOS** (aarch64) → `.dmg` + updater artifacts
- **Linux** → `.deb`
- **Windows** → `.msi` + NSIS `.exe`
- then the Homebrew cask in `Casks/<slug>.rb` is updated with the new sha256
  and committed back to `main`

`workflow_dispatch` on the same workflow does build-only runs with artifacts
(no release).

The app checks for updates on startup and shows an install prompt in the
sidebar (tauri updater plugin + `latest.json` from the GitHub release).

## 7. Homebrew distribution (optional)

Release automation updates `Casks/<slug>.rb` in this repo. To serve it through
Homebrew you need a tap repository (e.g. `<owner>/homebrew-<slug>`) that
contains that cask file — point `homebrewTap` in `brand.json` at it and mirror
the cask there. If you don't want Homebrew at all, delete `Casks/`, the
`update-homebrew-cask` job in `release.yml`, and the `homebrewTap` entry.

## 8. Install scripts (optional)

`setup/unix.sh`, `setup/windows.ps1` (+ uninstalls) are curl|sh installers
wired to the repo via brand.json. The setup URLs in the README download
section come from `brand.json → scripts.*`. Remove the folder if unneeded.

## 9. Marketing site (optional)

`apps/web` is a Next.js site (features, docs, changelog, privacy/terms,
download). Content lives in `apps/web/src/content/*.ts` — placeholder data is
in place; replace it with your copy. Deploy anywhere (Vercel, Cloudflare…).
Don't need a site? Delete `apps/web` — nothing else depends on it.

## 10. Removing what you don't need

The template is modular:

- No marketing site → delete `apps/web`
- No Homebrew → see §7
- No install scripts → see §8
- No updater → remove the updater plugin from `Cargo.toml`, `lib.rs`,
  `capabilities/default.json`, and the update-related components
  (`update-notification`, `update-changelog-dialog`, `update-notice-dialog`,
  `downgrade-notice-dialog`, and their use in `app-context.tsx` /
  `startup-modals.tsx`)
- No tray → remove `tray.rs` and the tray block in `lib.rs`

After any of these, run `pnpm lint && pnpm check-types` to catch dangling
references.
