import type { Database } from "../client.ts";
import * as schema from "../schema/index.ts";
import { RepositoryBuilder } from "./builder/index.ts";

export class RegionsRepository extends RepositoryBuilder<
  typeof schema.regions
> {
  constructor(db: Database) {
    super(schema.regions, db);
  }

  findByCode(code: string) {
    return this.byProperty(this.query(), "code", code).then((rows) => rows[0]);
  }
}
