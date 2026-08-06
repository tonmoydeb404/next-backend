import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

@Injectable()
export class RegionsRepository extends RepositoryBuilder<
  typeof schema.regions
> {
  constructor(@InjectDatabase() db: Database) {
    super(schema.regions, db);
  }

  findByCode(code: string) {
    return this.byProperty(this.query(), 'code', code).then((rows) => rows[0]);
  }
}
