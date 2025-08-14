import { z } from "zod";

const CommaSeparatedStrings = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  z.array(z.string()),
);

export const EnvSchema = z.object({
  // Node
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
  PUBLIC_URL: z.string().url().optional(),
  ENABLE_DOCS: z
    .preprocess((v) => String(v).toLowerCase() === "true", z.boolean())
    .default(false),

  // Security
  ADMIN_API_TOKENS: CommaSeparatedStrings,
  ADMIN_IP_ALLOWLIST: CommaSeparatedStrings.optional(),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  ENCRYPTION_KEY_BASE64: z.string().min(1).optional(), // Optional for now, will be required later

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TG_WEBHOOK_PATH: z.string().startsWith("/").default("/webhooks/telegram"),
  TG_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_SET_WEBHOOK_ON_START: z
    .preprocess(
      (v) => String(v).toLowerCase() === "true" || v === "1",
      z.boolean(),
    )
    .default(false),
  CASES_TELEGRAM_CHAT_ID: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // OpenAI / RAG
  OPENAI_API_KEY: z.string().min(1),
  FAQ_PATH: z.string().default("data/qa/faq.json"),
  KB_DIR: z.string().default("data/kb"),
  MIN_CONFIDENCE_TO_ESCALATE: z.coerce.number().min(0).max(1).default(0.55),

  // JWT (Optional, for more advanced auth)
  JWT_SECRET: z.string().min(32).optional(), // Optional for now
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  JWT_JWKS_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | null = null;

export function loadEnv(options: { force?: boolean } = {}): Env {
  if (_env && !options.force) {
    return _env;
  }
  try {
    const parsed = EnvSchema.parse(process.env);
    _env = parsed;
    return parsed;
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("Failed to parse environment variables:", err.format());
      process.exit(1);
    }
    throw err;
  }
}

// Automatically load and export env
export const env = loadEnv();
