# My Support Bot

Node.js service that answers user questions via RAG + OpenAI and exposes admin APIs.

## Requirements
- Node.js 20+
- npm
- Docker (optional)

## Local Run
```bash
npm install
npm run start
```

## Docker
```bash
docker-compose up --build
```

## Environment Variables
See [`.env.example`](./.env.example) for all configuration options.
Create a `.env` file based on this before running locally or in Docker.

## Deploy
### Render
Connect the repository and Render will pick up [`render.yaml`](./render.yaml).
It provisions persistent disks for `/app/data`, `/app/logs` and `/app/feedback` and
uses `/healthz` for health checks.

### Heroku
```bash
heroku config:set $(cat .env | xargs)
heroku container:push web
heroku container:release web
```
`Procfile` defines the startup command.

## Scripts
- `npm test` – run unit tests
- `npm run coverage` – coverage report
- `npm run load:ask` – simple load test for `/ask`
- `npm run metrics:print` – dump Prometheus metrics

## Logs
Logs are written to `logs/app.log` with rotation controlled by `OBS_ROTATE_*` variables.
Set `LOKI_ENABLED=1` or `ELASTIC_ENABLED=1` to ship logs to Loki or Elasticsearch.

## Prometheus
If `PROM_ENABLED` is `1`, scrape metrics from `${PROM_METRICS_PATH}` (default `/metrics/prom`).
Includes default Node metrics and custom counters for requests, errors, OpenAI usage and pending items.

## Alerts (Telegram)
Enable by setting `TELEGRAM_ALERTS_ENABLED=1` plus `TG_BOT_TOKEN` and `TG_CHAT_ID`.
Alerts fire when error rate, OpenAI rate or pending backlog exceed thresholds and are rate limited.

## Dashboards
Grafana dashboards can chart request rate, error rate, share of OpenAI answers and pending backlog using the exported metrics.

## License
MIT
