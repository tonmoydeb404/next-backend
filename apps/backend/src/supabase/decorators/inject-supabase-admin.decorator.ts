import { Inject } from '@nestjs/common';
import { SUPABASE_ADMIN } from '../constants/supabase.constants';

export const InjectSupabaseAdmin = () => Inject(SUPABASE_ADMIN);
