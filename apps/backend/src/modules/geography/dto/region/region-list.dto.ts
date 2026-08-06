import { regionListResponseSchema } from '@repo/validators';
import { createZodDto } from 'nestjs-zod';

export class RegionListResponseDto extends createZodDto(
  regionListResponseSchema,
) {}
