import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MARKER_NAME } from "./app/api/auth/session/route";

// Lightweight route gate for /dashboard/*. The Appwrite session itself is
// invisible to Next.js (third-party cookie or SDK localStorage fallback), so
// this checks our first-party marker, set by /api/auth/session after the
// client confirms a session. Real authorization is enforced server-side by
// Appwrite document permissions; this only decides routing.
export function proxy(request: NextRequest) {
  if (request.cookies.has(MARKER_NAME)) return NextResponse.next();

  // Fallback: a first-party Appwrite cookie (custom-domain setups).
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (projectId && request.cookies.has(`a_session_${projectId}`)) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
