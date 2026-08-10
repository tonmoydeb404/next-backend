import type { Table } from "drizzle-orm";

export type InferSelectModel<T extends Table> = T["_"]["inferSelect"];

export type InferInsertModel<T extends Table> = T["_"]["inferInsert"];

export type ColumnKey<T extends Table> = keyof InferSelectModel<T>;

export type SortDirection = "asc" | "desc";

export type SortBy<T extends Table> = {
  field: ColumnKey<T>;
  order?: SortDirection;
};

export type EqFilter = { eq: unknown };
export type InFilter = { in: unknown[] };
export type IsNullFilter = { isNull: true };
export type FilterOperator = EqFilter | InFilter | IsNullFilter;

export type Filters<T extends Table> = Partial<{
  [K in ColumnKey<T>]: FilterOperator;
}>;

export type Pagination = {
  page: number;
  pageSize: number;
  limit: number | undefined;
  offset: number;
};

export type QueryOptions = {
  pagination?: {
    limit: number | undefined;
    offset: number;
  };
};
