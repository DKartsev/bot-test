import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

export const TG_BOT_TOKEN = must("TG_BOT_TOKEN");
export const TG_WEBHOOK_PATH =
  process.env.TG_WEBHOOK_PATH || "/webhooks/telegram";
export const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET || "";
export const TELEGRAM_ENABLED = process.env.TELEGRAM_ENABLED === "1";
export const ADMIN_IP_ALLOWLIST = (process.env.ADMIN_IP_ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
export const ADMIN_API_TOKENS = (process.env.ADMIN_API_TOKENS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
export const ADMIN_RATE_LIMIT_MAX = Number(
  process.env.ADMIN_RATE_LIMIT_MAX || "30",
);
export const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || "";
export const JWT_ISSUER = process.env.JWT_ISSUER || "";
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "admin";
export const JWT_JWKS_URL = process.env.JWT_JWKS_URL || "";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ${name} missing`);
  return v;
}
