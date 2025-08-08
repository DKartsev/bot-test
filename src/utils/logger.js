const fs = require('fs');
const path = require('path');
const pino = require('pino');

const logDir = path.join(__dirname, '..', '..', 'logs');
fs.mkdirSync(logDir, { recursive: true });
const logFile = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });

const streams = [
  { stream: process.stdout },
  { stream: logFile }
];

const logger = pino({}, pino.multistream(streams));

function child(meta = {}) {
  return logger.child(meta);
}

function withRequest(req) {
  return child({ requestId: req.id });
}

module.exports = { logger, child, withRequest };
