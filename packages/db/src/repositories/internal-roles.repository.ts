import type { Database } from "../client.ts";
import * as schema from "../schema/index.ts";
import { RepositoryBuilder } from "./builder/index.ts";

export class InternalRolesRepository extends RepositoryBuilder<
  typeof schema.internalRoles
> {
  constructor(db: Database) {
    super(schema.internalRoles, db);
  }

  findById(id: string) {
    return this.byProperty(this.query(), "id", id).then((rows) => rows[0]);
  }

  findByName(name: string) {
    return this.byProperty(this.query(), "name", name).then((rows) => rows[0]);
  }
}
