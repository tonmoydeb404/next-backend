import { db } from "@/lib/api/database";
import { schema } from "@repo/db";
import { RepositoryBuilder } from "./builder";

class ProvincesRepository extends RepositoryBuilder<typeof schema.provinces> {
  constructor() {
    super(schema.provinces, db);
  }

  findByCode(code: string) {
    return this.byProperty(this.query(), "code", code).then((rows) => rows[0]);
  }

  findByRegionCode(regionCode: string) {
    return this.byProperty(this.query(), "regionCode", regionCode);
  }
}

export const provincesRepository = new ProvincesRepository();
