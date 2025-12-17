## Identity Resolution Service

Implements the core APIs defined in `shared/proto/identity-service.openapi.yaml`. Supports Postgres-backed borrower storage plus a Kafka consumer that keeps identifiers in sync with the ingestion pipeline (identifier updates or entity upserts).

### Requirements

- Node.js 22+

### Install

```bash
cd services/identity-resolution
npm install
```

### Configuration

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default `4002`). |
| `IDENTITY_API_KEYS` | Comma-separated API keys expected via `x-api-key`. Leave blank to disable auth (dev only). |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE` | Postgres connection. When provided (and not running tests) the service persists entities/identifiers/clusters to `core.*` / `identity.*` tables. |
| `KAFKA_BROKERS` | Comma-separated broker list used for the ingestion consumer. Leave empty to disable Kafka integration. |
| `KAFKA_CLIENT_ID` | Kafka client id (default `identity-resolution`). |
| `KAFKA_GROUP_ID` | Consumer group id (default `identity-resolution-group`). |
| `KAFKA_INGESTION_TOPIC` | Topic the service subscribes to for identifier/entity updates (default `identity-events`). |
| `KAFKA_FROM_BEGINNING` | Set to `true` to replay the topic from the start (default `false`). |

### Run

```bash
PGHOST=localhost PGUSER=credit PGPASSWORD=secret PGDATABASE=credit_bureau \
KAFKA_BROKERS=localhost:9092 \
IDENTITY_API_KEYS=local-key npm start
```

### Test

```bash
npm test
```

Tests run entirely in-memory; no external services required (`NODE_ENV=test` disables Postgres/Kafka usage). HTTP endpoint coverage uses a mock request/response harness so it runs in sandboxed environments.

### Environment

```bash
cp .env.example .env
source .env
npm start
```
