import { z } from "zod";

// Оставь в схеме ТОЛЬКО реально необходимые ключи для запуска бэка.
// Минимум: DATABASE_URL, ENCRYPTION_KEY_BASE64. Остальные по мере надобности.
const EnvSchema = z
  .object({
    NODE_ENV: z.string().default("production"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    ENCRYPTION_KEY_BASE64: z
      .string()
      .min(1, "ENCRYPTION_KEY_BASE64 is required"),
  })
  .passthrough();

type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Валидирует process.env один раз и кэширует результат. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  cached = parsed.data;
  return cached;
}
