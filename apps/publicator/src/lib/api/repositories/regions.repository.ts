import { db } from "@/lib/api/database";
import { schema } from "@repo/db";
import { RepositoryBuilder } from "./builder";

class RegionsRepository extends RepositoryBuilder<typeof schema.regions> {
  constructor() {
    super(schema.regions, db);
  }

  findByCode(code: string) {
    return this.byProperty(this.query(), "code", code).then((rows) => rows[0]);
  }
}

export const regionsRepository = new RegionsRepository();
