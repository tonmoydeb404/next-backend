import { ProvincesRepository } from '@/database/repositories';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ProvincesService {
  constructor(private readonly provincesRepository: ProvincesRepository) {}

  findAll(regionCode?: string) {
    return regionCode
      ? this.provincesRepository.findByRegionCode(regionCode)
      : this.provincesRepository.query();
  }

  async findByCode(code: string) {
    const province = await this.provincesRepository.findByCode(code);
    if (!province) {
      throw new NotFoundException(`Province "${code}" not found`);
    }
    return province;
  }
}
