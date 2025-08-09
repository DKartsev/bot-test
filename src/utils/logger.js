const fs = require('fs');
const path = require('path');
const pino = require('pino');
const rfs = require('rotating-file-stream');

const logDir = path.join(__dirname, '..', '..', 'logs');
fs.mkdirSync(logDir, { recursive: true });

function createRotatingStream() {
  const opts = {
    path: logDir,
    interval: process.env.OBS_ROTATE_INTERVAL || '1d',
    maxFiles: parseInt(process.env.OBS_ROTATE_MAX_FILES || '14', 10)
  };
  if (process.env.OBS_ROTATE_SIZE) {
    opts.size = process.env.OBS_ROTATE_SIZE;
  }
  const stream = rfs.createStream('app.log', opts);
  stream.on('error', (err) => {
    console.error('log file stream error', err);
  });
  return stream;
}

const streams = [
  {
    level: process.env.OBS_CONSOLE_LEVEL || 'info',
    stream: process.stdout
  },
  {
    level: process.env.OBS_FILE_LEVEL || 'info',
    stream: createRotatingStream()
  }
];

if (process.env.LOKI_ENABLED === '1') {
  try {
    const { createWriteStream } = require('pino-loki');
    const lokiStream = createWriteStream({
      batching: true,
      interval: 5,
      url: process.env.LOKI_URL,
      basicAuth: process.env.LOKI_BASIC_AUTH || undefined,
      labels: {
        app: 'my-support-bot',
        env: process.env.NODE_ENV || 'dev'
      }
    });
    lokiStream.on('error', (err) => {
      console.error('loki stream error', err);
    });
    streams.push({
      level: process.env.LOKI_MIN_LEVEL || 'info',
      stream: lokiStream
    });
  } catch (err) {
    console.error('failed to init loki logging', err);
  }
}

if (process.env.ELASTIC_ENABLED === '1') {
  try {
    const pinoElastic = require('pino-elasticsearch');
    const esStream = pinoElastic({
      node: process.env.ELASTIC_NODE,
      index: process.env.ELASTIC_INDEX,
      auth: process.env.ELASTIC_USERNAME
        ? {
            username: process.env.ELASTIC_USERNAME,
            password: process.env.ELASTIC_PASSWORD
          }
        : undefined
    });
    esStream.on('error', (err) => {
      console.error('elastic stream error', err);
    });
    streams.push({
      level: process.env.ELASTIC_MIN_LEVEL || 'info',
      stream: esStream
    });
  } catch (err) {
    console.error('failed to init elastic logging', err);
  }
}

const logger = pino({}, pino.multistream(streams));

function withRequest(req) {
  const meta = { requestId: req.id };
  if (req.tenant) {
    meta.tenantId = req.tenant.orgId;
    meta.projectId = req.tenant.projectId;
  }
  return logger.child(meta);
}

function withTenant(tenant, base = logger) {
  if (!tenant) return base;
  return base.child({ tenantId: tenant.orgId, projectId: tenant.projectId });
}

module.exports = { logger, withRequest, withTenant };
