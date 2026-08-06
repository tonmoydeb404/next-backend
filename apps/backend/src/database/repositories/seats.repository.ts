import { Injectable } from '@nestjs/common';
import { schema, type Database } from '@repo/db';
import { InjectDatabase } from '../decorators/inject-database.decorator';
import { RepositoryBuilder } from './builder';

type NewSeat = typeof schema.seats.$inferInsert;
type SeatUpdate = Partial<NewSeat>;

@Injectable()
export class SeatsRepository extends RepositoryBuilder<typeof schema.seats> {
  constructor(@InjectDatabase() db: Database) {
    super(schema.seats, db);
  }

  findById(id: string) {
    return this.byProperty(this.query(), 'id', id).then((rows) => rows[0]);
  }

  findByTenantId(tenantId: string) {
    return this.byProperty(this.query(), 'tenantId', tenantId);
  }

  findByProfileId(profileId: string) {
    return this.byProperty(this.query(), 'profileId', profileId);
  }

  create(data: NewSeat) {
    return this.insert().values(data).returning();
  }

  updateById(id: string, data: SeatUpdate) {
    return this.byProperty(this.update().set(data), 'id', id).returning();
  }

  deleteById(id: string) {
    return this.byProperty(this.delete(), 'id', id);
  }
}
