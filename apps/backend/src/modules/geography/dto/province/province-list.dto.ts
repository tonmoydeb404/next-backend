import {
  provinceListQuerySchema,
  provinceListResponseSchema,
} from '@repo/validators';
import { createZodDto } from 'nestjs-zod';

export class ProvinceListQueryDto extends createZodDto(
  provinceListQuerySchema,
) {}

export class ProvinceListResponseDto extends createZodDto(
  provinceListResponseSchema,
) {}
