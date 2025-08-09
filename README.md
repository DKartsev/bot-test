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

## Self-hosted messenger (Matrix)

1. Run a Synapse homeserver and create a bot user. Obtain its access token and invite the bot to a room.
2. Set the Matrix variables in `.env`:
   - `MATRIX_HOMESERVER_URL`
   - `MATRIX_ACCESS_TOKEN`
   - `MATRIX_BOT_USER_ID`
   - `MATRIX_ROOM_ID`
   - `MATRIX_ALLOWED_MXIDS`
3. Operators from the allowlist can use commands in the room:
   `/pending`, `/approve <id>`, `/reject <id> [reason]`, `/find <query>`, `/add`, `/edit <id>`.

Matrix commands call the internal admin API via `OPERATOR_API_TOKEN` and all actions are audit logged.
Telegram remains enabled via Telegraf and Slack support has been removed.

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

## Operator Panel
Open `/admin/ui` in a browser with a valid Bearer token (admin or editor) and an allowed IP.
It provides a live feed of incoming questions, inline moderation (approve, reject or edit),
manual Q&A creation and export to XLSX/CSV. The panel uses Server-Sent Events at `/admin/stream`.

## License
MIT
