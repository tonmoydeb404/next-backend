import { type NextRequest, NextResponse } from "next/server";

import { paths } from "@/config/paths.config";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed middleware.ts's `middleware` export to `proxy` (same semantics).
export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);

  const isAuthRoute = request.nextUrl.pathname.startsWith(paths.auth.root);

  if (!claims && !isAuthRoute) {
    return NextResponse.redirect(new URL(paths.auth.signIn, request.url));
  }

  if (claims && isAuthRoute) {
    return NextResponse.redirect(new URL(paths.root, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
