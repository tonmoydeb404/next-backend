import { InjectDatabase } from '@/database/decorators/inject-database.decorator';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { sql, type Database } from '@repo/db';

@Injectable()
export class DrizzleHealthIndicator {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.db.execute(sql`select 1`);
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }
}
