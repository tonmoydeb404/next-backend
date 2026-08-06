import { provinceCodeParamSchema } from '@repo/validators';
import { createZodDto } from 'nestjs-zod';

export class ProvinceCodeParamDto extends createZodDto(
  provinceCodeParamSchema,
) {}
