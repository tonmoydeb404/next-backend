// Idempotent script: creates or updates the `super_admin` internal role with every permission
// in the `rolePermissions` catalog. Run manually via `pnpm --filter publicator sync:roles`
// whenever the catalog changes — not run automatically on startup (deliberate, avoids
// permission drift/unnecessary DB writes during normal dev).
import { config as loadEnv } from "dotenv";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
loadEnv({ path: join(ROOT, ".env.local"), quiet: true });
loadEnv({ path: join(ROOT, ".env"), quiet: true });

const SUPER_ADMIN_ROLE_NAME = "super_admin";

function getAllPermissions(
  rolePermissions: Record<string, readonly string[]>,
): string[] {
  const permissions: string[] = [];
  for (const [resource, actions] of Object.entries(rolePermissions)) {
    for (const action of actions) {
      permissions.push(`${resource}:${action}`);
    }
  }
  return permissions.sort();
}

function printPermissionsTable(permissions: string[]): void {
  const grouped: Record<string, string[]> = {};
  for (const permission of permissions) {
    const [resource, action] = permission.split(":");
    (grouped[resource] ??= []).push(action);
  }

  console.log("\n📊 Permissions Breakdown:");
  console.table(
    Object.entries(grouped).map(([resource, actions]) => ({
      Resource: resource,
      Actions: actions.join(", "),
      Count: actions.length,
    })),
  );
  console.log(`📋 Total Permissions: ${permissions.length}\n`);
}

async function upsertSuperAdminRole(permissions: string[]): Promise<void> {
  const { internalRolesRepository } =
    await import("../src/lib/api/repositories");

  const existing = await internalRolesRepository.findByName(
    SUPER_ADMIN_ROLE_NAME,
  );

  if (existing) {
    await internalRolesRepository.byProperty(
      internalRolesRepository.update().set({ permissions }),
      "name",
      SUPER_ADMIN_ROLE_NAME,
    );
    console.log(
      "✅ Successfully updated super_admin role with all permissions",
    );
  } else {
    await internalRolesRepository
      .insert()
      .values({ name: SUPER_ADMIN_ROLE_NAME, permissions });
    console.log(
      "✅ Successfully created super_admin role with all permissions",
    );
  }
}

async function main() {
  const { rolePermissions } = await import("@repo/validators");

  const allPermissions = getAllPermissions(rolePermissions);

  console.log("🔄 Syncing super_admin role...");
  printPermissionsTable(allPermissions);

  await upsertSuperAdminRole(allPermissions);
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error syncing super_admin role:", error);
  process.exit(1);
});
