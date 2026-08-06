import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

type NewTenant = typeof schema.tenants.$inferInsert;
type TenantUpdate = Partial<NewTenant>;

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

  create(data: NewTenant) {
    return this.insert().values(data).returning();
  }

  updateById(id: string, data: TenantUpdate) {
    return this.byProperty(this.update().set(data), 'id', id).returning();
  }
}
