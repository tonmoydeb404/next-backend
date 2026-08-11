import { type NextRequest, NextResponse } from "next/server";

import { paths } from "@/config/paths.config";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed middleware.ts's `middleware` export to `proxy` (same semantics).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, claims } = await updateSession(request);

  // Sign-in is guest-only — bounce already-authenticated visitors to the app.
  if (pathname === paths.auth.signIn) {
    if (claims) {
      return NextResponse.redirect(new URL(paths.root, request.url));
    }
    return response;
  }

  // Forbidden requires a session (to offer log-out) but isn't staff-gated here —
  // the (app) layout is what sent the user here in the first place.
  if (pathname === paths.auth.forbidden) {
    if (!claims) {
      return NextResponse.redirect(new URL(paths.auth.signIn, request.url));
    }
    return response;
  }

  if (!claims) {
    return NextResponse.redirect(new URL(paths.auth.signIn, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|backend|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
