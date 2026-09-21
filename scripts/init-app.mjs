#!/usr/bin/env node
// @ts-check
/**
 * One-time app scaffolder — run this right after creating a repo from the
 * template ("Use this template" on GitHub → clone → `pnpm init-app`).
 *
 * It asks who the app is, rewrites `brand.json` (the single source of truth),
 * then runs `pnpm sync-brand` to propagate the new identity into every
 * consumer file (configs, Rust, TS, cask, setup scripts, READMEs…).
 *
 * Usage (interactive):
 *   pnpm init-app
 *
 * Usage (flags):
 *   pnpm init-app --yes --app-name "Wave" --owner janedoe --repo wave
 *
 * Flags (all optional — anything missing is prompted for or derived):
 *   --app-name <name>        Human-readable app name
 *   --slug <slug>            Machine name: crate/binary/db/cask token
 *   --identifier <id>        Reverse-DNS bundle identifier
 *   --dev-name <name>        Developer/publisher name
 *   --website <url>          Developer website
 *   --owner <owner>          GitHub username or org
 *   --repo <repo>            GitHub repository name
 *   --tap <tap>              Homebrew tap ("owner/name")
 *   --yes                    Skip the confirmation prompt
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const BRAND_FILE = path.join(ROOT, "brand.json");

const kebab = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const snake = (s) => s.replace(/-/g, "_");

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const brand = JSON.parse(readFileSync(BRAND_FILE, "utf8"));

  if (brand.slug !== "myapp" && !args["force"]) {
    console.log(
      `brand.json is already initialized for "${brand.appName}" (${brand.slug}). ` +
        `Re-run with --force to overwrite.`,
    );
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = async (label, fallback) => {
    if (fallback) return fallback;
    const answer = await rl.question(`${label} [${fallback ?? ""}]: `);
    return answer.trim() || "";
  };

  console.log("\nLet's set up your app. A few questions:\n");

  const appName =
    (await ask("App name (human-readable, e.g. \"Wave\")", args["app-name"])) ||
    brand.appName;

  const slugDefault = args.slug || kebab(appName);
  const slug = kebab(
    (await ask(`Slug (crate/binary/db name) [${slugDefault}]`, slugDefault)) ||
      slugDefault,
  );

  const owner =
    (await ask("GitHub owner (user or org)", args.owner)) || "your-username";
  const repoDefault = args.repo || slug;
  const repo =
    (await ask(`GitHub repo name [${repoDefault}]`, repoDefault)) || repoDefault;

  const identifierDefault =
    args.identifier || `com.${kebab(owner).replace(/-/g, "")}.${snake(slug)}`;
  const identifier =
    (await ask(`Bundle identifier [${identifierDefault}]`, identifierDefault)) ||
    identifierDefault;

  const devNameDefault = args["dev-name"] || brand.developer.name;
  const devName =
    (await ask(`Developer name [${devNameDefault}]`, devNameDefault)) || devNameDefault;

  const websiteDefault = args.website || `https://github.com/${owner}/${repo}`;
  const website =
    (await ask(`Website [${websiteDefault}]`, websiteDefault)) || websiteDefault;

  const tapDefault = args.tap || `${owner}/${repo}`;
  const homebrewTap =
    (await ask(`Homebrew tap [${tapDefault}]`, tapDefault)) || tapDefault;

  rl.close();

  const repository = `https://github.com/${owner}/${repo}`;
  const summary = {
    appName,
    slug,
    identifier,
    developer: { name: devName, website },
    repository,
    homebrewTap,
  };

  console.log("\nSummary:");
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }

  if (!args.yes) {
    const rl2 = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl2.question("\nLooks good? Rewrite brand.json and sync (y/N): ");
    rl2.close();
    if (!answer.trim().toLowerCase().startsWith("y")) {
      console.log("Aborted — nothing was changed.");
      return;
    }
  }

  // ---- Rewrite brand.json ----

  const base = `https://github.com/${owner}/${repo}`;
  brand.appName = appName;
  brand.slug = slug;
  brand.identifier = identifier;
  brand.version = "0.1.0";
  brand.developer = { name: devName, website };
  brand.repository = base;
  brand.downloadUrl = `${base}/releases/latest`;
  brand.licenseUrl = `${base}/blob/main/LICENSE`;
  brand.updaterEndpoint = `${base}/releases/latest/download/latest.json`;
  brand.scripts = {
    setupSh: `https://raw.githubusercontent.com/${owner}/${repo}/main/setup/unix.sh`,
    setupPs1: `https://raw.githubusercontent.com/${owner}/${repo}/main/setup/windows.ps1`,
    uninstallSh: `https://raw.githubusercontent.com/${owner}/${repo}/main/setup/unix-uninstall.sh`,
    uninstallPs1: `https://raw.githubusercontent.com/${owner}/${repo}/main/setup/windows-uninstall.ps1`,
  };
  // Carry over placeholder descriptions, swapping in the real app name.
  brand.description = {
    short: brand.description.short.replaceAll("My App", appName),
    long: brand.description.long.replaceAll("My App", appName),
  };
  brand.copyright = `Copyright (c) ${new Date().getFullYear()} ${devName}`;
  brand.homebrewTap = homebrewTap;

  writeFileSync(BRAND_FILE, `${JSON.stringify(brand, null, 2)}\n`, "utf8");

  // ---- Rename slug-keyed files ----

  const oldCask = path.join(ROOT, "Casks", "myapp.rb");
  if (slug !== "myapp" && existsSync(oldCask)) {
    const newCask = path.join(ROOT, "Casks", `${slug}.rb`);
    if (existsSync(newCask)) rmSync(newCask);
    renameSync(oldCask, newCask);
  }

  // ---- Sync + verify ----

  execSync("node scripts/sync-brand.mjs", { cwd: ROOT, stdio: "inherit" });
  execSync("node scripts/sync-brand.mjs --check", { cwd: ROOT, stdio: "inherit" });

  console.log(`
Done — ${appName} is ready. Next steps:

  1. Replace the app icons (all sizes) with yours:
       pnpm install
       pnpm --filter @apps/desktop tauri icon path/to/your-icon.png
     (also swap apps/desktop/public/logo.svg used in the sidebar)

  2. Regenerate the updater signing key — the committed pubkey belongs to the
     template author and MUST be replaced before your first release:
       pnpm --filter @apps/desktop tauri signer generate -w ~/.tauri/my-app.key
     Paste the printed public key into tauri.conf.json → plugins.updater.pubkey,
     then add repository secrets TAURI_SIGNING_PRIVATE_KEY and
     TAURI_SIGNING_PRIVATE_KEY_PASSWORD on GitHub.

  3. Start hacking:
       pnpm install
       pnpm dev:desktop

  4. When ready to ship: pnpm release:tag patch

See docs/TEMPLATE_GUIDE.md for the full walkthrough.
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
