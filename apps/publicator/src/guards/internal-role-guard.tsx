"use client";

import { useAuthSlice, useMeQuery } from "@repo/store";
import type { Permission } from "@repo/validators";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type InternalRoleGuardProps = {
  /** Staff permission required (e.g. "bandi:edit") — omit to just require any internal role. */
  permission?: Permission;
  redirectTo: string;
  children: React.ReactNode;
};

// Client-side staff-only guard — complements (not replaces) the server-side DB check in
// (app)/layout.tsx, catching a mid-session role change on client-side navigations too.
function InternalRoleGuard({
  permission,
  redirectTo,
  children,
}: InternalRoleGuardProps) {
  const router = useRouter();
  const { isLoading } = useMeQuery();
  const { internalRole } = useAuthSlice();

  const allowed =
    !!internalRole &&
    (!permission || internalRole.permissions.includes(permission));

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

export { InternalRoleGuard };
export type { InternalRoleGuardProps };
