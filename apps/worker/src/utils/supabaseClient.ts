import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
});

const { SUPABASE_URL, SUPABASE_KEY } = envSchema.parse(process.env);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;
