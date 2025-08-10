import express from 'express';
import cors from 'cors';
import path from 'path';
import bot from '../bot/commands';
import { ipAllowlist } from './middlewares/ipAllowlist';

const TG_WEBHOOK_PATH = process.env.TG_WEBHOOK_PATH || '/webhook';
const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET;
const ADMIN_ALLOWED_ORIGINS = (process.env.ADMIN_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: { hasToken: !!process.env.TG_BOT_TOKEN, webhookPath: TG_WEBHOOK_PATH } });
});

app.get('/metrics', (_req, res) => {
  res.type('text/plain').send([
    `process_uptime_seconds ${process.uptime()}`,
    `pending_updates_gauge TODO`,
  ].join('\n'));
});

if (ADMIN_ALLOWED_ORIGINS.length) {
  app.use('/api/admin', cors({
    origin: (origin, cb) => {
      const ok = !origin || ADMIN_ALLOWED_ORIGINS.includes(origin);
      cb(ok ? null : new Error('CORS'), ok ? true : undefined);
    },
    credentials: true,
  }));
}

app.get('/api/admin/my-ip', (req, res) => {
  const forwarded = req.header('X-Forwarded-For') || '';
  const ip = forwarded.split(',')[0].trim() || req.ip;
  res.json({ ip, forwardedForHeader: forwarded });
});

app.use('/api/admin', ipAllowlist);

app.post(
  TG_WEBHOOK_PATH,
  (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[wh.in]', {
        path: req.path,
        hasSecret: !!TG_WEBHOOK_SECRET,
        headerTok: req.header('X-Telegram-Bot-Api-Secret-Token') ? 'present' : 'missing',
        bodyKeys: Object.keys(req.body || {}),
      });
    }
    next();
  },
  (req, res, next) => {
    if (TG_WEBHOOK_SECRET) {
      const tok = req.header('X-Telegram-Bot-Api-Secret-Token');
      if (tok !== TG_WEBHOOK_SECRET) {
        return res.sendStatus(403);
      }
    }
    next();
  },
  bot.webhookCallback(TG_WEBHOOK_PATH)
);

if (process.env.NODE_ENV !== 'production') {
  app.post('/__test/telegram-update', (req, res) => {
    bot
      .handleUpdate(req.body as any)
      .then(() => res.json({ ok: true }))
      .catch((e) => {
        console.error('[test.update.error]', e);
        res.status(500).json({ ok: false });
      });
  });
}

app.use('/admin', express.static(path.join(__dirname, '../admin-out')));
app.get('/', (_req, res) => res.redirect('/admin'));
app.get('/admin/*', (_req, res) =>
  res.sendFile(path.join(__dirname, '../admin-out/index.html'))
);

export default app;
