import { Account, Client, Databases, OAuthProvider } from "appwrite";
import { appwriteEndpoint, appwriteProjectId } from "./config";

// Appwrite access for the desktop webview, mirroring the web app: the SDK
// owns the user session (cookies/localStorage inside the webview). Rust
// performs no network calls — it only persists local timer state.

// Custom scheme the OS routes back to this app after browser OAuth.
export const OAUTH_SCHEME = "timer";
export const OAUTH_CALLBACK_URL = `${OAUTH_SCHEME}://auth`;

let client: Client | null | undefined;
let account: Account | null | undefined;
let databases: Databases | null | undefined;

export function isAppwriteConfigured(): boolean {
  return appwriteProjectId.length > 0;
}

function getClient(): Client | null {
  if (client !== undefined) return client;
  client =
    appwriteEndpoint && appwriteProjectId
      ? new Client().setEndpoint(appwriteEndpoint).setProject(appwriteProjectId)
      : null;
  return client;
}

export function getAccount(): Account | null {
  if (account !== undefined) return account;
  const c = getClient();
  account = c ? new Account(c) : null;
  return account;
}

export function getDatabases(): Databases | null {
  if (databases !== undefined) return databases;
  const c = getClient();
  databases = c ? new Databases(c) : null;
  return databases;
}

/**
 * Google OAuth login URL. Same shape the SDK's `createOAuth2Token` builds
 * (`{endpoint}/account/tokens/oauth2/{provider}?success&failure&project`),
 * but returned as a string so the caller can open it in the system browser
 * instead of navigating the webview.
 */
export function googleLoginUrl(): string {
  const url = new URL(`${appwriteEndpoint}/account/tokens/oauth2/google`);
  url.searchParams.set("success", OAUTH_CALLBACK_URL);
  url.searchParams.set("failure", OAUTH_CALLBACK_URL);
  url.searchParams.set("project", appwriteProjectId);
  return url.toString();
}

export { OAuthProvider };
