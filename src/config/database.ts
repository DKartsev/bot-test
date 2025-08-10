import { z } from 'zod';

const dbConfigSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export const dbConfig = dbConfigSchema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export interface DatabaseConfig {
  url: string;
  key: string;
  serviceRoleKey?: string;
}

export function createDatabaseConfig(): DatabaseConfig {
  return {
    url: dbConfig.SUPABASE_URL,
    key: dbConfig.SUPABASE_KEY,
    serviceRoleKey: dbConfig.SUPABASE_SERVICE_ROLE_KEY,
  };
}