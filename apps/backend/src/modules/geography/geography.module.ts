import { Module } from '@nestjs/common';
import { ProvincesController, RegionsController } from './controllers';
import { ProvincesService, RegionsService } from './services';

@Module({
  controllers: [RegionsController, ProvincesController],
  providers: [RegionsService, ProvincesService],
})
export class GeographyModule {}
