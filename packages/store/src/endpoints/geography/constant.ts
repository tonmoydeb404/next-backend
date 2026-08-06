// ============================================================
// Regions — Endpoints
// ============================================================

export const GEOGRAPHY_REGIONS_ENDPOINTS = {
  LIST: "geography/regions",
  DETAILS: (code: string) => `geography/regions/${code}`,
} as const;

// ============================================================
// Provinces — Endpoints
// ============================================================

export const GEOGRAPHY_PROVINCES_ENDPOINTS = {
  LIST: "geography/provinces",
  DETAILS: (code: string) => `geography/provinces/${code}`,
} as const;

// ============================================================
// Cache Keys
// ============================================================

export const GEOGRAPHY_CACHE_KEYS = {
  REGION_LIST: "Region",
  PROVINCE_LIST: "Province",
} as const;
