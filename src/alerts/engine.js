const os = require('os');
const { logger } = require('../utils/logger');

const lastSent = {};

function getAlertStatus() {
  return {
    lastSent: { ...lastSent },
    thresholds: {
      errorRate: Number(process.env.ALERT_THRESH_ERROR_RATE || 0.2),
      openaiRate: Number(process.env.ALERT_THRESH_OPENAI_RATE || 0.6),
      pending: Number(process.env.ALERT_THRESH_PENDING || 50)
    }
  };
}

async function sendAlert(key, text) {
  if (process.env.TELEGRAM_ALERTS_ENABLED !== '1') return;
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (!token || !chatId) return;
  const minInterval = Number(process.env.ALERT_MIN_INTERVAL_SEC || 600) * 1000;
  const now = Date.now();
  if (lastSent[key] && now - lastSent[key] < minInterval) return;
  lastSent[key] = now;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (err) {
    logger.error({ err }, 'failed to send telegram alert');
  }
}

function startAlertScheduler(store, metrics) {
  const evalInterval = Number(process.env.ALERT_EVAL_INTERVAL_SEC || 60) * 1000;
  const windowSec = Number(process.env.ALERT_WINDOW_SEC || 300);
  const host = os.hostname();
  const env = process.env.NODE_ENV || 'dev';
  setInterval(() => {
    try {
      const stats = metrics.getMovingWindowStats(windowSec);
      const pending = store
        .getAll()
        .filter((s) => s.status === 'pending').length;
      const errThresh = Number(process.env.ALERT_THRESH_ERROR_RATE || 0.2);
      const openaiThresh = Number(process.env.ALERT_THRESH_OPENAI_RATE || 0.6);
      const pendingThresh = Number(process.env.ALERT_THRESH_PENDING || 50);
      if (stats.total > 0 && stats.errorRate >= errThresh) {
        sendAlert(
          'error_rate',
          `[${host}/${env}] Error rate ${(stats.errorRate * 100).toFixed(1)}% >= ${(
            errThresh * 100
          ).toFixed(0)}%`
        );
      }
      if (stats.total > 0 && stats.openaiRate >= openaiThresh) {
        sendAlert(
          'openai_rate',
          `[${host}/${env}] OpenAI rate ${(stats.openaiRate * 100).toFixed(1)}% >= ${(
            openaiThresh * 100
          ).toFixed(0)}%`
        );
      }
      if (pending >= pendingThresh) {
        sendAlert(
          'pending_backlog',
          `[${host}/${env}] Pending ${pending} >= ${pendingThresh}`
        );
      }
    } catch (err) {
      logger.error({ err }, 'alert evaluation failed');
    }
  }, evalInterval).unref();
}

module.exports = { startAlertScheduler, sendAlert, getAlertStatus };
