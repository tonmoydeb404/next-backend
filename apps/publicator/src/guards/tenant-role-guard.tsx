"use client";

import { useAuthSlice, useMeQuery } from "@repo/store";
import type { SeatRole } from "@repo/validators";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type TenantRoleGuardProps = {
  tenantId: string;
  allowedRoles: SeatRole[];
  redirectTo: string;
  children: React.ReactNode;
};

// Client-side tenant/seat-role guard — mirrors with-auth.ts's requireSeatRole, but reads
// the already-fetched client session instead of the request-scoped backend session.
function TenantRoleGuard({
  tenantId,
  allowedRoles,
  redirectTo,
  children,
}: TenantRoleGuardProps) {
  const router = useRouter();
  const { isLoading } = useMeQuery();
  const { seats } = useAuthSlice();

  const seat = seats.find((s) => s.tenantId === tenantId);
  const allowed = !!seat && allowedRoles.includes(seat.seatRole);

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace(redirectTo);
    }
  }, [isLoading, allowed, redirectTo, router]);

  if (isLoading || !allowed) {
    return null;
  }

  return children;
}

export { TenantRoleGuard };
export type { TenantRoleGuardProps };
