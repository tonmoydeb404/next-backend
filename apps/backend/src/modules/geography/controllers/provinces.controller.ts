import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { formatResponse } from '@repo/validators';
import { ZodResponse } from 'nestjs-zod';
import {
  ProvinceCodeParamDto,
  ProvinceDetailsResponseDto,
  ProvinceListQueryDto,
  ProvinceListResponseDto,
} from '../dto';
import { ProvincesService } from '../services';

@ApiTags('Geography')
@Controller('geography/provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  @ZodResponse({ type: ProvinceListResponseDto })
  async findAll(@Query() query: ProvinceListQueryDto) {
    const provinces = await this.provincesService.findAll(query.regionCode);

    return formatResponse({
      statusCode: HttpStatus.OK,
      message: 'Provinces retrieved successfully',
      results: provinces,
      meta: {},
    }) satisfies ProvinceListResponseDto;
  }

  @Get(':code')
  @ZodResponse({ type: ProvinceDetailsResponseDto })
  async findOne(@Param() params: ProvinceCodeParamDto) {
    const province = await this.provincesService.findByCode(params.code);
    return formatResponse({
      statusCode: HttpStatus.OK,
      message: 'Province retrieved successfully',
      results: province,
      meta: {},
    }) satisfies ProvinceDetailsResponseDto;
  }
}
