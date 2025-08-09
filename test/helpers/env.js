const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.AUTO_CACHE_OPENAI = '0';
process.env.SYNC_CRON = '';
process.env.SYNC_PROVIDER = '';
process.env.FEEDBACK_AGG_INTERVAL_MIN = '0';
process.env.DEFAULT_LANG = 'ru';
process.env.SUPPORTED_LANGS = 'ru,en,eo';
process.env.ADMIN_TOKENS = 'test-admin';
process.env.EDITOR_TOKENS = 'test-editor';
process.env.ADMIN_IP_ALLOWLIST = '127.0.0.1,::1';
process.env.VERSIONS_DEBOUNCE_MS = '50';

function resetTempDirs() {
  const dirs = ['logs', 'feedback', path.join('data', 'versions')];
  dirs.forEach((d) => {
    const full = path.join(__dirname, '..', '..', d);
    fs.rmSync(full, { recursive: true, force: true });
    fs.mkdirSync(full, { recursive: true });
  });
}

module.exports = { resetTempDirs };
