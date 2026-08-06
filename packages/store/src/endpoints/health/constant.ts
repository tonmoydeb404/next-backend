// ============================================================
// Health — Endpoints
// ============================================================
// Backend health check is version-neutral (VERSION_NEUTRAL), so it lives at
// `/api/health` while the Api baseUrl is `/backend/api/v1` — the leading
// `../` walks back out of the `v1` segment (browsers normalize dot-segments
// when resolving the final request URL).

export const HEALTH_ENDPOINTS = {
  CHECK: "../health",
} as const;

export const HEALTH_CACHE_KEYS = {
  CHECK: "Health",
} as const;
