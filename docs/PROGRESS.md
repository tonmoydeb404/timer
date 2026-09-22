# Timer — Work Progress

Last updated: 2026-09-22. Covers everything from the empty scaffold through
Phase 5 (dashboard analytics/history/editing).

## 1. Status snapshot

| Area | Status |
|---|---|
| Phase 0 — Appwrite backend | Done, provisioned + verified live |
| Phase 1 — Foundation + auth | Done (web proven; desktop in final testing) |
| Phase 2 — Projects & tasks | Done, cross-checked web ↔ desktop |
| Phase 3 — Core time tracking | Done, unit-tested (10/10) |
| Phase 4 — Tray experience | Done, needs OS-level check |
| UX rounds (sheets, DataState, 420px, Today redesign) | Done |
| OAuth hardening (deep link → web bridge) | Done, in final user testing |
| Phase 5 — Dashboard analytics/history/editing | Done, needs live-data check |

Working tree holds the Phase 5 implementation; every prior step is committed
on `main`.

## 2. As-built architecture

```
Webview (React + Appwrite Web SDK)      Rust process (always alive)
┌──────────────────────────────┐        ┌─────────────────────────┐
│ Auth (session, deep-link)    │        │ timer.rs state machine  │
│ Projects/tasks reads+writes  │ invoke │ state.json (active +    │
│ Time-entry uploads           │◄──────►│  pending queue)         │
│ UI (Today/Tasks/History/     │ events │ Tray menu + 30s tick    │
│  Settings, dashboard)        │        │ Settings KV (SQLite)    │
└──────────────┬───────────────┘        └─────────────────────────┘
               │ Appwrite SDK (no Appwrite code in Rust)
               ▼
        Appwrite Cloud (sgp) — sole source of truth
```

Rules that survived: desktop owns the live timer; elapsed always derives
from stored timestamps; duration is never stored (derived); Appwrite IDs are
server-generated; breaks attach to the active task; document/row security
enforces per-user isolation (no server API key ships in any client).

## 3. Phase log

### Phase 0 — Backend provisioning (committed in `ee9d346`, revised later)
- `scripts/provision-appwrite.mjs` (`pnpm provision:appwrite`, dotenv-loaded,
  idempotent): creates the `timer` database + 4 tables with columns, indexes,
  `permissions: [create("users")]`, `rowSecurity: true`.
- Backend (verified live): project `6ab126930005ec0ad986` on
  `sgp.cloud.appwrite.io` → tables `profiles` (5 cols, 1 idx), `projects`
  (5, 2), `tasks` (9, 2), `time_entries` (5, 2), all row-secured.
- Scope saga (worth knowing): this server (v2.2.0) split the API. Schema
  management moved to `/tablesdb/*` (tables/columns/rows, current scopes);
  the old `/databases/*/collections` endpoints demand deprecated scopes.
  The script uses **only the current TablesDB API**; the provisioning key
  needs just the 27 Database scopes. Runtime document calls use whatever
  the current SDK uses (`/collections/…/documents` in web SDK v27 — still
  current there; desktop Rust uses `/tablesdb/…/rows`).

### Phase 1 — Foundation + auth (`ee9d346`, then hardened)
- `@packages/domain`: Appwrite IDs, domain types, timezone-safe time utils
  (midnight-splitting verified incl. DST transitions).
- Web: `/login`, `/auth/callback`, `/dashboard/*` (overview/projects/tasks/
  time/settings placeholders→real pages in Phase 2), `src/proxy.ts` route
  gate (Next 16 convention) on a first-party `timer_auth` marker cookie
  (`/api/auth/session`), because the Appwrite session is invisible to
  Next.js (third-party cookie / SDK localStorage fallback — confirmed from
  SDK source). Marketing pages moved to the `(site)` route group untouched.
- Desktop auth (final shape after §5): Google OAuth in the **system
  browser** → Appwrite → web bridge `/auth/desktop` → `timer://auth`
  deep link → frontend `account.createSession`. Session + all Appwrite I/O
  live in the webview SDK. Rust holds no credentials.

### Phase 2 — Projects & tasks (`1afb29d`)
- Web: profile auto-create (device timezone) + `Personal` seed on first
  login; projects CRUD (rename/archive/soft-delete, delete blocked with
  active tasks); project detail; tasks CRUD with search + project/status
  filters, complete/reopen, priorities, due dates.
- Desktop: today's active tasks + search + quick-add (project picker).
- Proven with a live row-lifecycle smoke test (create→query→update→delete).

### UX rounds (`1a5a810`, `20c8728`)
- `@packages/ui`: `DataState` (skeleton/error/empty via props) and
  `ResponsiveSheet` (Sheet on desktop, Drawer on mobile/narrow).
- Web forms → sheets; all lists → `DataState`; dashboard navbar theme
  toggle.
- Desktop window fixed at **420×560**; sidebar replaced by a tab shell
  (header with sync status + bottom tabs); Today screen rebuilt from the
  approved tracker mockup (project strip, timer card, summaries, queue,
  sync footer). Deliberately omitted from the mockup: fake window
  controls, screenshot/activity pill (PRD non-goal), 10-min block bar
  (needs a running timer), manual entry (not MVP).

### Phase 3 — Core time tracking (`02bf001`)
- Rust `timer.rs`: start → working ↔ break → stop, one-action switch;
  `state.json` persistence (atomic write); 10 unit tests (restart
  recovery, break cycles, switch, midnight stays one absolute segment —
  splitting is analytics-side).
- Closed segments queue in `pending` (FIFO, local ids); frontend uploads
  via SDK on every view change and acks by id; `Sync pending (n)` footer.
- Async lock serializes rapid taps; `timer://changed` events drive UI.
- Desktop UI: toggle start/stop, Break↔Resume, switch picker (+quick-add
  into the running project), focus task shared Today↔Tasks, ticking
  timestamp-derived display.

### Phase 4 — Tray (`1d2c659`)
- Dynamic menu: `● task — elapsed`, Break/Resume, Stop, Switch Task,
  Open, Quit (+ idle variant); tooltip mirrors state; rebuild on every
  transition + 30s tick while running. Tray actions reuse the timer
  commands; Switch opens the window and asks Today for the picker.
- Needs an OS-level check (menu rendering/tick) — not verifiable headless.

### Phase 5 — Dashboard analytics/history/editing (uncommitted)
- `@packages/domain/src/analytics.ts` (exported from index + package
  exports): `entryDurationMs`, midnight-split `aggregateDayTotals`,
  `totalsForDay`/`sumDayTotals`, `lastNDayKeys`, `aggregateByProject`,
  `groupEntriesByStartDay`. Duration is always derived from timestamps.
- Web `lib/db.ts`: `toTimeEntry`, `listTimeEntries` (task/type/date
  filters, 500 cap), `create/update/deleteTimeEntry` (end-after-start
  validation, timestamps edited → duration derived), `updateProfile`
  (name/timezone with `Intl` validation); `listTasks`/`listProjects` gained
  `includeDeleted` so history can name deleted tasks/projects.
- Web overview (`/dashboard`): Today / last-7-days / all-time cards, 7-day
  work-vs-break bar chart, top-5 projects, 5 recent sessions — all grouped
  in the profile timezone with device-zone fallback.
- Web history (`/dashboard/time`): search + project/type/date-range
  filters, day-grouped entries with midnight-split day totals, edit dialog
  (task/type/start/end via `datetime-local`, browser-local → UTC ISO),
  delete confirm, manual "Log time" for corrections.
- Web settings (`/dashboard/settings`): display-name + reporting-timezone
  editing over `ensureUserSetup`/`getProfile`, `datalist` of
  `Intl.supportedValuesOf("timeZone")`, device-zone shortcut, email
  read-only.
- Desktop: `lib/db.ts` gained `getProfile`/`listTimeEntries`;
  `hooks/use-time-entries.ts` feeds the History tab (read-only day groups
  with totals, last 14 days) and the Today "This week" card (synced
  last-7-day work/break in the profile zone; offline keeps last value).
- Verified headless: `pnpm check-types`, `eslint --max-warnings 0`
  (web + desktop), fresh `next` + `vite` builds.

## 4. OAuth hardening trail (why auth looks the way it does)

1. Webview-embedded OAuth → replaced: users are already signed in to
   their real browser (RFC 8252 pattern).
2. Loopback server (`127.0.0.1:<port>/callback`) → replaced: works, but
   the official guide path (deep link) was requested.
3. Rust REST auth (`Cookie`, then `X-Appwrite-Session`) → both arrived as
   `role: guests`; root cause never isolated headlessly, so per the
   explicit directive Rust does **zero** networking now — session + I/O
   live in the proven webview SDK.
4. `register_all()` crashed macOS startup → OS-gated (Windows/Linux
   only; macOS uses the bundled Info.plist).
5. Appwrite 400 on `timer://` success URL (platform form takes real
   hostnames only) → **web bridge** `/auth/desktop` forwards to the
   scheme. No console changes needed.
6. Better errors: Rust-era auth errors carried method/path/status/server
   type (the `role: guests` message cracked the cookie case).
7. Dev fallback: the bridge shows a copyable `timer://auth` link and the
   desktop login accepts a pasted link (deep link or bridge URL — both
   carry userId+secret), so auth is testable without an installed bundle.

## 5. Verified vs needs-human-testing

Verified headless (in CI-repeatable form): `cargo check/clippy/test`,
`tsc`, `eslint --max-warnings 0`, fresh `vite` + `next` builds; SDK
source cross-checks (cookie name, OAuth/token paths, CORS reflection of
`tauri://localhost`); bundled `Info.plist` contains `timer://`.

Needs a human (in order):
1. Desktop sign-in end-to-end (bundled app receives `timer://`; dev
   binaries use the paste-the-link fallback on the login screen).
2. Phase 3 acceptance: start→break→resume→stop, restart mid-session,
   offline stop → pending → flush.
3. Phase 4 tray workflow with the window closed.
4. Phase 5 data review: track real sessions, then check overview totals,
   history grouping/editing, timezone change regrouping, and desktop
   History/weekly card against the web dashboard.

## 6. Remaining work

- Post-MVP backlog (per PRD): global shortcuts, idle detection (opt-in),
  notifications, multi-desktop, integrations, richer dashboard, cron
  hard-delete of soft-deleted projects, offline SQLite cache (client
  UUIDs return there).
- Release-time flags: production desktop builds must bake the deployed
  web URL into `VITE_WEB_URL` (dev default `localhost:3010`); updater
  signing key for bundles (`--no-sign` used for local test bundles).

## 7. Runbook

```bash
pnpm install
# root .env.local: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
pnpm provision:appwrite   # idempotent backend setup
pnpm dev:web              # http://localhost:3010
pnpm dev:desktop          # needs rebuilt Rust after backend changes
```

Commit history (`git log --oneline`): initial → Phase 0+1 → Phase 2 →
UX round → Today redesign → Phase 3 → Phase 4 → login/config fixes →
browser OAuth → error surfacing → X-Appwrite-Session → official
deep-link rewire → macOS register fix → web bridge.
