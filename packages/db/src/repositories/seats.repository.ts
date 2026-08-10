import type { Database } from "../client.ts";
import * as schema from "../schema/index.ts";
import { RepositoryBuilder } from "./builder/index.ts";

export class SeatsRepository extends RepositoryBuilder<typeof schema.seats> {
  constructor(db: Database) {
    super(schema.seats, db);
  }

  findByProfileId(profileId: string) {
    return this.byProperty(this.query(), "profileId", profileId);
  }
}
