import { OAUTH_CALLBACK_PATH } from "@packages/domain/appwrite";

// Build-time client config (Vite `.env` / shell env). The Appwrite project
// ID is also baked into the Rust binary; `getAuthConfig` is the source of
// truth at runtime — these values only build the OAuth redirect URLs.

function requiredEnv(name: string, fallback: string): string {
  const value = import.meta.env[name] as string | undefined;
  return value && value.trim().length > 0 ? value : fallback;
}

export const webUrl = requiredEnv(
  "VITE_WEB_URL",
  "http://localhost:3010",
).replace(/\/$/, "");

export const oauthSuccessUrl = `${webUrl}${OAUTH_CALLBACK_PATH}`;
export const oauthFailureUrl = `${webUrl}/login`;
