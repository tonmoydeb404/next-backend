import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers';
import { DrizzleHealthIndicator } from './services';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DrizzleHealthIndicator],
})
export class HealthModule {}
