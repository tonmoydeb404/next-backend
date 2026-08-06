import { provinceDetailsResponseSchema } from '@repo/validators';
import { createZodDto } from 'nestjs-zod';

export class ProvinceDetailsResponseDto extends createZodDto(
  provinceDetailsResponseSchema,
) {}
