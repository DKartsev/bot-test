if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
}

export const TG_BOT_TOKEN = must('TG_BOT_TOKEN');
export const TG_WEBHOOK_PATH = process.env.TG_WEBHOOK_PATH || '/webhooks/telegram';
export const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET || '';
export const TELEGRAM_ENABLED = process.env.TELEGRAM_ENABLED === '1';
export const ADMIN_IP_ALLOWLIST = (process.env.ADMIN_IP_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
export const ADMIN_TOKENS = (process.env.ADMIN_TOKENS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`ENV ${name} missing`);
  return v;
}
