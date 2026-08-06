// ============================================================
// Regions — Endpoints
// ============================================================

export const GEOGRAPHY_REGIONS_ENDPOINTS = {
  LIST: "geography/regions",
  DETAILS: (code: string) => `geography/regions/${code}`,
} as const;

// ============================================================
// Cache Keys
// ============================================================

export const GEOGRAPHY_CACHE_KEYS = {
  REGION_LIST: "Region",
} as const;
