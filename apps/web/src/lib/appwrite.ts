import { Account, Client, OAuthProvider } from "appwrite";

// Lazy singletons: the SDK throws on empty endpoint/project, so only build
// the client when the env is actually configured.

function getClient(): Client | null {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !project) return null;
  return new Client().setEndpoint(endpoint).setProject(project);
}

let account: Account | null | undefined;

export function getAccount(): Account | null {
  if (account !== undefined) return account;
  const client = getClient();
  account = client ? new Account(client) : null;
  return account;
}

export function isAppwriteConfigured(): boolean {
  return getClient() !== null;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3010"
  );
}

/** Start the Google OAuth flow (token variant: callback carries userId+secret). */
export async function signInWithGoogle(): Promise<void> {
  const acc = getAccount();
  if (!acc) throw new Error("Appwrite is not configured.");
  await acc.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: `${siteUrl()}/auth/callback`,
    failure: `${siteUrl()}/login?error=oauth`,
  });
}
