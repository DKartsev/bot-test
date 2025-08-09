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

## License
MIT
