import { paths } from "@/config/paths.config";
import { InternalRoleGuard } from "@/guards";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InternalRoleGuard redirectTo={paths.auth.forbidden}>
      {children}
    </InternalRoleGuard>
  );
}
