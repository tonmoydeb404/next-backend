import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { formatResponse } from '@repo/validators';
import { ZodResponse } from 'nestjs-zod';
import {
  RegionCodeParamDto,
  RegionDetailsResponseDto,
  RegionListResponseDto,
} from '../dto';
import { RegionsService } from '../services';

@ApiTags('Geography')
@Controller('geography/regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @ZodResponse({ type: RegionListResponseDto })
  async findAll() {
    const regions = await this.regionsService.findAll();
    return formatResponse({
      statusCode: HttpStatus.OK,
      message: 'Regions retrieved successfully',
      results: regions,
      meta: {},
    }) satisfies RegionListResponseDto;
  }

  @Get(':code')
  @ZodResponse({ type: RegionDetailsResponseDto })
  async findOne(@Param() params: RegionCodeParamDto) {
    const region = await this.regionsService.findByCode(params.code);
    return formatResponse({
      statusCode: HttpStatus.OK,
      message: 'Region retrieved successfully',
      results: region,
      meta: {},
    }) satisfies RegionDetailsResponseDto;
  }
}
