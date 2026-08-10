import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

@Injectable()
export class TenantsRepository extends RepositoryBuilder<
  typeof schema.tenants
> {
  constructor(@InjectDatabase() db: Database) {
    super(schema.tenants, db);
  }

  findById(id: string) {
    return this.byProperty(this.query(), 'id', id).then((rows) => rows[0]);
  }

  findByVatCode(vatCode: string) {
    return this.byProperty(this.query(), 'vatCode', vatCode).then(
      (rows) => rows[0],
    );
  }
}
