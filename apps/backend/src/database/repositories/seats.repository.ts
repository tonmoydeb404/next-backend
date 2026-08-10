import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

@Injectable()
export class SeatsRepository extends RepositoryBuilder<typeof schema.seats> {
  constructor(@InjectDatabase() db: Database) {
    super(schema.seats, db);
  }

  findByProfileId(profileId: string) {
    return this.byProperty(this.query(), 'profileId', profileId);
  }

  findByTenantId(tenantId: string) {
    return this.byProperty(this.query(), 'tenantId', tenantId);
  }
}
