import { envConfig } from "@/config/env.config";
import { formatErrorResponse } from "@repo/validators";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

export type AuthSession = {
  sub: string;
  aal: string;
  role: string;
  email?: string;
};

const jwks = createRemoteJWKSet(new URL(envConfig.SUPABASE.JWKS_URL));

async function verifyToken(req: NextRequest): Promise<AuthSession | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${envConfig.SUPABASE.URL}/auth/v1`,
    });
    return {
      sub: payload.sub!,
      aal: (payload.aal as string) ?? "aal1",
      role: (payload.role as string) ?? "authenticated",
      email: payload.email as string | undefined,
    };
  } catch {
    return null;
  }
}

export type AuthenticatedHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
  session: AuthSession,
) => Promise<NextResponse>;

type WithAuthOptions = {
  requireAal2?: boolean;
};

export function withAuth(
  handler: AuthenticatedHandler,
  options?: WithAuthOptions,
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
  ) => {
    const session = await verifyToken(req);

    if (!session) {
      return NextResponse.json(
        formatErrorResponse({
          statusCode: 401,
          message: "Unauthorized",
          error: "Unauthorized",
        }),
        { status: 401 },
      );
    }

    if (options?.requireAal2 && session.aal !== "aal2") {
      return NextResponse.json(
        formatErrorResponse({
          statusCode: 403,
          message: "MFA required",
          error: "Forbidden",
        }),
        { status: 403 },
      );
    }

    return handler(req, ctx, session);
  };
}
