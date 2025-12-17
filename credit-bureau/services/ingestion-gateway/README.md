## Ingestion Gateway

Node.js microservice that receives batch submissions (obligations, payments) from institutions, validates payloads, persists them to Postgres, and publishes summary events to Kafka for downstream processing.

### Requirements

- Node.js 22+

### Install

```bash
cd services/ingestion-gateway
npm install
```

### Configuration

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default `4001`). |
| `INGESTION_API_KEYS` | Comma-separated list of API keys accepted via `x-api-key` header. If empty, auth is disabled (not recommended outside local dev). |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE` | Postgres connection info. When `PGHOST`/`PGDATABASE` are set (and `NODE_ENV` is not `test`) submissions are written to `ingestion.submissions` / `ingestion.submission_items`. |
| `KAFKA_BROKERS` | Comma-separated broker list (e.g., `broker1:9092,broker2:9092`). Leave empty to disable publishing. |
| `KAFKA_CLIENT_ID` | Kafka client id (default `ingestion-gateway`). |
| `KAFKA_SUBMISSION_TOPIC` | Topic to emit submission summary events (default `credit-submissions`). |

### Run

```bash
PGHOST=localhost PGUSER=... PGPASSWORD=... PGDATABASE=credit_bureau \
INGESTION_API_KEYS=test-key \
KAFKA_BROKERS=broker1:9092 \
npm start
```

### Test

```bash
npm test
```

Tests run against an in-memory repository; no Postgres/Kafka required.

### Environment

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

Then run with:

```bash
source .env
npm start
```
