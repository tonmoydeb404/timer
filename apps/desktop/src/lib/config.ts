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
