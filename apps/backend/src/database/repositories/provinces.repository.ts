import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

@Injectable()
export class ProvincesRepository extends RepositoryBuilder<
  typeof schema.provinces
> {
  constructor(@InjectDatabase() db: Database) {
    super(schema.provinces, db);
  }

  findByCode(code: string) {
    return this.byProperty(this.query(), 'code', code).then((rows) => rows[0]);
  }

  findByRegionCode(regionCode: string) {
    return this.byProperty(this.query(), 'regionCode', regionCode);
  }
}
