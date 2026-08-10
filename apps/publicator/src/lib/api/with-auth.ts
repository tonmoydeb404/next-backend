import { envConfig } from "@/config/env.config";
import { formatErrorResponse, type Permission } from "@repo/validators";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import {
  internalRolesRepository,
  profilesRepository,
  seatsRepository,
} from "./repositories";

// Tenant-scoped routes read the active tenant from this header — never from a route param —
// so `withAuth` can resolve/enforce the seat role in one place, before the handler runs.
export const TENANT_ID_HEADER = "x-tenant-id";

export type SeatRole = "owner" | "operator" | "viewer";

export type SeatMembership = {
  tenantId: string;
  seatRole: SeatRole;
};

export type AuthSession = {
  sub: string;
  aal: string;
  role: string;
  email?: string;
  // Resolved from the DB (never trusted from the JWT itself) — null when the profile has no
  // internal_role_id (i.e. a customer account, not staff).
  internalRole: { id: string; name: string; permissions: Permission[] } | null;
  seats: SeatMembership[];
  // The seat matching the `x-tenant-id` request header, if present and the caller holds one.
  activeSeat: SeatMembership | null;
};

const jwks = createRemoteJWKSet(new URL(envConfig.SUPABASE.JWKS_URL));

async function resolveAuthContext(
  userId: string,
): Promise<Pick<AuthSession, "internalRole" | "seats">> {
  const profile = await profilesRepository.findById(userId);

  const internalRole = profile?.internalRoleId
    ? await internalRolesRepository.findById(profile.internalRoleId)
    : undefined;

  const seats = await seatsRepository.findByProfileId(userId);

  return {
    internalRole: internalRole
      ? {
          id: internalRole.id,
          name: internalRole.name,
          // DB column is a plain text[]; cast at this trust boundary since role rows are only
          // ever written through the (Permission-typed, Zod-validated) roles API.
          permissions: internalRole.permissions as Permission[],
        }
      : null,
    seats: seats.map((seat) => ({
      tenantId: seat.tenantId,
      seatRole: seat.seatRole,
    })),
  };
}

async function verifyToken(req: NextRequest): Promise<AuthSession | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${envConfig.SUPABASE.URL}/auth/v1`,
    });
    const sub = payload.sub!;
    const { internalRole, seats } = await resolveAuthContext(sub);

    const tenantId = req.headers.get(TENANT_ID_HEADER);
    const activeSeat = tenantId
      ? (seats.find((seat) => seat.tenantId === tenantId) ?? null)
      : null;

    return {
      sub,
      aal: (payload.aal as string) ?? "aal1",
      role: (payload.role as string) ?? "authenticated",
      email: payload.email as string | undefined,
      internalRole,
      seats,
      activeSeat,
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

type AndOr = "and" | "or";

type WithAuthOptions = {
  requireAal2?: boolean;
  // Staff-only routes: checked against session.internalRole?.permissions.
  permissions?: Permission[];
  permissionsLogic?: AndOr; // default: "and"
  // Tenant-scoped routes: checked against the seat for the `x-tenant-id` header.
  tenantRoles?: SeatRole[];
  tenantRolesLogic?: AndOr; // default: "and"
};

function satisfiesLogic<T>(required: T[], held: T[], logic: AndOr): boolean {
  return logic === "or"
    ? required.some((item) => held.includes(item))
    : required.every((item) => held.includes(item));
}

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

    if (options?.permissions?.length) {
      const held = session.internalRole?.permissions ?? [];
      const ok = satisfiesLogic(
        options.permissions,
        held,
        options.permissionsLogic ?? "and",
      );
      if (!ok) {
        return NextResponse.json(
          formatErrorResponse({
            statusCode: 403,
            message: "Insufficient permissions",
            error: "Forbidden",
          }),
          { status: 403 },
        );
      }
    }

    if (options?.tenantRoles?.length) {
      const held = session.activeSeat ? [session.activeSeat.seatRole] : [];
      const ok = satisfiesLogic(
        options.tenantRoles,
        held,
        options.tenantRolesLogic ?? "and",
      );
      if (!ok) {
        return NextResponse.json(
          formatErrorResponse({
            statusCode: 403,
            message: "You do not have access to this tenant",
            error: "Forbidden",
          }),
          { status: 403 },
        );
      }
    }

    return handler(req, ctx, session);
  };
}
