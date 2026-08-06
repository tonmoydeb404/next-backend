import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

type NewInternalRole = typeof schema.internalRoles.$inferInsert;

@Injectable()
export class InternalRolesRepository extends RepositoryBuilder<
  typeof schema.internalRoles
> {
  constructor(@InjectDatabase() db: Database) {
    super(schema.internalRoles, db);
  }

  findAll() {
    return this.query();
  }

  findById(id: string) {
    return this.byProperty(this.query(), 'id', id).then((rows) => rows[0]);
  }

  create(data: NewInternalRole) {
    return this.insert().values(data).returning();
  }
}
