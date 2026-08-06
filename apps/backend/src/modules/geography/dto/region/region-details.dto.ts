import { regionDetailsResponseSchema } from '@repo/validators';
import { createZodDto } from 'nestjs-zod';

export class RegionDetailsResponseDto extends createZodDto(
  regionDetailsResponseSchema,
) {}
