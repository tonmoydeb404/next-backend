import type { Database } from "../client.ts";
import * as schema from "../schema/index.ts";
import { RepositoryBuilder } from "./builder/index.ts";

export class ProvincesRepository extends RepositoryBuilder<
  typeof schema.provinces
> {
  constructor(db: Database) {
    super(schema.provinces, db);
  }

  findByCode(code: string) {
    return this.byProperty(this.query(), "code", code).then((rows) => rows[0]);
  }

  findByRegionCode(regionCode: string) {
    return this.byProperty(this.query(), "regionCode", regionCode);
  }
}
