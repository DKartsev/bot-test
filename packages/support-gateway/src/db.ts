import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { z } from 'zod';
import logger from './utils/logger';

config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string(),
});

let supabase: SupabaseClient;

try {
  const env = envSchema.parse(process.env);
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  logger.info('Supabase client initialized');
} catch (err) {
  logger.error({ err }, 'Failed to initialize Supabase client');
  throw err;
}

export default supabase;
