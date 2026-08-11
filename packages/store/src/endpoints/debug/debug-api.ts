import { Api } from "#base-api.ts";
import { DEBUG_ENDPOINTS } from "#endpoints/debug/constant.ts";
import type {
  Aal2CheckResponse,
  PermissionCheckResponse,
  TenantRoleCheckResponse,
} from "@repo/validators";

export const debugApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    aal2Check: builder.query<Aal2CheckResponse, void>({
      query: () => DEBUG_ENDPOINTS.AAL2,
    }),
    permissionCheck: builder.query<PermissionCheckResponse, void>({
      query: () => DEBUG_ENDPOINTS.PERMISSION,
    }),
    tenantRoleCheck: builder.query<
      TenantRoleCheckResponse,
      { tenantId: string }
    >({
      query: ({ tenantId }) => ({
        url: DEBUG_ENDPOINTS.TENANT_ROLE,
        headers: { "x-tenant-id": tenantId },
      }),
    }),
  }),
});

export const {
  useAal2CheckQuery,
  usePermissionCheckQuery,
  useTenantRoleCheckQuery,
} = debugApi;
