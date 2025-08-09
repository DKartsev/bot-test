const client = require('prom-client');

const promRegistry = new client.Registry();
client.collectDefaultMetrics({ prefix: 'msb_', register: promRegistry });

const requestCounter = new client.Counter({
  name: 'msb_requests_total',
  help: 'Total requests',
  labelNames: ['source', 'lang'],
  registers: [promRegistry]
});

const errorCounter = new client.Counter({
  name: 'msb_errors_total',
  help: 'Total errors',
  labelNames: ['route'],
  registers: [promRegistry]
});

const openaiCounter = new client.Counter({
  name: 'msb_openai_answers_total',
  help: 'Total answers served from OpenAI',
  registers: [promRegistry]
});

const pendingGauge = new client.Gauge({
  name: 'msb_pending_items',
  help: 'Pending Q&A items',
  registers: [promRegistry]
});

const uptimeGauge = new client.Gauge({
  name: 'msb_process_uptime_seconds',
  help: 'Process uptime in seconds',
  registers: [promRegistry]
});

let updatePendingGauge = () => {};

function initObservabilityHooks(metricsModule, store) {
  metricsModule.setPromHooks({
    incRequests: ({ source, lang }) =>
      requestCounter.labels(source, lang || 'unknown').inc(),
    incErrors: ({ route }) => errorCounter.labels(route).inc(),
    incOpenAI: () => openaiCounter.inc(),
    setPending: (val) => pendingGauge.set(val)
  });

  updatePendingGauge = () => {
    try {
      const pending = store
        .getAll()
        .filter((s) => s.status === 'pending').length;
      pendingGauge.set(pending);
    } catch (err) {
      // ignore store errors
    }
  };

  updatePendingGauge();
  setInterval(() => {
    updatePendingGauge();
    uptimeGauge.set(process.uptime());
  }, 30000).unref();
  if (store.onUpdated) {
    store.onUpdated(updatePendingGauge);
  }
}

async function renderPromMetrics() {
  return promRegistry.metrics();
}

module.exports = {
  promRegistry,
  initObservabilityHooks,
  renderPromMetrics,
  updatePendingGauge
};
