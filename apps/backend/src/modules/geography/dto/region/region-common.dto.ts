import { regionCodeParamSchema } from '@repo/validators';
import { createZodDto } from 'nestjs-zod';

export class RegionCodeParamDto extends createZodDto(regionCodeParamSchema) {}
