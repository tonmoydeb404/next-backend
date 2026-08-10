import type { Database } from "../client.ts";
import * as schema from "../schema/index.ts";
import { RepositoryBuilder } from "./builder/index.ts";

export class ProfilesRepository extends RepositoryBuilder<
  typeof schema.profiles
> {
  constructor(db: Database) {
    super(schema.profiles, db);
  }

  findById(id: string) {
    return this.byProperty(this.query(), "id", id).then((rows) => rows[0]);
  }
}
