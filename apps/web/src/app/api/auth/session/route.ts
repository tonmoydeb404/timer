import { NextResponse } from "next/server";

// First-party auth marker. The Appwrite session itself lives in the SDK's
// store (third-party cookie or localStorage fallback) and is invisible to
// Next.js — so after the client confirms a session, it sets this marker and
// proxy.ts gates /dashboard on it. Real authorization stays with Appwrite's
// document permissions; this cookie only decides routing.
export const MARKER_NAME = "timer_auth";
const MAX_AGE = 60 * 60 * 24 * 365; // 1y, matches Appwrite session longevity

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(MARKER_NAME, "1", cookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(MARKER_NAME);
  return res;
}
