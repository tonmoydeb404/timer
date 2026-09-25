// Build-time client config (Vite `.env`). These values are compiled into
// the webview bundle only — Rust never sees them (it performs no network
// calls; all Appwrite I/O lives in the frontend).
import { brand } from "./brand";

function requiredEnv(name: string, fallback: string): string {
  const value = import.meta.env[name] as string | undefined;
  return value && value.trim().length > 0 ? value : fallback;
}

export const appwriteEndpoint = requiredEnv(
  "VITE_APPWRITE_ENDPOINT",
  "https://cloud.appwrite.io/v1",
);

export const appwriteProjectId = requiredEnv("VITE_APPWRITE_PROJECT_ID", "");

// Base URL of the web app. The desktop OAuth flow lands on the web bridge
// (`/auth/desktop`), which forwards to the configured desktop scheme — Appwrite only
// redirects to registered https origins. In dev this is the web dev server;
// production desktop builds must bake the deployed web URL.
export const webUrl = requiredEnv(
  "VITE_WEB_URL",
  "http://localhost:3010",
).replace(/\/$/, "");

export const desktopScheme = import.meta.env.DEV
  ? `${brand.slug}-dev`
  : brand.slug;

export const desktopBridgeUrl = `${webUrl}/auth/desktop?scheme=${encodeURIComponent(desktopScheme)}`;
