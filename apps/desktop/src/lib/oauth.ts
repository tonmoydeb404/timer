import { api } from "./api";

// Drives the system-browser Google sign-in: Rust opens the browser and runs
// a loopback callback server, then we poll until Appwrite redirects back,
// the flow fails, or we time out.

export type OAuthOutcome =
  | { kind: "success"; userId: string; secret: string }
  | { kind: "error" | "timeout"; message: string };

const POLL_INTERVAL_MS = 700;
const TIMEOUT_MS = 5 * 60 * 1000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function signInWithGoogle(): Promise<OAuthOutcome> {
  await api.openOAuthWindow();

  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    const poll = await api.pollOAuth();
    if (poll.status === "success" && poll.user_id && poll.secret) {
      return { kind: "success", userId: poll.user_id, secret: poll.secret };
    }
    if (poll.status === "error") {
      return {
        kind: "error",
        message: poll.message ?? "Google sign-in failed.",
      };
    }
    if (Date.now() > deadline) {
      return { kind: "timeout", message: "Sign-in timed out. Try again." };
    }
    await sleep(POLL_INTERVAL_MS);
  }
}
