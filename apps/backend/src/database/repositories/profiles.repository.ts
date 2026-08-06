import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

type NewProfile = typeof schema.profiles.$inferInsert;
type ProfileUpdate = Partial<NewProfile>;

@Injectable()
export class ProfilesRepository extends RepositoryBuilder<
  typeof schema.profiles
> {
  constructor(@InjectDatabase() db: Database) {
    super(schema.profiles, db);
  }

  findById(id: string) {
    return this.byProperty(this.query(), 'id', id).then((rows) => rows[0]);
  }

  findByPersonalTenantId(tenantId: string) {
    return this.byProperty(this.query(), 'personalTenantId', tenantId).then(
      (rows) => rows[0],
    );
  }

  create(data: NewProfile) {
    return this.insert().values(data).returning();
  }

  updateById(id: string, data: ProfileUpdate) {
    return this.byProperty(this.update().set(data), 'id', id).returning();
  }
}
