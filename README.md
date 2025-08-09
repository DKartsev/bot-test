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

### Multi-tenancy

Requests to `/ask` and `/feedback` must include a tenant API key in the `X-API-Key` header. Admin endpoints accept an optional `X-Tenant-Id` header to operate on a specific tenant (defaults to `TENANT_DEFAULT_ID`). Data for each tenant is stored under `data/tenants/<id>`.

## Retrieval-Augmented Generation (RAG)

When `RAG_ENABLED=1` the bot can search uploaded documents and cite them in answers.

### Uploading sources
- `POST /admin/rag/upload` (multipart form, field `file`) – PDF, HTML, Markdown or plain text.
- `POST /admin/rag/text` – JSON `{ title, text }` for raw snippets.

Both endpoints require admin or editor auth. Uploaded content is chunked and indexed in
`./data/rag`. Current sources can be listed with `GET /admin/rag/sources` and removed with
`DELETE /admin/rag/source/:id`.

### Query flow
During `/ask` the bot first tries exact/hybrid matches. If confidence is low it queries the
RAG index. When top similarity exceeds `RAG_MIN_SIM` the answer is synthesized from the
retrieved chunks and returns `source:"rag"` with `citations` in `[1]`, `[2]` format. Otherwise
the system falls back to the generic OpenAI model.

### Tuning
Chunk size, overlap, top-k and other parameters can be adjusted via `RAG_*` variables in
`.env.example`.

## Data Loss Prevention (DLP)

All questions, answers and ingested documents are scanned for PII, secrets and profanity
according to `data/security/policies.yaml`. Matches can be redacted or blocked based on
severity and environment toggles. Detections are logged to `logs/dlp.jsonl` (values hashed
with SHA-256 when `DLP_HASH_SENSITIVE_IN_LOGS=1`).

Configure via `DLP_*` variables in `.env.example`: enable/observe mode, redaction style,
allow lists and blocking behaviour. Policies can be hot-reloaded with the admin API.

### Admin security API

- `GET /admin/security/policy`
- `POST /admin/security/policy/reload`
- `GET /admin/security/detections?n=200`
- `POST /admin/security/test`

Metrics `dlpDetections*` and `dlpBlocked*` expose counters for Prometheus.

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
Set `LOG_LEVEL` to control verbosity (default `info`).
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
