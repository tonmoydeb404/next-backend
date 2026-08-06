import { Api } from "#base-api.ts";
import {
  GEOGRAPHY_CACHE_KEYS,
  GEOGRAPHY_PROVINCES_ENDPOINTS,
  GEOGRAPHY_REGIONS_ENDPOINTS,
} from "#endpoints/geography/constant.ts";
import type {
  ProvinceCodeParam,
  ProvinceDetailsResponse,
  ProvinceListQuery,
  ProvinceListResponse,
  RegionCodeParam,
  RegionDetailsResponse,
  RegionListResponse,
} from "@repo/validators";

export const geographyApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    regionsList: builder.query<RegionListResponse, void>({
      query: () => GEOGRAPHY_REGIONS_ENDPOINTS.LIST,
      providesTags: [GEOGRAPHY_CACHE_KEYS.REGION_LIST],
    }),
    regionDetails: builder.query<
      RegionDetailsResponse,
      RegionCodeParam["code"]
    >({
      query: (code) => GEOGRAPHY_REGIONS_ENDPOINTS.DETAILS(code),
      providesTags: [GEOGRAPHY_CACHE_KEYS.REGION_LIST],
    }),
    provincesList: builder.query<ProvinceListResponse, ProvinceListQuery>({
      query: (params) => ({
        url: GEOGRAPHY_PROVINCES_ENDPOINTS.LIST,
        params,
      }),
      providesTags: [GEOGRAPHY_CACHE_KEYS.PROVINCE_LIST],
    }),
    provinceDetails: builder.query<
      ProvinceDetailsResponse,
      ProvinceCodeParam["code"]
    >({
      query: (code) => GEOGRAPHY_PROVINCES_ENDPOINTS.DETAILS(code),
      providesTags: [GEOGRAPHY_CACHE_KEYS.PROVINCE_LIST],
    }),
  }),
});

export const {
  useRegionsListQuery,
  useRegionDetailsQuery,
  useProvincesListQuery,
  useProvinceDetailsQuery,
} = geographyApi;
