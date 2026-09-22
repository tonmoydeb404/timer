// Build-time client config (Vite `.env`). The Appwrite project ID is also
// pushed to the Rust backend at boot (see `setAuthConfig`), so these values
// only need to exist here.

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
// (`/auth/desktop`), which forwards to the timer:// scheme — Appwrite only
// redirects to registered https origins. In dev this is the web dev server;
// production desktop builds must bake the deployed web URL.
export const webUrl = requiredEnv(
  "VITE_WEB_URL",
  "http://localhost:3010",
).replace(/\/$/, "");

export const desktopBridgeUrl = `${webUrl}/auth/desktop`;
