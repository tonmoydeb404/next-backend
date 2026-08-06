import { RegionsRepository } from '@/database/repositories';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class RegionsService {
  constructor(private readonly regionsRepository: RegionsRepository) {}

  findAll() {
    return this.regionsRepository.query();
  }

  async findByCode(code: string) {
    const region = await this.regionsRepository.findByCode(code);
    if (!region) {
      throw new NotFoundException(`Region "${code}" not found`);
    }
    return region;
  }
}
