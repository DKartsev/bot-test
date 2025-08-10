import * as z from 'zod';
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ENCRYPTION_KEY_BASE64: z.string().min(1),
  DATABASE_URL: z.string().min(1)
});
export type Env = z.infer<typeof EnvSchema>;
export const loadEnv = (): Env => EnvSchema.parse(process.env);
