import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  type AnyColumn,
  type Database,
  type SQL,
  type Table,
} from "@repo/db";
import type {
  ColumnKey,
  Filters,
  InferSelectModel,
  Pagination,
  QueryOptions,
  SortBy,
} from "./types";

export abstract class RepositoryBuilder<TTable extends Table> {
  protected constructor(
    readonly table: TTable,
    protected readonly db: Database,
  ) {}

  withTx(tx: Database): this {
    const prototype = Object.getPrototypeOf(this) as object;
    const clone = Object.create(prototype) as this;
    Object.assign(clone, this);
    (clone as unknown as { db: Database }).db = tx;
    return clone;
  }

  parseSelect<K extends ColumnKey<TTable>>(fields: K[]) {
    const selection = {} as Record<K, AnyColumn>;
    for (const key of fields) {
      if (!(key in this.table)) {
        throw new Error(`Column ${String(key)} does not exist in table`);
      }
      selection[key] = this.table[key as keyof TTable] as unknown as AnyColumn;
    }
    return selection;
  }

  parseSortBy(sortBy: SortBy<TTable>[]) {
    return sortBy.map((s) => {
      const column = this.table[
        s.field as keyof TTable
      ] as unknown as AnyColumn;
      return s.order === "desc" ? desc(column) : asc(column);
    });
  }

  parseWhere(filters?: Filters<TTable>): SQL | undefined {
    if (!filters) return undefined;

    const conditions: SQL[] = [];
    for (const [key, operator] of Object.entries(filters)) {
      const column = this.table[key as keyof TTable] as unknown as AnyColumn;
      if (!column || !operator) continue;

      if ("eq" in operator) conditions.push(eq(column, operator.eq));
      else if ("in" in operator) conditions.push(inArray(column, operator.in));
      else if ("isNull" in operator && operator.isNull)
        conditions.push(isNull(column));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  parsePagination(page: number, pageSize: number): Pagination {
    const limit = pageSize === 0 ? undefined : pageSize;
    const offset = pageSize === 0 ? 0 : (page - 1) * pageSize;
    return { page, pageSize, limit, offset };
  }

  protected getSoftDeleteColumn(): keyof TTable | undefined {
    const tableKeys = Object.keys(this.table) as Array<keyof TTable>;
    return (
      tableKeys.find((k) => k === "deletedAt") ??
      tableKeys.find((k) => k === "deleted_at")
    );
  }

  query(options?: QueryOptions) {
    // @ts-expect-error table's generic shape isn't narrow enough for drizzle's `.from()` overload
    const q = this.db.select().from(this.table).$dynamic();
    if (options?.pagination) {
      const { limit, offset } = options.pagination;
      if (limit !== undefined) q.limit(limit);
      q.offset(offset);
    }
    return q;
  }

  count() {
    // @ts-expect-error table's generic shape isn't narrow enough for drizzle's `.from()` overload
    return this.db.select({ count: count() }).from(this.table).$dynamic();
  }

  insert() {
    return this.db.insert(this.table);
  }

  update() {
    return this.db.update(this.table);
  }

  delete(soft = false) {
    if (!soft) return this.db.delete(this.table).$dynamic();

    const col = this.getSoftDeleteColumn();
    if (!col) {
      throw new Error(
        "Soft delete requested but no deletedAt/deleted_at column found",
      );
    }

    return this.update()
      .set({ [col]: new Date().toISOString() } as Record<keyof TTable, unknown>)
      .$dynamic();
  }

  byProperty<T>(qb: T, key: keyof InferSelectModel<TTable>, value: unknown): T {
    const column = this.table[key as keyof TTable] as unknown as AnyColumn;
    const whereable = qb as unknown as { where: (condition: SQL) => T };
    return whereable.where(eq(column, value));
  }
}
