import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const environmentSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  
  // Telegram
  TG_BOT_TOKEN: z.string().min(1),
  TG_WEBHOOK_PATH: z.string().default('/webhooks/telegram'),
  TG_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_ENABLED: z.enum(['0', '1']).default('1'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // Security
  ADMIN_TOKENS: z.string().min(1),
  EDITOR_TOKENS: z.string().optional(),
  ADMIN_IP_ALLOWLIST: z.string().default('127.0.0.1,::1'),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  
  // Features
  RAG_ENABLED: z.enum(['0', '1']).default('1'),
  SEM_ENABLED: z.enum(['0', '1']).default('1'),
  DLP_ENABLED: z.enum(['0', '1']).default('1'),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Environment = z.infer<typeof environmentSchema>;

let env: Environment;

try {
  env = environmentSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Environment validation failed:');
    error.errors.forEach(err => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { env };

// Helper functions for common environment checks
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
export const isTest = () => env.NODE_ENV === 'test';