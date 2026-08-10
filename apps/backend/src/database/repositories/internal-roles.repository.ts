import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

@Injectable()
export class InternalRolesRepository extends RepositoryBuilder<
  typeof schema.internalRoles
> {
  constructor(@InjectDatabase() db: Database) {
    super(schema.internalRoles, db);
  }

  findById(id: string) {
    return this.byProperty(this.query(), 'id', id).then((rows) => rows[0]);
  }

  findByName(name: string) {
    return this.byProperty(this.query(), 'name', name).then((rows) => rows[0]);
  }
}
