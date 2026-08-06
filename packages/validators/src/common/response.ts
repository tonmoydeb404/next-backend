import { z } from "zod";

// ----------------------------------------------------------------------
// Schemas
// ----------------------------------------------------------------------

const PaginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number().optional(),
});

export const BaseResponseSchema = z.object({
  statusCode: z.number().int().default(200).optional(),
  success: z.boolean(),
  message: z.string().default("Request successful").optional(),
});

export const buildResponseSchema = <
  TData extends z.ZodTypeAny,
  TMeta extends z.ZodRawShape = Record<never, never>,
>(
  dataSchema: TData,
  meta?: z.ZodObject<TMeta>,
) => {
  const metaShape = meta?.shape ?? ({} as TMeta);

  return BaseResponseSchema.extend({
    results: dataSchema,
    meta: z.object(metaShape),
  });
};

export const buildPaginatedResponseSchema = <
  TData extends z.ZodTypeAny,
  TMeta extends z.ZodRawShape = Record<never, never>,
>(
  dataSchema: TData,
  meta?: z.ZodObject<TMeta>,
) => {
  const metaShape = meta?.shape ?? ({} as TMeta);

  return BaseResponseSchema.extend({
    results: dataSchema.array(),
    meta: z
      .object({
        pagination: PaginationMetaSchema,
      })
      .extend(metaShape),
  });
};

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export type ApiResponse<T, M> = z.infer<typeof BaseResponseSchema> & {
  results: T;
  meta: M;
};

export type ApiPaginatedResponse<T, M> = ApiResponse<
  T[],
  M & { pagination: PaginationMeta }
>;

type FormatResponseProps<T, M> = Omit<
  Partial<ApiResponse<T, M>>,
  "results" | "meta"
> &
  Pick<ApiResponse<T, M>, "results" | "meta">;

type FormatPaginatedResponseProps<T, M> = Omit<
  Partial<ApiPaginatedResponse<T, M>>,
  "results" | "meta"
> &
  Pick<ApiPaginatedResponse<T, M>, "results" | "meta">;

type FormatErrorResponseProps = {
  message: string | string[];
  statusCode?: number;
  error?: string;
  details?: unknown[];
};

// ----------------------------------------------------------------------
// Format Helpers
// ----------------------------------------------------------------------

export const formatResponse = <T, M extends Record<string, unknown>>(
  props: FormatResponseProps<T, M>,
): ApiResponse<T, M> => {
  return {
    statusCode: props.statusCode ?? 200,
    success: props.success ?? true,
    message: props.message ?? "Request successful",
    meta: props.meta,
    results: props.results,
  };
};

export const formatPaginatedResponse = <T, M extends Record<string, unknown>>(
  props: FormatPaginatedResponseProps<T, M>,
): ApiPaginatedResponse<T, M> =>
  formatResponse<T[], M & { pagination: PaginationMeta }>(props);

export const formatErrorResponse = (props: FormatErrorResponseProps) => {
  return {
    success: false,
    statusCode: props.statusCode ?? 500,
    message: props.message,
    error: props.error ?? "Internal Server Error",
    ...(props.details !== undefined && { details: props.details }),
  };
};

export const serializePagination = (
  pagination: Omit<PaginationMeta, "totalPages">,
) => {
  const { page, total, pageSize } = pagination;
  const totalPages = pageSize === 0 ? 1 : Math.ceil(total / pageSize);
  return { page, pageSize, total, totalPages };
};
