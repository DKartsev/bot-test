import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ADMIN_IP_ALLOWLIST: z.string().default(''),
  ADMIN_RATE_LIMIT_MAX: z.string().default('100'),
  PUBLIC_URL: z.string().default('http://localhost:3000'),
  KB_DIR: z.string().default('./data/kb'),
});

export const env = envSchema.parse(process.env);
