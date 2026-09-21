import { api } from "./api";
import { oauthFailureUrl, oauthSuccessUrl } from "./config";

// Drives the Rust-owned Google sign-in window: opens it, then polls until
// the Appwrite callback lands, the window closes, or we time out.

export type OAuthOutcome =
  | { kind: "success"; userId: string; secret: string }
  | { kind: "closed" | "error" | "timeout"; message: string };

const POLL_INTERVAL_MS = 700;
const TIMEOUT_MS = 5 * 60 * 1000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function signInWithGoogle(): Promise<OAuthOutcome> {
  await api.openOAuthWindow(oauthSuccessUrl, oauthFailureUrl);

  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    const poll = await api.pollOAuth(oauthSuccessUrl, oauthFailureUrl);
    if (poll.status === "success" && poll.user_id && poll.secret) {
      return { kind: "success", userId: poll.user_id, secret: poll.secret };
    }
    if (poll.status === "error") {
      return {
        kind: "error",
        message: poll.message ?? "Google sign-in failed.",
      };
    }
    if (poll.status === "closed") {
      return { kind: "closed", message: "Sign-in window was closed." };
    }
    if (Date.now() > deadline) {
      return { kind: "timeout", message: "Sign-in timed out. Try again." };
    }
    await sleep(POLL_INTERVAL_MS);
  }
}
