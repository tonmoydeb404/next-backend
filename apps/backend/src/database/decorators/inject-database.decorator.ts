import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../constants/database.constants';

export const InjectDatabase = () => Inject(DRIZZLE);
